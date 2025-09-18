import { formatBpm } from './calculation.js';

const RANGE_TYPES = {
  RANGE: 'range',
  MAX: 'max',
  MIN: 'min',
  ANCHOR: 'anchor',
};

const ZONE_DESCRIPTIONS = {
  up: {
    Green: 'Optimal mix window (slower track)',
    Yellow: 'Stretch / caution (slower track)',
    Red: 'Out of range — too slow',
  },
  down: {
    Green: 'Optimal mix window (faster track)',
    Yellow: 'Stretch / caution (faster track)',
    Red: 'Out of range — too fast',
  },
  anchor: 'Reference anchor tempo',
};

function clampRange(min, max) {
  if (typeof min === 'number' && typeof max === 'number' && max < min) {
    return { min, max: min };
  }
  return { min, max };
}

function formatRangeLabels(rangeType, minValue, maxValue) {
  if (rangeType === RANGE_TYPES.RANGE) {
    return {
      minLabel: formatBpm(minValue),
      maxLabel: formatBpm(maxValue),
      rangeText: `${formatBpm(minValue)} – ${formatBpm(maxValue)}`,
    };
  }

  if (rangeType === RANGE_TYPES.MAX) {
    return {
      minLabel: '—',
      maxLabel: `≤ ${formatBpm(maxValue)}`,
      rangeText: `≤ ${formatBpm(maxValue)}`,
    };
  }

  if (rangeType === RANGE_TYPES.MIN) {
    return {
      minLabel: `≥ ${formatBpm(minValue)}`,
      maxLabel: '—',
      rangeText: `≥ ${formatBpm(minValue)}`,
    };
  }

  return {
    minLabel: formatBpm(minValue),
    maxLabel: formatBpm(maxValue),
    rangeText: formatBpm(minValue),
  };
}

function buildRow({
  id,
  direction,
  zone,
  description,
  rangeType,
  minValue,
  maxValue,
  csvNote,
}) {
  const { min, max } = clampRange(minValue, maxValue);
  const labels = formatRangeLabels(rangeType, min, max);
  const copyText =
    rangeType === RANGE_TYPES.ANCHOR
      ? `${zone}: ${labels.rangeText}`
      : `${direction} • ${zone}: ${labels.rangeText}`;

  return {
    id,
    direction,
    zone,
    description,
    rangeType,
    minValue: min,
    maxValue: max,
    minLabel: labels.minLabel,
    maxLabel: labels.maxLabel,
    rangeText: labels.rangeText,
    copyText,
    csv: {
      min: typeof min === 'number' ? String(min) : '',
      max: typeof max === 'number' ? String(max) : '',
      note: csvNote ?? description,
    },
  };
}

export function buildAxisRows(mixingZones) {
  const { anchor, green, yellow } = mixingZones;

  const anchorMinusOne = anchor - 1;
  const anchorPlusOne = anchor + 1;

  const upGreenMax = Math.max(green.up, anchorMinusOne);
  const upYellowMax = Math.max(yellow.up, upGreenMax - 1);
  const downGreenMin = Math.min(green.down, anchorPlusOne);
  const downYellowMinCandidate = green.down + 1;
  const downYellowMin = downYellowMinCandidate <= yellow.down ? downYellowMinCandidate : yellow.down;

  const rows = [];

  rows.push(
    buildRow({
      id: 'up-green',
      direction: 'Upmix',
      zone: 'Green',
      description: ZONE_DESCRIPTIONS.up.Green,
      rangeType: RANGE_TYPES.RANGE,
      minValue: green.up,
      maxValue: upGreenMax,
    }),
  );

  rows.push(
    buildRow({
      id: 'up-yellow',
      direction: 'Upmix',
      zone: 'Yellow',
      description: ZONE_DESCRIPTIONS.up.Yellow,
      rangeType: RANGE_TYPES.RANGE,
      minValue: yellow.up,
      maxValue: upYellowMax,
    }),
  );

  rows.push(
    buildRow({
      id: 'up-red',
      direction: 'Upmix',
      zone: 'Red',
      description: ZONE_DESCRIPTIONS.up.Red,
      rangeType: RANGE_TYPES.MAX,
      minValue: null,
      maxValue: yellow.up - 1,
      csvNote: `${ZONE_DESCRIPTIONS.up.Red} (≤ ${formatBpm(yellow.up - 1)})`,
    }),
  );

  rows.push(
    buildRow({
      id: 'anchor',
      direction: 'Anchor',
      zone: 'Anchor BPM',
      description: ZONE_DESCRIPTIONS.anchor,
      rangeType: RANGE_TYPES.ANCHOR,
      minValue: anchor,
      maxValue: anchor,
    }),
  );

  rows.push(
    buildRow({
      id: 'down-green',
      direction: 'Downmix',
      zone: 'Green',
      description: ZONE_DESCRIPTIONS.down.Green,
      rangeType: RANGE_TYPES.RANGE,
      minValue: downGreenMin,
      maxValue: green.down,
    }),
  );

  rows.push(
    buildRow({
      id: 'down-yellow',
      direction: 'Downmix',
      zone: 'Yellow',
      description: ZONE_DESCRIPTIONS.down.Yellow,
      rangeType: RANGE_TYPES.RANGE,
      minValue: downYellowMin,
      maxValue: yellow.down,
    }),
  );

  rows.push(
    buildRow({
      id: 'down-red',
      direction: 'Downmix',
      zone: 'Red',
      description: ZONE_DESCRIPTIONS.down.Red,
      rangeType: RANGE_TYPES.MIN,
      minValue: yellow.down + 1,
      maxValue: null,
      csvNote: `${ZONE_DESCRIPTIONS.down.Red} (≥ ${formatBpm(yellow.down + 1)})`,
    }),
  );

  return rows;
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

export function buildAxisCsv(rows, anchor) {
  const lines = [
    ['Direction', 'Zone', 'Min BPM', 'Max BPM', 'Anchor BPM', 'Notes'],
    ...rows.map((row) => [
      row.direction,
      row.zone,
      row.csv.min,
      row.csv.max,
      String(anchor),
      row.csv.note,
    ]),
  ];

  return lines.map((line) => line.map(escapeCsvValue).join(',')).join('\r\n');
}

export const RANGE_TYPE = RANGE_TYPES;
