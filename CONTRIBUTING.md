# Contributing

Thanks for considering a contribution to the DJ BPM Zone Calculator! This project aims to give DJs a quick, reliable way to reason about tempo-matching ranges. Keeping the math and UI predictable is critical, so please follow these guidelines when opening a pull request.

## Getting started
1. Fork the repository and clone your fork locally.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the build script to sync the static `docs/` assets with the source files:
   ```bash
   npm run build
   ```
4. Open `index.html` in your browser or serve the folder with a static server (`npx serve .`).

## Development workflow
- Keep the calculation logic inside `src/` modules. Update `index.html` only for markup or asset references.
- For visual changes, capture before/after screenshots or a short recording and attach it to your pull request.
- Update documentation when behavior changes.

## Quality checks
Run these commands locally before pushing:

```bash
npm run lint
npm test
npm run build
```

Pull requests should include tests for new logic and must pass linting. The build step ensures the deployable `docs/` copy stays in sync.

## Reporting issues
If you run into a problem, please file an issue that describes:
- What you expected to happen.
- What actually happened, including screenshots or console output.
- Steps to reproduce the problem.

Thanks for helping make the calculator better!
