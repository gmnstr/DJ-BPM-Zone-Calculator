# DJ BPM Zone Calculator — Roadmap

> ⚠️ No tests were run (read-only QA review). This document describes the plan for the project and next steps.

## Project description (one-line)
A lightweight web app that maps an anchor BPM and deviation percentages to color-coded upmix/downmix windows; evolve it from deterministic calc → playlist integration → signal-aware and ML-refined recommendations.

## TL;DR — Phases & effort
1. **Harden core** (calc correctness, UX polish, tests) — *small → medium*
2. **Export & integration** (CSV/rekordbox-friendly, presets) — *small → medium*
3. **Live audio & analysis** (beat detection, analyzed vs live BPM) — *medium → large*
4. **Fuzzier thresholds & ML** (preference model, edge-case scoring) — *large*
5. **Production polish** (i18n, accessibility, CI, hosting) — *small → medium*

---

## Phase 0 — Project hygiene *(SMALL)*
**Goal:** Make the repo robust and safe to change.

**Tasks**
- Add `README.md` with: purpose, formula, how to run locally, and the “⚠️ No tests were run” note.
- Add `LICENSE`, `CONTRIBUTING.md`, and a PR template requesting screenshots.
- Add ESLint / Prettier config.
- Extract inline JS to `src/` and keep `index.html` thin.
- Add unit tests for the calculation function(s) (Jest or vitest).

**Acceptance criteria**
- Tests exist covering edge cases (anchors 60–220, yellow > green).
- Linter passes.

---

## Phase 1 — Harden UX & deterministic features *(MEDIUM)*
**Goal:** Make the app delightful and copyable for DJs.

**Tasks**
- Strict parameter validation and inline errors.
- Implement Axis view: numeric min/max cells, copy buttons, and CSV copy.
- Add “Quick anchors” (128/130/133/136/140).
- Add preset save/load (localStorage) and “Reset to defaults”.
- Mobile layout improvements and keyboard focus.
- Export CSV function for Rekordbox-friendly template.
- Unit tests for UI logic and snapshot tests.

**Acceptance criteria**
- No JS console errors. Copy/export works on macOS/Windows.

UX notes: Keep Axis numeric layout (monotonic left→right), percent display for inputs, and color-coded copy buttons.

---

## Phase 2 — Playlist workflow & Rekordbox friendliness *(MEDIUM)*
**Goal:** Save DJs time when making playlists.

**Tasks**
- “Generate Playlist Template (CSV)” from pasted list (title, artist, bpm) and flag `Fits` (Yes/Edge/No) using anchor & threshold.
- (Optional) Rekordbox XML export for automation with clear import instructions.
- UI to bulk-filter pasted CSV and preview before export.
- “Make Static Playlist” button to download filtered CSV and summary.

**Acceptance criteria**
- Generated CSV loads into Rekordbox (or previews correctly) and flags `Fits` per axis thresholds.

---

## Phase 3 — Audio analysis / signal-aware BPM *(LARGE)*
**Goal:** Distinguish analyzed BPM vs live pitch-shifted tempo and provide better guidance.

**Tasks**
- Optional client-side BPM analysis (Web Audio API + onset/tempogram). Consider libraries like `music-metadata-browser` and small BPM detectors.
- Show both **Analyzed BPM** (metadata) and **Detected BPM (snippet)**.
- Toggle: base window on analyzed BPM (default) or detected BPM (live mode).
- Visual confidence indicator for detection.

**Risk & mitigations**
- Detection is noisy on short/mixed clips — show confidence and encourage human checks. Consider server-side analysis if client-side is insufficient.

**Acceptance criteria**
- Detection works reasonably on typical DJ clips and UI shows confidence and chosen BPM source.

---

## Phase 4 — Fuzzier thresholds & preference model *(LARGE)*
**Goal:** Move from rigid ±% rules to a hybrid scoring model that accounts for audio features.

**Tasks**
- Implement heuristic scoring using DSP features: transient density, spectral centroid, percussive ratio, swing.
- Logistic scoring: blend `ratio_distance` and `feature_penalty` into a 0..1 score. Add “conservative ↔ adventurous” slider.
- Collect labeled examples (users upload small snippets and tag Good/Bad for a warp).
- Train a lightweight preference model (offline or tfjs) when data is sufficient.

**Acceptance criteria**
- Heuristic scoring produces intuitive rankings and improves with labeled data.

**Ethics & safety**: Display disclaimers — suggestions are guidance, not guarantees.

---

## Phase 5 — Productionization & polish *(SMALL → MEDIUM)*
**Tasks**
- Accessibility audit (WCAG), keyboard nav, color contrast.
- i18n support and translation scaffolding.
- CI: lint + unit tests + build on PRs; deploy previews (Netlify/Vercel).
- Opt-in, privacy-first analytics or feedback form.
- Issue template for “mismatch” reports and sample uploads.

**Acceptance criteria**
- CI green, production deployable, minimal a11y issues.

---

## Tests — what to assert *(start here)*
**Unit tests**
- `bpmRange(anchor, greenPct, yellowPct, softFloor, hardFloor)` correctness for many anchors (60, 220).
- `validateInputs()` rejects `yellow <= green`, out-of-range anchors, non-numeric input.
- CSV export matches filtered rows and labels.

**E2E**
- Playwright: set anchor 133, yellow 8%, export CSV, assert `Fits` column correctness.

---

## Ready-to-open issues (good first issues)
- Extract `calculateRanges(...)` module and add unit tests. *(small)*
- Add `exportToCSV(tracks, anchor, pct)` with tests. *(small)*
- Implement localStorage presets UI. *(small)*
- Add “Analyzed vs Live BPM” toggle and stub detector. *(medium)*

---

## PR checklist
- [ ] New logic has unit tests.
- [ ] Lint passes.
- [ ] Accessibility checks for new UI.
- [ ] Screenshots for visual changes.
- [ ] README updated if behavior changed.

---

## Metrics of success
- **Conversion:** % users using CSV export.
- **Adoption:** number of anchors checked or exports.
- **Accuracy:** user feedback rate on bad suggestions.
- **Quality:** test pass rate and CI health.

---

## Risks & mitigations
- **Blind reliance:** show clear disclaimers and label guidance.
- **BPM ambiguity:** show analyzed vs live BPM and let DJs choose.
- **Browser audio privacy:** keep analysis client-side and optional.
- **ML overfitting:** start with heuristics and collect labeled data carefully.
