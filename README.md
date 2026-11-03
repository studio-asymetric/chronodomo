# Chronodōmō

Interactive 3D scroll experience: one building across five European architectural epochs (Pre-Romanesque → Baroque).

**Production:** https://chronodomo.com  
**Repo:** https://github.com/studio-asymetric/chronodomo  
**Studio ops docs:** `DalVault/Studio Asymetric/Infrastructure/Chronodōmō — Website.md`

Stack: Vite · Three.js · Lenis · nginx (Docker)

---

## Local

```powershell
cd "C:\Users\ASUS\Desktop\design\[ DONE ]\2026\Chronohouse\Chronohouse"
npm install
npm run dev
```

Open http://localhost:5173

```powershell
npm run build
npm run preview
```

---

## Deploy (Coolify + GitHub App)

Same pattern as [finance-asymetric](https://github.com/studio-asymetric/finance-asymetric): Dockerfile application on `studio-os`, auto-deploy from `main`.

### DNS

Registrar for `chronodomo.com` (Wedos or wherever the domain lives):

| Type | Host | Target |
|------|------|--------|
| A | `@` | `157.90.175.53` |
| A | `www` | `157.90.175.53` |

Optional: CNAME `www` → `chronodomo.com` instead of a second A record.

### Connect GitHub once (Coolify)

1. Coolify → **Sources** (or **Settings → Git**) → GitHub.
2. Install / use the Coolify **GitHub App** on the `studio-asymetric` org.
3. Grant access to `chronodomo` (or all private repos).

### New application

1. Coolify → **New Resource** → **Application** → GitHub source → `studio-asymetric/chronodomo` → branch `main`.
2. Build pack: **Dockerfile** (root `Dockerfile`).
3. Port: **80**.
4. Domains: `chronodomo.com` and `www.chronodomo.com` (HTTPS / Let’s Encrypt on).
5. No env vars required (static site).
6. Deploy. Confirm https://chronodomo.com loads the WebGL experience and GLBs from `/models/`.

### Autodeploy on push

Coolify application → **Webhooks** / **Git** → enable **Auto Deploy** on `main`. After that, `git push origin main` rebuilds and restarts the container.

---

## Docker (local smoke test)

```powershell
docker build -t chronodomo .
docker run --rm -p 8080:80 chronodomo
```

Open http://localhost:8080
