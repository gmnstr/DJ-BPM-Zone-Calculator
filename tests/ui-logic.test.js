import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ANCHOR,
  DEFAULT_GREEN_DEV,
  DEFAULT_YELLOW_DEV,
  calculateMixingZones,
} from '../src/calculation.js';
import { buildAxisRows, buildAxisCsv } from '../src/ui-logic.js';

const DEFAULT_ROWS_SNAPSHOT = [
  {
    id: 'up-green',
    direction: 'Upmix',
    zone: 'Green',
    description: 'Optimal mix window (slower track)',
    rangeType: 'range',
    minValue: 125,
    maxValue: 132,
    minLabel: '125 BPM',
    maxLabel: '132 BPM',
    rangeText: '125 BPM – 132 BPM',
    copyText: 'Upmix • Green: 125 BPM – 132 BPM',
    csv: {
      min: '125',
      max: '132',
      note: 'Optimal mix window (slower track)',
    },
  },
  {
    id: 'up-yellow',
    direction: 'Upmix',
    zone: 'Yellow',
    description: 'Stretch / caution (slower track)',
    rangeType: 'range',
    minValue: 122,
    maxValue: 131,
    minLabel: '122 BPM',
    maxLabel: '131 BPM',
    rangeText: '122 BPM – 131 BPM',
    copyText: 'Upmix • Yellow: 122 BPM – 131 BPM',
    csv: {
      min: '122',
      max: '131',
      note: 'Stretch / caution (slower track)',
    },
  },
  {
    id: 'up-red',
    direction: 'Upmix',
    zone: 'Red',
    description: 'Out of range — too slow',
    rangeType: 'max',
    minValue: null,
    maxValue: 121,
    minLabel: '—',
    maxLabel: '≤ 121 BPM',
    rangeText: '≤ 121 BPM',
    copyText: 'Upmix • Red: ≤ 121 BPM',
    csv: {
      min: '',
      max: '121',
      note: 'Out of range — too slow (≤ 121 BPM)',
    },
  },
  {
    id: 'anchor',
    direction: 'Anchor',
    zone: 'Anchor BPM',
    description: 'Reference anchor tempo',
    rangeType: 'anchor',
    minValue: 133,
    maxValue: 133,
    minLabel: '133 BPM',
    maxLabel: '133 BPM',
    rangeText: '133 BPM',
    copyText: 'Anchor BPM: 133 BPM',
    csv: {
      min: '133',
      max: '133',
      note: 'Reference anchor tempo',
    },
  },
  {
    id: 'down-green',
    direction: 'Downmix',
    zone: 'Green',
    description: 'Optimal mix window (faster track)',
    rangeType: 'range',
    minValue: 134,
    maxValue: 141,
    minLabel: '134 BPM',
    maxLabel: '141 BPM',
    rangeText: '134 BPM – 141 BPM',
    copyText: 'Downmix • Green: 134 BPM – 141 BPM',
    csv: {
      min: '134',
      max: '141',
      note: 'Optimal mix window (faster track)',
    },
  },
  {
    id: 'down-yellow',
    direction: 'Downmix',
    zone: 'Yellow',
    description: 'Stretch / caution (faster track)',
    rangeType: 'range',
    minValue: 142,
    maxValue: 144,
    minLabel: '142 BPM',
    maxLabel: '144 BPM',
    rangeText: '142 BPM – 144 BPM',
    copyText: 'Downmix • Yellow: 142 BPM – 144 BPM',
    csv: {
      min: '142',
      max: '144',
      note: 'Stretch / caution (faster track)',
    },
  },
  {
    id: 'down-red',
    direction: 'Downmix',
    zone: 'Red',
    description: 'Out of range — too fast',
    rangeType: 'min',
    minValue: 145,
    maxValue: null,
    minLabel: '≥ 145 BPM',
    maxLabel: '—',
    rangeText: '≥ 145 BPM',
    copyText: 'Downmix • Red: ≥ 145 BPM',
    csv: {
      min: '145',
      max: '',
      note: 'Out of range — too fast (≥ 145 BPM)',
    },
  },
];

describe('buildAxisRows', () => {
  it('produces the expected row snapshot for default values', () => {
    const zones = calculateMixingZones(DEFAULT_ANCHOR, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV);
    const rows = buildAxisRows(zones);
    assert.deepEqual(rows, DEFAULT_ROWS_SNAPSHOT);
  });

  it('normalises overlapping ranges to keep the axis monotonic', () => {
    const edgeZones = calculateMixingZones(60, 1, 2);
    const rows = buildAxisRows(edgeZones);
    const upYellow = rows.find((row) => row.id === 'up-yellow');
    const upRed = rows.find((row) => row.id === 'up-red');

    assert.ok(upYellow);
    assert.ok(upRed);
    assert.strictEqual(upYellow.minValue, upYellow.maxValue);
    assert.strictEqual(upYellow.minLabel, upYellow.maxLabel);
    assert.ok(typeof upRed.maxValue === 'number');
    assert.ok(upRed.maxValue < upYellow.minValue);
  });
});

describe('buildAxisCsv', () => {
  it('serialises rows into a Rekordbox-friendly CSV', () => {
    const zones = calculateMixingZones(DEFAULT_ANCHOR, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV);
    const rows = buildAxisRows(zones);
    const csv = buildAxisCsv(rows, zones.anchor);

    const expected = [
      'Direction,Zone,Min BPM,Max BPM,Anchor BPM,Notes',
      'Upmix,Green,125,132,133,Optimal mix window (slower track)',
      'Upmix,Yellow,122,131,133,Stretch / caution (slower track)',
      'Upmix,Red,,121,133,Out of range — too slow (≤ 121 BPM)',
      'Anchor,Anchor BPM,133,133,133,Reference anchor tempo',
      'Downmix,Green,134,141,133,Optimal mix window (faster track)',
      'Downmix,Yellow,142,144,133,Stretch / caution (faster track)',
      'Downmix,Red,145,,133,Out of range — too fast (≥ 145 BPM)',
    ].join('\r\n');

    assert.equal(csv, expected);
  });
});
