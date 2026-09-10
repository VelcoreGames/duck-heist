# Duck Heist

Cloudflare-ready source snapshot of **DUCK HEIST: El Banco del Pan**.

This branch was materialized from the last working AppDeploy source export (`v69`, version `1788932440271`) so the game can be built as a normal React + Vite project without AppDeploy's build-time source ZIP/materializer pipeline.

## Build

```bash
npm install
npm run build
```

Cloudflare Pages settings:

- Framework: React (Vite)
- Build command: `npm run build`
- Output directory: `dist`
