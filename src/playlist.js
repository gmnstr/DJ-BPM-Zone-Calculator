import { formatBpm } from './calculation.js';

const HEADER_ALIASES = {
  title: ['title', 'track title', 'track', 'name'],
  artist: ['artist', 'artists'],
  bpm: ['bpm', 'tempo', 'bpm (analysis)', 'analyzed bpm', 'detected bpm'],
};

const STATUS_LABELS = {
  yes: 'Yes',
  edge: 'Edge',
  no: 'No',
  invalid: '—',
};

const ZONE_LABELS = {
  yes: 'Green',
  edge: 'Yellow',
  no: 'Red',
  invalid: '—',
};

const DELIMITER_CANDIDATES = [',', ';', '\t'];

function normaliseHeader(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findHeaderIndex(headers, key) {
  const aliases = HEADER_ALIASES[key];
  for (let index = 0; index < headers.length; index += 1) {
    const header = normaliseHeader(headers[index]);
    if (aliases.some((alias) => header === alias || header.includes(alias))) {
      return index;
    }
  }
  return -1;
}

function detectDelimiter(sampleLine) {
  for (const delimiter of DELIMITER_CANDIDATES) {
    const count = sampleLine.split(delimiter).length - 1;
    if (count > 0) {
      return delimiter;
    }
  }
  return ',';
}

function splitCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const peekNext = line[index + 1];
      if (inQuotes && peekNext === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function parseBpm(value) {
  if (!value || typeof value !== 'string') {
    return { bpm: null, raw: '' };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { bpm: null, raw: '' };
  }
  const normalised = trimmed.replace(/,/g, '.');
  const parsed = Number.parseFloat(normalised);
  if (Number.isFinite(parsed)) {
    return { bpm: parsed, raw: trimmed };
  }
  return { bpm: null, raw: trimmed };
}

export function parsePlaylistInput(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { tracks: [], errors: ['Paste a CSV with Title, Artist, BPM columns.'] };
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return { tracks: [], errors: ['Paste a CSV with Title, Artist, BPM columns.'] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter);

  const titleIndex = findHeaderIndex(headers, 'title');
  const artistIndex = findHeaderIndex(headers, 'artist');
  const bpmIndex = findHeaderIndex(headers, 'bpm');

  if (titleIndex === -1 || artistIndex === -1 || bpmIndex === -1) {
    return {
      tracks: [],
      errors: ['CSV header must include Title, Artist, and BPM columns.'],
    };
  }

  const tracks = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = splitCsvLine(lines[lineIndex], delimiter);
    const title = cells[titleIndex] ?? '';
    const artist = cells[artistIndex] ?? '';
    const bpmCell = cells[bpmIndex] ?? '';

    if (!title && !artist && !bpmCell) {
      continue;
    }

    const { bpm, raw } = parseBpm(bpmCell);

    tracks.push({
      rowNumber: lineIndex + 1,
      title,
      artist,
      bpm,
      bpmRaw: raw,
    });
  }

  if (!tracks.length) {
    return {
      tracks: [],
      errors: ['No tracks detected. Ensure the CSV has data rows.'],
    };
  }

  return { tracks, errors: [] };
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Number.parseFloat(value.toFixed(digits));
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toString();
}

function formatSigned(value, unit) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (Object.is(value, -0)) {
    return `0 ${unit}`;
  }
  if (Math.abs(value) < 0.005) {
    return `0 ${unit}`;
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)} ${unit}`;
}

function describeDelta(anchor, bpm) {
  if (!Number.isFinite(bpm)) {
    return 'BPM unavailable';
  }
  const deltaBpm = bpm - anchor;
  if (Math.abs(deltaBpm) < 0.005) {
    return 'Matches anchor BPM';
  }
  const deltaPercent = (deltaBpm / anchor) * 100;
  const direction = deltaBpm > 0 ? 'faster' : 'slower';
  return `${formatSigned(deltaBpm, 'BPM')} (${formatSigned(deltaPercent, '%')} ${direction})`;
}

function classifyTrack(track, context) {
  const { anchor, greenPct, yellowPct, mixingZones } = context;
  if (!Number.isFinite(track.bpm)) {
    return {
      ...track,
      status: 'invalid',
      fitsLabel: STATUS_LABELS.invalid,
      zoneLabel: ZONE_LABELS.invalid,
      deltaBpm: null,
      deltaPercent: null,
      deltaBpmLabel: '—',
      deltaPercentLabel: '—',
      note: 'Missing or invalid BPM',
      bpmLabel: track.bpmRaw || '—',
    };
  }

  const { bpm } = track;
  const deltaBpm = bpm - anchor;
  const deltaPercent = (deltaBpm / anchor) * 100;
  const deltaBpmLabel = formatSigned(deltaBpm, 'BPM');
  const deltaPercentLabel = formatSigned(deltaPercent, '%');
  const withinGreen = bpm >= mixingZones.green.up && bpm <= mixingZones.green.down;
  const withinYellow = bpm >= mixingZones.yellow.up && bpm <= mixingZones.yellow.down;

  if (withinGreen) {
    return {
      ...track,
      status: 'yes',
      fitsLabel: STATUS_LABELS.yes,
      zoneLabel: ZONE_LABELS.yes,
      deltaBpm,
      deltaPercent,
      deltaBpmLabel,
      deltaPercentLabel,
      note: `Within ±${greenPct}% window — ${describeDelta(anchor, bpm)}`,
      bpmLabel: formatNumber(bpm),
    };
  }

  if (withinYellow) {
    return {
      ...track,
      status: 'edge',
      fitsLabel: STATUS_LABELS.edge,
      zoneLabel: ZONE_LABELS.edge,
      deltaBpm,
      deltaPercent,
      deltaBpmLabel,
      deltaPercentLabel,
      note: `Within caution window (±${yellowPct}%) — ${describeDelta(anchor, bpm)}`,
      bpmLabel: formatNumber(bpm),
    };
  }

  return {
    ...track,
    status: 'no',
    fitsLabel: STATUS_LABELS.no,
    zoneLabel: ZONE_LABELS.no,
    deltaBpm,
    deltaPercent,
    deltaBpmLabel,
    deltaPercentLabel,
    note: `Outside ±${yellowPct}% window — ${describeDelta(anchor, bpm)}`,
    bpmLabel: formatNumber(bpm),
  };
}

export function scoreTracks(tracks, context) {
  const counts = {
    total: tracks.length,
    yes: 0,
    edge: 0,
    no: 0,
    invalid: 0,
  };
  const entries = tracks.map((track) => {
    const entry = classifyTrack(track, context);
    counts[entry.status] += 1;
    return entry;
  });
  return { entries, counts };
}

export function createDefaultFilters() {
  return {
    yes: true,
    edge: true,
    no: false,
  };
}

export function filterPlaylistEntries(entries, filters) {
  const included = [];
  const excluded = [];

  entries.forEach((entry) => {
    if (entry.status === 'invalid') {
      excluded.push(entry);
    } else if (filters[entry.status]) {
      included.push(entry);
    } else {
      excluded.push(entry);
    }
  });

  return { included, excluded };
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function buildPlaylistCsv(entries, anchor) {
  const header = [
    'Title',
    'Artist',
    'BPM',
    'Fits',
    'Zone',
    'Delta (BPM)',
    'Delta (%)',
    'Notes',
    'Anchor BPM',
  ];

  const lines = [header];

  entries.forEach((entry) => {
    lines.push([
      entry.title,
      entry.artist,
      Number.isFinite(entry.bpm) ? formatNumber(entry.bpm) : '',
      entry.fitsLabel,
      entry.zoneLabel,
      entry.deltaBpmLabel,
      entry.deltaPercentLabel,
      entry.note,
      formatBpm(anchor),
    ]);
  });

  return lines.map((line) => line.map(escapeCsvValue).join(',')).join('\r\n');
}

export const PLAYLIST_STATUS_LABELS = STATUS_LABELS;
export const PLAYLIST_ZONE_LABELS = ZONE_LABELS;
