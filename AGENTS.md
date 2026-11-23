# electron-testable-ipc-proxy Repository Guidelines

Testable IPC proxy library for Electron and TypeScript, published to npm.

## Project Structure

- `src/` — library source (`index.ts` is the entry point); tests live beside sources as `*.test.ts`.
- `dist/` — published output (generated, gitignored): ESM `index.es.mjs`, UMD `index.umd.min.js`, and `.d.ts` files.
- `build/` — intermediate `tsc` output bundled by rollup (generated, gitignored).

## Commands

```bash
npm ci
npm run typecheck   # tsc (TypeScript 7, no emit; includes tests)
npm run lint        # oxlint (.oxlintrc.json)
npm run build       # tsc -p tsconfig.build.json (JS → build/, .d.ts → dist/), then rollup → dist/
npm test            # vitest (watch); npm run test:ci runs once
```

CI (`.github/workflows/test.yml`) runs typecheck, lint, build and tests. The `build` job is a required status check on `main`.

## Release

Publishing to npm runs only when a GitHub Release is created (`.github/workflows/npm.yml`, npm provenance via OIDC). Bump `version` in `package.json` before creating the release.

## Dependency Updates (Dependabot)

- Dependabot runs weekly with a 7-day cooldown.
- `.github/workflows/dependabot-auto-merge.yml` enables auto-merge (squash) on every Dependabot PR **except semver-major updates**; the PR merges once the required checks pass. All dependencies are devDependencies and nothing is published until a Release is created.
- semver-major updates are reviewed and merged manually.
