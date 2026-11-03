window.onbeforeunload = function() {
    window.scrollTo(0, 0);
}

/**************************************************
 * 1. IMPORTS
 **************************************************/
import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Lenis from 'lenis';


/**************************************************
 * 2. SET UP LOADING UI
 **************************************************/
const progressBar = document.getElementById('progressInner');
const progressText = document.getElementById('progressText');
const progressContainer = document.getElementById('progressContainer');

// Synonym-Variable wght axis is 200–700. The file often arrives in a few
// chunks, so the target jumps; the displayed weight eases so the in-between
// weights actually render instead of snapping to Bold.
const WGHT_MIN = 200;
const WGHT_MAX = 700;
let targetWght = WGHT_MIN;
let shownWght = WGHT_MIN;

function setProgress(percent) {
    const clamped = Math.max(0, Math.min(percent, 100));
    progressBar.style.width = clamped + '%';
    progressText.textContent = `${Math.round(clamped)}%`;
    targetWght = WGHT_MIN + (clamped / 100) * (WGHT_MAX - WGHT_MIN);
}

function animateHeadlineWeight() {
    const delta = targetWght - shownWght;
    if (Math.abs(delta) > 0.2) {
        shownWght += Math.sign(delta) * Math.min(Math.abs(delta), 3.2);
        document.documentElement.style.setProperty('--headline-width', shownWght.toFixed(1));
    }
    requestAnimationFrame(animateHeadlineWeight);
}
requestAnimationFrame(animateHeadlineWeight);


/**************************************************
 * 3. SET UP SCROLL (Lenis)
 **************************************************/
const lenis = new Lenis({ smooth: true, lerp: 0.04, infinite: false });

lenis.stop();
document.documentElement.classList.add('no-scroll');

function updateScroll(time) {
    lenis.raf(time);
    requestAnimationFrame(updateScroll);
}
requestAnimationFrame(updateScroll);

let scrollY = 0;

lenis.on('scroll', ({ scroll }) => {
    scrollY = scroll;
});


/**************************************************
 * 4. CANVAS REFERENCES
 **************************************************/
const canvasContainer = document.querySelector('#canvas-container');
const modeSwitcher = document.querySelector('.mode-switcher');

if (!canvasContainer) {
    console.error("Canvas container not found!");
}

const canvas = document.querySelector('#webgl-canvas');

if (!canvas) {
    console.error("Canvas '#webgl-canvas' not found!");
}


/**************************************************
 * 5. BASIC THREE.js SCENE, CAMERA, RENDERER
 **************************************************/
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(-11, 1, 11);
camera.lookAt(0, 2, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
// Move canvas to body so position:fixed is viewport-relative (not trapped by #canvas-container transform)
document.body.appendChild(renderer.domElement);


/**************************************************
 * 6. LIGHTS
 **************************************************/
const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 5);
light.position.set(-5, 10, 5);
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 6;
light.shadow.camera.far = 20;
light.shadow.camera.left = -8;
light.shadow.camera.right = 8;
light.shadow.camera.top = 8;
light.shadow.camera.bottom = -8;
light.shadow.bias = -0.001;
light.shadow.normalBias = 0.07;
scene.add(light);

const hemiLight = new THREE.HemisphereLight(0xaaaaaa, 0x0000ff, 1.7);
scene.add(hemiLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.7);
backLight.position.set(-10, 15, -10);
backLight.castShadow = false;
scene.add(backLight);


/**************************************************
 * 7. ORBIT CONTROLS
 **************************************************/
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false;
controls.enablePan = false;


/**************************************************
 * 8. DRACO + GLTFLoader SETUP
 **************************************************/
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);


/**************************************************
 * 9. MANUAL FETCH (0-89% NETWORK PROGRESS)
 **************************************************/
