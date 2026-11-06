# Reproduce the illustrated result screens

These pages reuse the real React reading components with the included fictional seed-capsule document and authored interpretations. They do not contact an AI provider or the API. The receipt is deliberately invalid.

From the standalone repository root:

```sh
pnpm exec tsx docs/illustrations/create-example-document.ts
pnpm exec vite docs/illustrations --host 0.0.0.0
```

Open the address printed by Vite. Use `?view=evidence` to open the first term's **Inspect** control automatically; without that parameter the term list is collapsed.

The Vite root is the documentation directory for this command, not the standalone app. The normal production build uses `standalone/index.html` and does **not** include this documentation entry point or fixture.
