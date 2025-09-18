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
import { buildAxisRows, buildAxisCsv } from './ui-logic.js';
import {
  parsePlaylistInput,
  scoreTracks,
  createDefaultFilters,
  filterPlaylistEntries,
  buildPlaylistCsv,
} from './playlist.js';

const STEP_ONE = 1;
const QUICK_ANCHORS = [128, 130, 133, 136, 140];
const PRESET_STORAGE_KEY = 'dj-bpm-zone-presets-v1';
const FEEDBACK_CLEAR_DELAY = 3500;

let quickAnchorButtons = [];
let currentAxisRows = [];
let currentMixingZones = null;
let feedbackTimeoutId = null;
let presets = [];
let playlistTracks = [];
let playlistEntries = [];
let playlistCounts = { total: 0, yes: 0, edge: 0, no: 0, invalid: 0 };
let playlistFilters = createDefaultFilters();
let playlistFeedbackTimeoutId = null;
let currentSelection = null;

const storageAvailable =
  typeof window !== 'undefined' &&
  (() => {
    try {
      const testKey = '__dj_bpm_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  })();

function populateSelect(selectEl, min, max, step, unit, defaultValue) {
  selectEl.innerHTML = '';
  for (let value = min; value <= max; value += step) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${value}${unit}`;
    option.className = 'bg-slate-800 text-slate-100';
    selectEl.appendChild(option);
  }
  selectEl.value = String(defaultValue);
}

function getElements() {
  return {
    anchorSelect: document.getElementById('anchorBpm'),
    greenSelect: document.getElementById('greenDev'),
    yellowSelect: document.getElementById('yellowDev'),
    fieldErrors: {
      anchor: document.getElementById('anchor-error'),
      green: document.getElementById('green-error'),
      yellow: document.getElementById('yellow-error'),
    },
    quickAnchorsContainer: document.getElementById('quick-anchors'),
    currentAnchorLabel: document.getElementById('current-anchor-label'),
    settingsSummary: document.getElementById('settings-summary'),
    errorMessage: document.getElementById('error-message'),
    resultsSection: document.getElementById('results'),
    greenUpRange: document.getElementById('green-up-range'),
    greenDownRange: document.getElementById('green-down-range'),
    yellowUpRange: document.getElementById('yellow-up-range'),
    yellowDownRange: document.getElementById('yellow-down-range'),
    redUpThreshold: document.getElementById('red-up-threshold'),
    redDownThreshold: document.getElementById('red-down-threshold'),
    copyFeedback: document.getElementById('feedback-message'),
    axisBody: document.getElementById('axis-body'),
    axisEmptyState: document.getElementById('axis-empty-state'),
    copyAxisButton: document.getElementById('copy-axis-button'),
    copyCsvButton: document.getElementById('copy-csv-button'),
    downloadCsvButton: document.getElementById('download-csv-button'),
    presetNameInput: document.getElementById('preset-name'),
    savePresetButton: document.getElementById('save-preset'),
    presetList: document.getElementById('preset-list'),
    presetEmptyState: document.getElementById('preset-empty'),
    presetsUnavailable: document.getElementById('presets-unavailable'),
    resetButton: document.getElementById('reset-defaults'),
    playlistInput: document.getElementById('playlist-input'),
    playlistPreviewButton: document.getElementById('preview-playlist'),
    playlistCopyButton: document.getElementById('copy-playlist-template'),
    playlistDownloadButton: document.getElementById('download-playlist'),
    playlistFeedback: document.getElementById('playlist-feedback'),
    playlistSummary: document.getElementById('playlist-summary'),
    playlistBody: document.getElementById('playlist-preview-body'),
    playlistEmptyState: document.getElementById('playlist-empty-state'),
    playlistExcluded: document.getElementById('playlist-excluded'),
    playlistExcludedList: document.getElementById('playlist-excluded-list'),
    playlistFilterContainer: document.getElementById('playlist-filter'),
  };
}

function setFieldError(element, message) {
  if (!element) {
    return;
  }
  element.textContent = message || '';
  element.style.visibility = message ? 'visible' : 'hidden';
  element.setAttribute('aria-hidden', message ? 'false' : 'true');
}

function renderInlineErrors(errors, elements) {
  const { fieldErrors, errorMessage } = elements;
  if (!fieldErrors) {
    return;
  }

  setFieldError(fieldErrors.anchor, errors?.anchor);
  setFieldError(fieldErrors.green, errors?.green);
  setFieldError(fieldErrors.yellow, errors?.yellow);

  if (errorMessage) {
    if (errors && Object.keys(errors).length > 0) {
      errorMessage.textContent = Object.values(errors)[0];
    } else {
      errorMessage.textContent = '';
    }
  }
}

function toggleResultsVisibility(elements, show) {
  if (!elements.resultsSection) {
    return;
  }
  if (show) {
    elements.resultsSection.classList.remove('hidden');
    elements.resultsSection.setAttribute('aria-hidden', 'false');
  } else {
    elements.resultsSection.classList.add('hidden');
    elements.resultsSection.setAttribute('aria-hidden', 'true');
  }
}

function renderResultsCards(results, elements, selection) {
  const { anchor, green, yellow, red } = results;

  if (elements.greenUpRange) {
    elements.greenUpRange.textContent = formatBpm(green.up);
  }
  if (elements.greenDownRange) {
    elements.greenDownRange.textContent = formatBpm(green.down);
  }
  if (elements.yellowUpRange) {
    elements.yellowUpRange.textContent = formatBpm(yellow.up);
  }
  if (elements.yellowDownRange) {
    elements.yellowDownRange.textContent = formatBpm(yellow.down);
  }
  if (elements.redUpThreshold) {
    elements.redUpThreshold.textContent = formatThreshold('<', red.upThreshold);
  }
  if (elements.redDownThreshold) {
    elements.redDownThreshold.textContent = formatThreshold('>', red.downThreshold);
  }
  if (elements.currentAnchorLabel) {
    elements.currentAnchorLabel.textContent = formatBpm(anchor);
  }
  if (elements.settingsSummary && selection) {
    const summaryParts = [
      `Anchor ${formatBpm(anchor)}`,
      `Green ±${selection.greenPct}%`,
      `Yellow ±${selection.yellowPct}%`,
    ];
    elements.settingsSummary.textContent = summaryParts.join(' • ');
  }
}

function updateQuickAnchorSelection(anchorValue) {
  quickAnchorButtons.forEach((button) => {
    const isActive = Number(button.dataset.anchor) === anchorValue;
    button.classList.toggle('bg-teal-600/80', isActive);
    button.classList.toggle('border-teal-400/80', isActive);
    button.classList.toggle('text-teal-50', isActive);
    button.classList.toggle('bg-slate-800/60', !isActive);
    button.classList.toggle('border-slate-700/70', !isActive);
    button.classList.toggle('text-slate-200', !isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderAxis(rows, elements) {
  const { axisBody, axisEmptyState, copyAxisButton, copyCsvButton, downloadCsvButton } = elements;
  if (!axisBody) {
    return;
  }

  axisBody.innerHTML = '';

  if (!rows.length) {
    if (axisEmptyState) {
      axisEmptyState.classList.remove('hidden');
    }
    if (copyAxisButton) {
      copyAxisButton.disabled = true;
    }
    if (copyCsvButton) {
      copyCsvButton.disabled = true;
    }
    if (downloadCsvButton) {
      downloadCsvButton.disabled = true;
    }
    return;
  }

  if (axisEmptyState) {
    axisEmptyState.classList.add('hidden');
  }

  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition-colors';

    const directionCell = document.createElement('td');
    directionCell.className = 'px-4 py-3 font-semibold uppercase text-xs tracking-wide text-slate-300';
    directionCell.textContent = row.direction;
    tr.appendChild(directionCell);

    const zoneCell = document.createElement('td');
    zoneCell.className = 'px-4 py-3 font-medium';
    zoneCell.textContent = row.zone;
    if (row.zone.includes('Anchor')) {
      zoneCell.classList.add('text-teal-200');
    } else if (row.zone === 'Green') {
      zoneCell.classList.add('text-green-300');
    } else if (row.zone === 'Yellow') {
      zoneCell.classList.add('text-amber-300');
    } else if (row.zone === 'Red') {
      zoneCell.classList.add('text-red-300');
    }
    tr.appendChild(zoneCell);

    const minCell = document.createElement('td');
    minCell.className = 'px-4 py-3 text-slate-200';
    minCell.textContent = row.minLabel;
    tr.appendChild(minCell);

    const maxCell = document.createElement('td');
    maxCell.className = 'px-4 py-3 text-slate-200';
    maxCell.textContent = row.maxLabel;
    tr.appendChild(maxCell);

    const notesCell = document.createElement('td');
    notesCell.className = 'px-4 py-3 text-sm text-slate-300';
    notesCell.textContent = row.description;
    tr.appendChild(notesCell);

    const copyCell = document.createElement('td');
    copyCell.className = 'px-4 py-3 text-center';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.dataset.copyText = row.copyText;
    copyButton.dataset.copyLabel = `${row.direction} ${row.zone}`;
    copyButton.className =
      'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs sm:text-sm transition-colors ' +
      'bg-slate-900/70 border-slate-700/80 text-slate-200 hover:bg-teal-700/80 hover:text-white hover:border-teal-500/70 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';
    copyButton.textContent = 'Copy';
    copyCell.appendChild(copyButton);
    tr.appendChild(copyCell);

    fragment.appendChild(tr);
  });

  axisBody.appendChild(fragment);

  if (copyAxisButton) {
    copyAxisButton.disabled = false;
  }
  if (copyCsvButton) {
    copyCsvButton.disabled = false;
  }
  if (downloadCsvButton) {
    downloadCsvButton.disabled = false;
  }
}

function clearFeedback(elements) {
  if (!elements.copyFeedback) {
    return;
  }
  elements.copyFeedback.textContent = '';
  elements.copyFeedback.classList.remove('text-teal-300', 'text-rose-300', 'text-slate-200');
}

function showFeedback(elements, message, tone = 'info') {
  if (!elements.copyFeedback) {
    return;
  }

  clearTimeout(feedbackTimeoutId);
  clearFeedback(elements);

  const toneClass = tone === 'success' ? 'text-teal-300' : tone === 'error' ? 'text-rose-300' : 'text-slate-200';
  elements.copyFeedback.classList.add(toneClass);
  elements.copyFeedback.textContent = message;

  feedbackTimeoutId = window.setTimeout(() => {
    clearFeedback(elements);
  }, FEEDBACK_CLEAR_DELAY);
}

function clearPlaylistFeedback(elements) {
  if (!elements.playlistFeedback) {
    return;
  }
  elements.playlistFeedback.textContent = '';
  elements.playlistFeedback.classList.remove('text-teal-300', 'text-rose-300', 'text-slate-200');
}

function showPlaylistFeedback(elements, message, tone = 'info') {
  if (!elements.playlistFeedback) {
    return;
  }

  clearTimeout(playlistFeedbackTimeoutId);
  clearPlaylistFeedback(elements);

  const toneClass = tone === 'success' ? 'text-teal-300' : tone === 'error' ? 'text-rose-300' : 'text-slate-200';
  elements.playlistFeedback.classList.add(toneClass);
  elements.playlistFeedback.textContent = message;

  playlistFeedbackTimeoutId = window.setTimeout(() => {
    clearPlaylistFeedback(elements);
  }, FEEDBACK_CLEAR_DELAY);
}

function setPlaylistEmptyState(elements, message) {
  if (!elements.playlistEmptyState) {
    return;
  }
  elements.playlistEmptyState.textContent = message;
  elements.playlistEmptyState.classList.remove('hidden');
}

function hidePlaylistEmptyState(elements) {
  if (!elements.playlistEmptyState) {
    return;
  }
  elements.playlistEmptyState.classList.add('hidden');
}

function resetPlaylistCounts(total = 0) {
  playlistCounts = { total, yes: 0, edge: 0, no: 0, invalid: 0 };
}

function getFilteredPlaylistEntries() {
  if (!playlistEntries.length) {
    return [];
  }
  const { included } = filterPlaylistEntries(playlistEntries, playlistFilters);
  return included;
}

function renderPlaylistPreview(elements) {
  if (!elements.playlistBody) {
    return;
  }

  elements.playlistBody.innerHTML = '';

  const hasTracks = playlistTracks.length > 0;
  const hasScoredEntries = playlistEntries.length === playlistTracks.length && playlistEntries.length > 0;

  if (!hasTracks) {
    setPlaylistEmptyState(elements, 'Paste a playlist CSV to preview matches.');
    if (elements.playlistSummary) {
      elements.playlistSummary.textContent = 'No playlist loaded yet.';
    }
    if (elements.playlistCopyButton) {
      elements.playlistCopyButton.disabled = true;
    }
    if (elements.playlistDownloadButton) {
      elements.playlistDownloadButton.disabled = true;
    }
    if (elements.playlistExcluded) {
      elements.playlistExcluded.classList.add('hidden');
    }
    return;
  }

  if (!hasScoredEntries) {
    setPlaylistEmptyState(elements, 'Adjust anchor & deviations to score the pasted playlist.');
    if (elements.playlistSummary) {
      elements.playlistSummary.textContent = `${playlistTracks.length} tracks loaded. Waiting for valid settings.`;
    }
    if (elements.playlistCopyButton) {
      elements.playlistCopyButton.disabled = true;
    }
    if (elements.playlistDownloadButton) {
      elements.playlistDownloadButton.disabled = true;
    }
    if (elements.playlistExcluded) {
      elements.playlistExcluded.classList.add('hidden');
    }
    return;
  }

  const { included, excluded } = filterPlaylistEntries(playlistEntries, playlistFilters);

  if (!included.length) {
    setPlaylistEmptyState(elements, 'No tracks match the current filters. Adjust filters to include more tracks.');
    if (elements.playlistCopyButton) {
      elements.playlistCopyButton.disabled = true;
    }
    if (elements.playlistDownloadButton) {
      elements.playlistDownloadButton.disabled = true;
    }
  } else {
    hidePlaylistEmptyState(elements);

    const fragment = document.createDocumentFragment();

    included.forEach((entry) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-800/40 transition-colors';

      const titleCell = document.createElement('td');
      titleCell.className = 'px-4 py-3 font-medium text-slate-100';
      titleCell.textContent = entry.title || '—';
      row.appendChild(titleCell);

      const artistCell = document.createElement('td');
      artistCell.className = 'px-4 py-3 text-slate-300';
      artistCell.textContent = entry.artist || '—';
      row.appendChild(artistCell);

      const bpmCell = document.createElement('td');
      bpmCell.className = 'px-4 py-3 text-slate-200';
      bpmCell.textContent = entry.bpmLabel;
      row.appendChild(bpmCell);

      const fitsCell = document.createElement('td');
      fitsCell.className = 'px-4 py-3 font-semibold';
      if (entry.status === 'yes') {
        fitsCell.classList.add('text-green-300');
      } else if (entry.status === 'edge') {
        fitsCell.classList.add('text-amber-300');
      } else if (entry.status === 'no') {
        fitsCell.classList.add('text-rose-300');
      } else {
        fitsCell.classList.add('text-slate-300');
      }
      fitsCell.textContent = entry.fitsLabel;
      row.appendChild(fitsCell);

      const zoneCell = document.createElement('td');
      zoneCell.className = 'px-4 py-3 text-slate-200';
      zoneCell.textContent = entry.zoneLabel;
      row.appendChild(zoneCell);

      const deltaBpmCell = document.createElement('td');
      deltaBpmCell.className = 'px-4 py-3 text-slate-200';
      deltaBpmCell.textContent = entry.deltaBpmLabel;
      row.appendChild(deltaBpmCell);

      const deltaPercentCell = document.createElement('td');
      deltaPercentCell.className = 'px-4 py-3 text-slate-200';
      deltaPercentCell.textContent = entry.deltaPercentLabel;
      row.appendChild(deltaPercentCell);

      const notesCell = document.createElement('td');
      notesCell.className = 'px-4 py-3 text-sm text-slate-300';
      notesCell.textContent = entry.note;
      row.appendChild(notesCell);

      fragment.appendChild(row);
    });

    elements.playlistBody.appendChild(fragment);

    if (elements.playlistCopyButton) {
      elements.playlistCopyButton.disabled = false;
    }
    if (elements.playlistDownloadButton) {
      elements.playlistDownloadButton.disabled = false;
    }
  }

  if (elements.playlistSummary) {
    const summaryParts = [
      `${included.length} of ${playlistCounts.total} tracks included`,
      `Fits: ${playlistCounts.yes}`,
      `Edge: ${playlistCounts.edge}`,
    ];
    if (playlistFilters.no) {
      summaryParts.push(`Outside: ${playlistCounts.no}`);
    } else if (playlistCounts.no) {
      summaryParts.push(`Outside excluded: ${playlistCounts.no}`);
    }
    if (playlistCounts.invalid) {
      summaryParts.push(`Invalid BPM: ${playlistCounts.invalid}`);
    }
    elements.playlistSummary.textContent = summaryParts.join(' • ');
  }

  if (elements.playlistExcluded && elements.playlistExcludedList) {
    elements.playlistExcludedList.innerHTML = '';
    if (excluded.length) {
      elements.playlistExcluded.classList.remove('hidden');
      excluded.forEach((entry) => {
        const item = document.createElement('li');
        item.className = 'text-sm text-slate-300';
        const title = entry.title || 'Untitled track';
        const artist = entry.artist || 'Unknown artist';
        const label = entry.status === 'invalid' ? 'Invalid BPM' : `Excluded (${entry.fitsLabel})`;
        item.textContent = `${title} — ${artist} • ${label}${entry.note ? ` — ${entry.note}` : ''}`;
        elements.playlistExcludedList.appendChild(item);
      });
    } else {
      elements.playlistExcluded.classList.add('hidden');
    }
  }
}

function updatePlaylistScoring(elements) {
  if (!playlistTracks.length) {
    playlistEntries = [];
    resetPlaylistCounts();
    renderPlaylistPreview(elements);
    return;
  }

  if (!currentMixingZones || !currentSelection) {
    playlistEntries = [];
    renderPlaylistPreview(elements);
    return;
  }

  const { entries, counts } = scoreTracks(playlistTracks, {
    anchor: currentMixingZones.anchor,
    greenPct: currentSelection.greenPct,
    yellowPct: currentSelection.yellowPct,
    mixingZones: currentMixingZones,
  });

  playlistEntries = entries;
  playlistCounts = counts;
  renderPlaylistPreview(elements);
}

function handlePlaylistPreview(elements) {
  if (!elements.playlistInput) {
    return;
  }

  const raw = elements.playlistInput.value || '';

  if (!raw.trim()) {
    playlistTracks = [];
    playlistEntries = [];
    resetPlaylistCounts();
    renderPlaylistPreview(elements);
    showPlaylistFeedback(elements, 'Paste a CSV with Title, Artist, BPM columns first.', 'error');
    return;
  }

  const result = parsePlaylistInput(raw);
  if (result.errors.length) {
    playlistTracks = [];
    playlistEntries = [];
    resetPlaylistCounts();
    renderPlaylistPreview(elements);
    showPlaylistFeedback(elements, result.errors[0], 'error');
    return;
  }

  playlistTracks = result.tracks;
  resetPlaylistCounts(playlistTracks.length);

  if (!currentMixingZones || !currentSelection) {
    playlistEntries = [];
    renderPlaylistPreview(elements);
    showPlaylistFeedback(
      elements,
      `Loaded ${playlistTracks.length} tracks. Adjust anchor & deviations to score them.`,
      'info',
    );
    return;
  }

  updatePlaylistScoring(elements);
  const included = getFilteredPlaylistEntries();
  showPlaylistFeedback(
    elements,
    `${playlistTracks.length} tracks tagged. ${included.length} ready for export.`,
    'success',
  );
}

function handlePlaylistCopy(elements) {
  if (!currentMixingZones || !playlistEntries.length) {
    showPlaylistFeedback(elements, 'Preview the playlist before copying.', 'error');
    return;
  }

  const included = getFilteredPlaylistEntries();
  if (!included.length) {
    showPlaylistFeedback(elements, 'No tracks match the current filters.', 'error');
    return;
  }

  const csv = buildPlaylistCsv(included, currentMixingZones.anchor);
  copyToClipboard(csv).then((success) => {
    if (success) {
      showPlaylistFeedback(elements, 'Playlist template copied to clipboard.', 'success');
    } else {
      showPlaylistFeedback(elements, 'Unable to copy playlist template.', 'error');
    }
  });
}

function handlePlaylistDownload(elements) {
  if (!currentMixingZones || !playlistEntries.length) {
    showPlaylistFeedback(elements, 'Preview the playlist before exporting.', 'error');
    return;
  }

  const included = getFilteredPlaylistEntries();
  if (!included.length) {
    showPlaylistFeedback(elements, 'No tracks match the current filters.', 'error');
    return;
  }

  const csv = buildPlaylistCsv(included, currentMixingZones.anchor);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dj-bpm-playlist-${currentMixingZones.anchor}bpm.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showPlaylistFeedback(elements, 'Playlist CSV download started.', 'success');
}

function initPlaylistFilters(elements) {
  if (!elements.playlistFilterContainer) {
    return;
  }

  const checkboxes = elements.playlistFilterContainer.querySelectorAll('input[data-filter-status]');
  checkboxes.forEach((checkbox) => {
    const status = checkbox.dataset.filterStatus;
    if (!status || !(status in playlistFilters)) {
      return;
    }
    checkbox.checked = Boolean(playlistFilters[status]);
    checkbox.addEventListener('change', () => {
      playlistFilters[status] = checkbox.checked;
      renderPlaylistPreview(elements);
    });
  });
}

async function copyToClipboard(text) {
  if (!text) {
    return false;
  }

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Fall back to legacy approach below.
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (error) {
    success = false;
  }

  document.body.removeChild(textArea);
  return success;
}

function handleAxisCopyClick(event, elements) {
  const button = event.target.closest('button[data-copy-text]');
  if (!button) {
    return;
  }

  const { copyText, copyLabel } = button.dataset;
  if (!copyText) {
    showFeedback(elements, 'Nothing to copy for this row.', 'error');
    return;
  }

  copyToClipboard(copyText).then((success) => {
    if (success) {
      showFeedback(elements, `${copyLabel || 'Range'} copied to clipboard.`, 'success');
    } else {
      showFeedback(elements, 'Unable to copy to clipboard.', 'error');
    }
  });
}

function handleCopySummary(elements) {
  if (!currentAxisRows.length) {
    showFeedback(elements, 'Generate axis ranges before copying.', 'error');
    return;
  }
  const summary = currentAxisRows.map((row) => row.copyText).join('\n');
  copyToClipboard(summary).then((success) => {
    if (success) {
      showFeedback(elements, 'Axis summary copied to clipboard.', 'success');
    } else {
      showFeedback(elements, 'Unable to copy axis summary.', 'error');
    }
  });
}

function handleCopyCsv(elements) {
  if (!currentAxisRows.length || !currentMixingZones) {
    showFeedback(elements, 'Generate axis ranges before copying CSV.', 'error');
    return;
  }

  const csv = buildAxisCsv(currentAxisRows, currentMixingZones.anchor);
  copyToClipboard(csv).then((success) => {
    if (success) {
      showFeedback(elements, 'Rekordbox CSV copied to clipboard.', 'success');
    } else {
      showFeedback(elements, 'Unable to copy CSV.', 'error');
    }
  });
}

function handleDownloadCsv(elements) {
  if (!currentAxisRows.length || !currentMixingZones) {
    showFeedback(elements, 'Generate axis ranges before downloading CSV.', 'error');
    return;
  }

  const csv = buildAxisCsv(currentAxisRows, currentMixingZones.anchor);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dj-bpm-axis-${currentMixingZones.anchor}bpm.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showFeedback(elements, 'CSV download started.', 'success');
}

function createPresetId() {
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizePreset(preset) {
  if (!preset || typeof preset !== 'object') {
    return null;
  }
  if (typeof preset.name !== 'string') {
    return null;
  }
  const name = preset.name.trim();
  if (!name) {
    return null;
  }
  const anchor = Number(preset.anchor);
  const green = Number(preset.green);
  const yellow = Number(preset.yellow);
  if (!Number.isInteger(anchor) || !Number.isInteger(green) || !Number.isInteger(yellow)) {
    return null;
  }
  const validation = validateInputs(anchor, green, yellow);
  if (!validation.valid) {
    return null;
  }
  return {
    id: typeof preset.id === 'string' ? preset.id : createPresetId(),
    name,
    anchor,
    green,
    yellow,
    savedAt: typeof preset.savedAt === 'string' ? preset.savedAt : new Date().toISOString(),
  };
}

function loadPresets() {
  if (!storageAvailable) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((preset) => sanitizePreset(preset))
      .filter((preset) => preset !== null);
  } catch (error) {
    console.warn('Failed to load presets from storage', error);
    return [];
  }
}

function persistPresets() {
  if (!storageAvailable) {
    return false;
  }
  try {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (error) {
    console.warn('Failed to persist presets', error);
    return false;
  }
}

function renderPresetList(elements) {
  const { presetList, presetEmptyState } = elements;
  if (!presetList) {
    return;
  }

  presetList.innerHTML = '';

  if (!presets.length) {
    if (presetEmptyState) {
      presetEmptyState.classList.remove('hidden');
    }
    return;
  }

  if (presetEmptyState) {
    presetEmptyState.classList.add('hidden');
  }

  const sorted = [...presets].sort((a, b) => {
    const aTime = new Date(a.savedAt).getTime();
    const bTime = new Date(b.savedAt).getTime();
    return bTime - aTime;
  });

  const fragment = document.createDocumentFragment();
  sorted.forEach((preset) => {
    const listItem = document.createElement('li');
    listItem.className =
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-700/60 bg-slate-900/60 p-4';

    const infoWrapper = document.createElement('div');
    const nameEl = document.createElement('p');
    nameEl.className = 'text-sm font-semibold text-slate-100';
    nameEl.textContent = preset.name;
    const detailEl = document.createElement('p');
    detailEl.className = 'text-xs text-slate-400';
    detailEl.textContent = `A${preset.anchor} • G±${preset.green}% • Y±${preset.yellow}%`;
    infoWrapper.appendChild(nameEl);
    infoWrapper.appendChild(detailEl);

    const actions = document.createElement('div');
    actions.className = 'flex flex-wrap gap-2';

    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.dataset.action = 'load';
    loadButton.dataset.presetId = preset.id;
    loadButton.className =
      'px-3 py-1.5 text-xs sm:text-sm rounded-md bg-teal-700/80 text-white border border-teal-500/60 hover:bg-teal-600/80 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';
    loadButton.textContent = 'Load';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.presetId = preset.id;
    deleteButton.className =
      'px-3 py-1.5 text-xs sm:text-sm rounded-md border border-slate-600/70 text-slate-200 hover:bg-slate-800/70 hover:text-white ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';
    deleteButton.textContent = 'Delete';

    actions.appendChild(loadButton);
    actions.appendChild(deleteButton);

    listItem.appendChild(infoWrapper);
    listItem.appendChild(actions);

    fragment.appendChild(listItem);
  });

  presetList.appendChild(fragment);
}

function handleSavePreset(elements) {
  if (!storageAvailable) {
    showFeedback(elements, 'Browser storage is unavailable. Presets are disabled.', 'error');
    return;
  }

  const name = elements.presetNameInput?.value.trim();
  if (!name) {
    showFeedback(elements, 'Enter a name before saving a preset.', 'error');
    if (elements.presetNameInput) {
      elements.presetNameInput.focus();
    }
    return;
  }

  const anchor = Number(elements.anchorSelect.value);
  const greenPct = Number(elements.greenSelect.value);
  const yellowPct = Number(elements.yellowSelect.value);
  const validation = validateInputs(anchor, greenPct, yellowPct);
  if (!validation.valid) {
    showFeedback(elements, `Cannot save preset: ${validation.message}`, 'error');
    return;
  }

  const existingIndex = presets.findIndex((preset) => preset.name.toLowerCase() === name.toLowerCase());
  const presetData = {
    id: existingIndex >= 0 ? presets[existingIndex].id : createPresetId(),
    name,
    anchor,
    green: greenPct,
    yellow: yellowPct,
    savedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    presets[existingIndex] = presetData;
  } else {
    presets.push(presetData);
  }

  if (!persistPresets()) {
    showFeedback(elements, 'Unable to save preset to browser storage.', 'error');
    return;
  }

  renderPresetList(elements);
  showFeedback(elements, `Preset “${name}” saved.`, 'success');
}

function applyPreset(preset, elements, handleChange) {
  if (!preset) {
    return;
  }
  elements.anchorSelect.value = String(preset.anchor);
  elements.greenSelect.value = String(preset.green);
  elements.yellowSelect.value = String(preset.yellow);
  handleChange();
  elements.anchorSelect.focus({ preventScroll: true });
}

function handlePresetListAction(event, elements, handleChange) {
  const button = event.target.closest('button[data-action][data-preset-id]');
  if (!button) {
    return;
  }

  const { action, presetId } = button.dataset;
  const preset = presets.find((item) => item.id === presetId);

  if (action === 'load' && preset) {
    applyPreset(preset, elements, handleChange);
    showFeedback(elements, `Preset “${preset.name}” loaded.`, 'success');
    if (elements.presetNameInput) {
      elements.presetNameInput.value = preset.name;
    }
  } else if (action === 'delete' && preset) {
    presets = presets.filter((item) => item.id !== presetId);
    if (!persistPresets()) {
      showFeedback(elements, 'Unable to update presets in storage.', 'error');
      return;
    }
    renderPresetList(elements);
    showFeedback(elements, 'Preset deleted.', 'info');
  }
}

function resetToDefaults(elements, handleChange) {
  elements.anchorSelect.value = String(DEFAULT_ANCHOR);
  elements.greenSelect.value = String(DEFAULT_GREEN_DEV);
  elements.yellowSelect.value = String(DEFAULT_YELLOW_DEV);
  handleChange();
  elements.anchorSelect.focus({ preventScroll: true });
}

function initQuickAnchors(elements, handleChange) {
  const container = elements.quickAnchorsContainer;
  if (!container) {
    return;
  }

  container.innerHTML = '';
  quickAnchorButtons = [];

  QUICK_ANCHORS.forEach((anchorValue) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.anchor = String(anchorValue);
    button.className =
      'px-3 py-1.5 text-xs sm:text-sm rounded-md border bg-slate-800/60 border-slate-700/70 text-slate-200 transition-colors ' +
      'hover:bg-teal-600/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ' +
      'focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';
    button.textContent = `${anchorValue} BPM`;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      elements.anchorSelect.value = String(anchorValue);
      handleChange();
    });
    quickAnchorButtons.push(button);
    container.appendChild(button);
  });
}

function initPresetsSection(elements, handleChange) {
  if (!elements.presetNameInput || !elements.savePresetButton || !elements.presetList) {
    return;
  }

  if (!storageAvailable) {
    elements.presetNameInput.disabled = true;
    elements.savePresetButton.disabled = true;
    if (elements.presetsUnavailable) {
      elements.presetsUnavailable.classList.remove('hidden');
    }
    return;
  }

  presets = loadPresets();
  renderPresetList(elements);

  elements.savePresetButton.addEventListener('click', () => handleSavePreset(elements));
  elements.presetNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSavePreset(elements);
    }
  });
  elements.presetList.addEventListener('click', (event) => handlePresetListAction(event, elements, handleChange));
}

function init() {
  const elements = getElements();
  if (!elements.anchorSelect || !elements.greenSelect || !elements.yellowSelect) {
    return;
  }

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
    const greenPct = Number(elements.greenSelect.value);
    const yellowPct = Number(elements.yellowSelect.value);

    clearFeedback(elements);

    const validation = validateInputs(anchor, greenPct, yellowPct);
    renderInlineErrors(validation.errors, elements);

    if (!validation.valid) {
      toggleResultsVisibility(elements, false);
      if (elements.currentAnchorLabel) {
        elements.currentAnchorLabel.textContent = '—';
      }
      if (elements.settingsSummary) {
        elements.settingsSummary.textContent = '';
      }
      currentAxisRows = [];
      currentMixingZones = null;
      currentSelection = null;
      renderAxis([], elements);
      updatePlaylistScoring(elements);
      return;
    }

    const results = calculateMixingZones(anchor, greenPct, yellowPct);
    currentMixingZones = results;
    currentSelection = { anchor, greenPct, yellowPct };
    currentAxisRows = buildAxisRows(results);
    renderResultsCards(results, elements, { anchor, greenPct, yellowPct });
    renderAxis(currentAxisRows, elements);
    toggleResultsVisibility(elements, true);
    updateQuickAnchorSelection(anchor);
    updatePlaylistScoring(elements);
  };

  initQuickAnchors(elements, handleChange);
  initPresetsSection(elements, handleChange);
  initPlaylistFilters(elements);

  elements.anchorSelect.addEventListener('change', handleChange);
  elements.greenSelect.addEventListener('change', handleChange);
  elements.yellowSelect.addEventListener('change', handleChange);

  if (elements.resetButton) {
    elements.resetButton.addEventListener('click', (event) => {
      event.preventDefault();
      resetToDefaults(elements, handleChange);
      showFeedback(elements, 'Settings reset to defaults.', 'info');
    });
  }

  if (elements.axisBody) {
    elements.axisBody.addEventListener('click', (event) => handleAxisCopyClick(event, elements));
  }
  if (elements.copyAxisButton) {
    elements.copyAxisButton.addEventListener('click', () => handleCopySummary(elements));
  }
  if (elements.copyCsvButton) {
    elements.copyCsvButton.addEventListener('click', () => handleCopyCsv(elements));
  }
  if (elements.downloadCsvButton) {
    elements.downloadCsvButton.addEventListener('click', () => handleDownloadCsv(elements));
  }
  if (elements.playlistPreviewButton) {
    elements.playlistPreviewButton.addEventListener('click', () => handlePlaylistPreview(elements));
  }
  if (elements.playlistCopyButton) {
    elements.playlistCopyButton.addEventListener('click', () => handlePlaylistCopy(elements));
  }
  if (elements.playlistDownloadButton) {
    elements.playlistDownloadButton.addEventListener('click', () => handlePlaylistDownload(elements));
  }

  handleChange();
}

document.addEventListener('DOMContentLoaded', init);
