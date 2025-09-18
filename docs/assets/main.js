import {
  ANCHOR_MIN,
  ANCHOR_MAX,
  GREEN_MIN,
  GREEN_MAX,
  YELLOW_MIN,
  YELLOW_MAX,
  DEFAULT_ANCHOR,
  DEFAULT_GREEN_DEV,
  DEFAULT_YELLOW_DEV,
  calculateMixingZones,
  formatBpm,
  formatThreshold,
  validateInputs,
} from './calculation.js';

const STEP_ONE = 1;

function populateSelect(selectEl, min, max, step, unit, defaultValue) {
  selectEl.innerHTML = '';
  for (let value = min; value <= max; value += step) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${value}${unit}`;
    option.className = 'bg-slate-800';
    selectEl.appendChild(option);
  }
  selectEl.value = String(defaultValue);
}

function renderError(errorMessageEl, resultsSectionEl, message) {
  errorMessageEl.textContent = message;
  resultsSectionEl.style.display = 'none';
}

function renderResults(results, elements, resultsSectionEl) {
  const { green, yellow, red, anchor } = results;

  elements.greenUpRange.textContent = formatBpm(green.up);
  elements.greenDownRange.textContent = formatBpm(green.down);
  elements.yellowUpRange.textContent = formatBpm(yellow.up);
  elements.yellowDownRange.textContent = formatBpm(yellow.down);
  elements.redUpThreshold.textContent = formatThreshold('<', red.upThreshold);
  elements.redDownThreshold.textContent = formatThreshold('>', red.downThreshold);

  elements.tableUpAnchor.textContent = formatBpm(anchor);
  elements.tableUpGreen.textContent = formatBpm(green.up);
  elements.tableUpYellow.textContent = formatBpm(yellow.up);
  elements.tableUpRed.textContent = formatThreshold('<', red.upThreshold);
  elements.tableDownAnchor.textContent = formatBpm(anchor);
  elements.tableDownGreen.textContent = formatBpm(green.down);
  elements.tableDownYellow.textContent = formatBpm(yellow.down);
  elements.tableDownRed.textContent = formatThreshold('>', red.downThreshold);

  resultsSectionEl.style.display = 'block';
}

function getElements() {
  return {
    anchorSelect: document.getElementById('anchorBpm'),
    greenSelect: document.getElementById('greenDev'),
    yellowSelect: document.getElementById('yellowDev'),
    errorMessage: document.getElementById('error-message'),
    resultsSection: document.getElementById('results'),
    greenUpRange: document.getElementById('green-up-range'),
    greenDownRange: document.getElementById('green-down-range'),
    yellowUpRange: document.getElementById('yellow-up-range'),
    yellowDownRange: document.getElementById('yellow-down-range'),
    redUpThreshold: document.getElementById('red-up-threshold'),
    redDownThreshold: document.getElementById('red-down-threshold'),
    tableUpAnchor: document.getElementById('table-up-anchor'),
    tableUpGreen: document.getElementById('table-up-green'),
    tableUpYellow: document.getElementById('table-up-yellow'),
    tableUpRed: document.getElementById('table-up-red'),
    tableDownAnchor: document.getElementById('table-down-anchor'),
    tableDownGreen: document.getElementById('table-down-green'),
    tableDownYellow: document.getElementById('table-down-yellow'),
    tableDownRed: document.getElementById('table-down-red'),
  };
}

function init() {
  const elements = getElements();

  populateSelect(
    elements.anchorSelect,
    ANCHOR_MIN,
    ANCHOR_MAX,
    STEP_ONE,
    ' BPM',
    DEFAULT_ANCHOR,
  );
  populateSelect(
    elements.greenSelect,
    GREEN_MIN,
    GREEN_MAX,
    STEP_ONE,
    '%',
    DEFAULT_GREEN_DEV,
  );
  populateSelect(
    elements.yellowSelect,
    YELLOW_MIN,
    YELLOW_MAX,
    STEP_ONE,
    '%',
    DEFAULT_YELLOW_DEV,
  );

  const handleChange = () => {
    const anchor = Number(elements.anchorSelect.value);
    const green = Number(elements.greenSelect.value);
    const yellow = Number(elements.yellowSelect.value);

    const validation = validateInputs(anchor, green, yellow);

    if (!validation.valid) {
      renderError(elements.errorMessage, elements.resultsSection, validation.message);
      return;
    }

    elements.errorMessage.textContent = '';

    const results = calculateMixingZones(anchor, green, yellow);
    renderResults(results, elements, elements.resultsSection);
  };

  [elements.anchorSelect, elements.greenSelect, elements.yellowSelect].forEach((select) => {
    select.addEventListener('change', handleChange);
  });

  handleChange();
}

document.addEventListener('DOMContentLoaded', init);