async function fetchGLB(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}, status: ${response.status}`);
    }

    const contentLength = parseInt(response.headers.get('Content-Length'), 10);
    if (!contentLength) {
        console.warn('No Content-Length header, progress updates may be inaccurate.');
    }

    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;

        if (contentLength) {
            const networkProgress = receivedLength / contentLength;
            setProgress(networkProgress * 89);
        }
    }

    const array = new Uint8Array(receivedLength);
    let position = 0;
    for (let chunk of chunks) {
        array.set(chunk, position);
        position += chunk.length;
    }

    return array.buffer;
}


/**************************************************
 * 10. DECODE GLB (90-100% FAKE PROGRESS)
 **************************************************/
let hasDecodedOnce = false;

function decodeGLB(arrayBuffer) {
    if (hasDecodedOnce) {
        return new Promise((resolve, reject) => {
            gltfLoader.parse(arrayBuffer, '', (gltf) => {
                setProgress(100);
                resolve(gltf);
            }, reject);
        });
    }

    setProgress(90);

    return new Promise((resolve, reject) => {
        gltfLoader.parse(arrayBuffer, '', (gltf) => {
            let decodeProgress = 90;
            const fakeDecodeTime = 1000;
            const startTime = performance.now();

            function tick() {
                const elapsed = performance.now() - startTime;
                let alpha = Math.min(elapsed / fakeDecodeTime, 1);

                decodeProgress = 90 + alpha * 10;
                setProgress(decodeProgress);

                if (alpha < 1) {
                    requestAnimationFrame(tick);
                } else {
                    setProgress(100);
                    hasDecodedOnce = true;
                    resolve(gltf);
                }
            }
            requestAnimationFrame(tick);
        }, reject);
    });
}


/**************************************************
 * HELPER: CREATE CLIPPING PLANES FROM A BOX
 **************************************************/
function makePlanesFromBox(box) {
    const { x: minx, y: miny, z: minz } = box.min;
    const { x: maxx, y: maxy, z: maxz } = box.max;

    return [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), -minx),
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), maxx),
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -miny),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), maxy),
        new THREE.Plane(new THREE.Vector3(0, 0, 1), -minz),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), maxz),
    ];
}


/**************************************************
 * 11. ANIMATION STATE
 **************************************************/
let houseModel, clippingObject, ground, mixer, clock;
let animations = [];

// Cached flat list of house meshes — populated after load, used in per-frame loops
let houseMeshes = [];

let animationSpeed = 1;
let animationFrames = 0;
const introFrames = 125;
const introDuration = 5.0;
const startPositionY = -12;
const endPositionY = -2.8;
let actualDuration = 0;

let introPlaying = true;

// Cached total scroll space — recomputed on resize, not every frame
let cachedTotalScrollSpace = 0;

function computeTotalScrollSpace() {
    if (!canvasContainer) return;
    cachedTotalScrollSpace = Math.max(0, canvasContainer.scrollHeight - window.innerHeight);
}


/**************************************************
 * 12. LOAD MODEL
 **************************************************/
async function loadModel() {
    try {
        // 1) Load & decode the house (big file with progress)
        const houseArray = await fetchGLB('/models/house.glb');
        const houseGltf = await decodeGLB(houseArray);
        houseModel = houseGltf.scene;
        houseModel.position.y = startPositionY;
        scene.add(houseModel);

        // Handle animations if available
        if (houseGltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(houseModel);
            houseGltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                animations.push(action);
            });

            actualDuration = houseGltf.animations[0].duration;
            const actualFrames = actualDuration * 30;
            animationFrames = actualFrames * animationSpeed;
            clock = new THREE.Clock();
        }

        setTimeout(() => {
            progressContainer.classList.add('loaded');
            canvasContainer.classList.add('loaded');
            modeSwitcher.classList.add('loaded');
            computeTotalScrollSpace();
        }, 500);

        // 2) Load & decode supporting files in parallel
        const [clipArray, groundArray] = await Promise.all([
            fetchGLB('/models/clipping.glb'),
            fetchGLB('/models/ground.glb')
        ]);

        const [clipGltf, groundGltf] = await Promise.all([
            decodeGLB(clipArray),
            decodeGLB(groundArray)
        ]);

        // Build clipping planes
        clippingObject = clipGltf.scene;
        clippingObject.visible = false;
        scene.add(clippingObject);

        const box = new THREE.Box3().setFromObject(clippingObject);
        const clippingPlanes = makePlanesFromBox(box);

        // Build ground
        ground = groundGltf.scene;
        ground.position.y = startPositionY;
        ground.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = true;
            }
        });
        scene.add(ground);

        // Single traverse: shadows + clipping planes + cache mesh list
        houseModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.clippingPlanes = clippingPlanes;
                child.material.clipShadows = true;
                houseMeshes.push(child);
            }
        });

        // Initial scroll space measurement
        computeTotalScrollSpace();

        // 3) Start the intro animation
        animateIntro();

    } catch (err) {
        console.error('Error loading model:', err);
        setProgress(100);
        progressText.textContent = 'Failed to load.';
    }
}

loadModel();


/**************************************************
 * 13. EASING
 **************************************************/
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}


/**************************************************
 * 14. INTRO ANIMATION
 **************************************************/
function animateIntro() {
    const startTime = performance.now();
    const startRotationY = Math.PI;
    const endRotationY = 0;

    function updateIntroAnimation(currentTime) {
        const elapsed = (currentTime - startTime) / 1000;
        const progress = Math.min(elapsed / introDuration, 1);
        const easedProgress = easeOutCubic(progress);

        const posY = startPositionY + (endPositionY - startPositionY) * easedProgress;
        const rotY = startRotationY + (endRotationY - startRotationY) * easedProgress;

        if (clippingObject) {
            clippingObject.position.y = posY;
            clippingObject.rotation.y = rotY;

            const newBox = new THREE.Box3().setFromObject(clippingObject);
            const newPlanes = makePlanesFromBox(newBox);
            houseMeshes.forEach(child => { child.material.clippingPlanes = newPlanes; });
        }

        if (houseModel) {
            houseModel.position.y = posY;
            houseModel.rotation.y = rotY;
        }

        if (ground) {
            ground.position.y = posY;
            ground.rotation.y = rotY;
        }

        if (mixer && animations.length > 0) {
            const currentIntroFrame = easedProgress * introFrames;
            const currentClipTime = (currentIntroFrame / animationFrames) * actualDuration;
            animations.forEach(action => { action.time = currentClipTime; });
            mixer.update(clock.getDelta());
        }

        if (progress >= 1) {
            introPlaying = false;
            lenis.start();
            document.documentElement.classList.remove('no-scroll');
            computeTotalScrollSpace();
        } else {
            requestAnimationFrame(updateIntroAnimation);
        }
    }

    requestAnimationFrame(updateIntroAnimation);
}


/**************************************************
 * 15. MAIN RENDER LOOP
 **************************************************/
let targetFrame = 0;

function animate() {
    requestAnimationFrame(animate);

    const delta = clock ? clock.getDelta() : 0;

    if (!introPlaying && mixer && animations.length > 0) {
        let progress = cachedTotalScrollSpace > 0 ? (scrollY / cachedTotalScrollSpace) : 0;
        progress = Math.max(0, Math.min(1, progress));

        const framesRange = animationFrames - introFrames;
        targetFrame = Math.min(introFrames + progress * framesRange, animationFrames);

        animations.forEach(action => {
            action.time = (targetFrame / animationFrames) * actualDuration;
        });

        mixer.update(delta);
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();


/**************************************************
 * 16. RESIZE HANDLER
 **************************************************/
const scrollModeBtn = document.getElementById("scroll-mode");
const viewModeBtn = document.getElementById("view-mode");
const switchBg = document.querySelector(".switch-background");

function updateRendererResolution() {
    const isLowRes = window.innerWidth < 800;

    renderer.setSize(window.innerWidth, window.innerHeight, true);

    if (isLowRes) {
        renderer.setPixelRatio(1);
        if (!controls.enabled) {
            controls.enabled = false;
        }
        if (!viewModeBtn.classList.contains("active")) {
            camera.position.set(-11 * 1.8, 1 * 1.8, 11 * 1.8);
        }
    } else {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (!viewModeBtn.classList.contains("active")) {
            controls.enabled = true;
            controls.enableZoom = false;
            camera.position.set(-11, 1, 11);
        }
    }

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Recompute cached scroll space after resize
    computeTotalScrollSpace();
}

window.addEventListener("resize", updateRendererResolution);
updateRendererResolution();


/**************************************************
 * 17. MODE SWITCHER
 **************************************************/
function setScrolling(enabled) {
    if (enabled) {
        document.documentElement.style.overflow = "";
        lenis.start();
        canvasContainer.classList.remove("disabled");
    } else {
        document.documentElement.style.overflow = "hidden";
        lenis.stop();
        canvasContainer.classList.add("disabled");
    }
}

function updateOrbitControls(viewMode) {
    if (viewMode) {
        controls.enabled = true;
        controls.enableZoom = true;
    } else {
        const isMobile = window.innerWidth < 800;
        controls.enabled = !isMobile;
        controls.enableZoom = false;
    }
}

scrollModeBtn.addEventListener("click", function () {
    switchBg.style.transform = "translateX(0)";
    scrollModeBtn.classList.add("active");
    viewModeBtn.classList.remove("active");
    setScrolling(true);
    updateOrbitControls(false);
});

viewModeBtn.addEventListener("click", function () {
    switchBg.style.transform = "translateX(100%)";
    viewModeBtn.classList.add("active");
    scrollModeBtn.classList.remove("active");
    setScrolling(false);
    updateOrbitControls(true);
});

updateOrbitControls(false);


/**************************************************
 * 18. SMOOTH ANCHOR SCROLLING (footer & in-page links)
 **************************************************/
document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (target) {
            e.preventDefault();
            lenis.scrollTo(target, { offset: -80 });
        }
    });
});


/**************************************************
 * 19. ARTICLE EXPAND (MOBILE)
 **************************************************/
document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".meta-plus").forEach(function(button) {
        button.addEventListener("click", function() {
            const selector = ".overlay, #webgl-canvas, .meta-plus, .content, #canvasForeground";
            if (this.classList.contains("active")) {
                document.querySelectorAll(selector).forEach(el => el.classList.remove("active"));
            } else {
                document.querySelectorAll(selector).forEach(el => el.classList.add("active"));
            }
        });
    });
});
