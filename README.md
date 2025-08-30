<p align="center">
  <img src="BPM%20Zone.jpeg" alt="BPM Zone Calculator" width="600"/>
</p>

- Live demo: https://gmnstr.github.io/DJ-BPM-Zone-Calculator/
- Download: https://github.com/gmnstr/DJ-BPM-Zone-Calculator/releases/tag/v1.0.0
- Repo: https://github.com/gmnstr/DJ-BPM-Zone-Calculator

Overview
- Minimal, single‑file calculator that helps DJs find optimal tempo‑matching zones based on groove analysis.
- This is a static equation, but will include audio analysis and fuzzy limits in a future release. Consider this a first proof of concept.
- Everything is contained in `index.html` and styled via the Tailwind CDN.

Features
- Single file: just open and use — no build, no dependencies.
- Adjustable anchor BPM (60–220 BPM).
- Configurable green and yellow deviation percentages.
- Clear outputs for Green (optimal), Yellow (caution), and Red (avoid) zones.
- Responsive UI with dark theme.

Usage
- Open `index.html` directly in your browser, or
- Serve the folder with any static server (for example, `npx serve .`).

Deployment
- GitHub Pages is configured to serve from `main` at `/docs`.
- The hosted page mirrors `index.html` at `docs/index.html`.
