# DJ BPM Zone Calculator

> ⚠️ No tests were run (read-only QA review). Use the automated scripts below to validate changes locally.

DJ BPM Zone Calculator is a lightweight web tool that helps DJs gauge which tracks will comfortably blend when pitching up or down from an anchor tempo. The experience is fully client-side and optimized for quick experimentation.

- Live demo: https://gmnstr.github.io/DJ-BPM-Zone-Calculator/
- Download: https://github.com/gmnstr/DJ-BPM-Zone-Calculator/releases/tag/v1.0.0
- Repository: https://github.com/gmnstr/DJ-BPM-Zone-Calculator

## Purpose
The calculator visualizes safe, caution, and avoid zones for tempo mixing so DJs can plan transitions without memorizing formulas. Pick an anchor BPM, define the green (comfortable) and yellow (stretch) deviations, and the UI renders the recommended upmix/downmix windows.

## Formula
For each deviation percentage `d` and anchor tempo `A`, the boundaries are calculated as:

```
Upmix boundary  = round(A − (A × d / 100))
Downmix boundary = round(A + (A × d / 100))
```

Green zones use the green deviation, yellow zones use the yellow deviation, and the red thresholds are aligned with the yellow boundaries.

## Project structure
```
├── index.html          # Primary entry point used during development
├── docs/               # GitHub Pages distribution (served from docs/)
│   └── assets/         # Built JS modules copied from src/
├── src/                # Source JavaScript modules
└── tests/              # Node test runner suites for calculation logic
```

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the static assets for GitHub Pages:
   ```bash
   npm run build
   ```
3. Open `index.html` in your browser or serve the folder with a static server:
   ```bash
   npx serve .
   ```

## Scripts
- `npm run lint` – Run ESLint with Prettier integration to ensure code style consistency.
- `npm test` – Execute Node's built-in test runner covering BPM range calculations and input validation.
- `npm run build` – Copy the latest source modules into `docs/assets/` for publishing.

## Deployment
The GitHub Pages site serves the contents of the `docs/` directory. Run `npm run build` before committing changes so the deployed copy matches the source.

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow details, testing requirements, and screenshot expectations.
