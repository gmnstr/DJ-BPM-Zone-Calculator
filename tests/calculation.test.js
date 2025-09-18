import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
  validateInputs,
} from '../src/calculation.js';

describe('calculateMixingZones', () => {
  it('returns rounded BPM boundaries for defaults', () => {
    const result = calculateMixingZones(DEFAULT_ANCHOR, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV);

    assert.deepEqual(result, {
      anchor: DEFAULT_ANCHOR,
      green: { up: 125, down: 141 },
      yellow: { up: 122, down: 144 },
      red: { upThreshold: 122, downThreshold: 144 },
    });
  });

  it('handles lowest anchor edge case', () => {
    const result = calculateMixingZones(ANCHOR_MIN, 2, 5);

    assert.deepEqual(result, {
      anchor: ANCHOR_MIN,
      green: { up: 59, down: 61 },
      yellow: { up: 57, down: 63 },
      red: { upThreshold: 57, downThreshold: 63 },
    });
  });

  it('handles highest anchor edge case', () => {
    const result = calculateMixingZones(ANCHOR_MAX, 3, 7);

    assert.deepEqual(result, {
      anchor: ANCHOR_MAX,
      green: { up: 213, down: 227 },
      yellow: { up: 205, down: 235 },
      red: { upThreshold: 205, downThreshold: 235 },
    });
  });

  it('throws when yellow deviation is not greater than green', () => {
    assert.throws(
      () => calculateMixingZones(DEFAULT_ANCHOR, 8, 6),
      /Yellow deviation must be greater than green deviation\./,
    );
  });
});

describe('validateInputs', () => {
  it('returns valid when all constraints pass', () => {
    assert.deepEqual(validateInputs(DEFAULT_ANCHOR, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV), {
      valid: true,
      errors: {},
    });
  });

  it('rejects anchors outside of range', () => {
    const lowAnchor = validateInputs(ANCHOR_MIN - 1, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV);
    assert.deepEqual(lowAnchor, {
      valid: false,
      field: 'anchor',
      message: `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`,
      errors: {
        anchor: `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`,
      },
    });

    const highAnchor = validateInputs(ANCHOR_MAX + 1, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV);
    assert.deepEqual(highAnchor, {
      valid: false,
      field: 'anchor',
      message: `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`,
      errors: {
        anchor: `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`,
      },
    });
  });

  it('rejects when yellow deviation is not greater than green', () => {
    const invalid = validateInputs(DEFAULT_ANCHOR, 8, 6);
    assert.deepEqual(invalid, {
      valid: false,
      field: 'yellow',
      message: 'Yellow deviation must be greater than green deviation.',
      errors: {
        yellow: 'Yellow deviation must be greater than green deviation.',
      },
    });
  });

  it('rejects non-integer anchors and deviations', () => {
    const anchorResult = validateInputs(DEFAULT_ANCHOR + 0.5, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV);
    assert.deepEqual(anchorResult, {
      valid: false,
      field: 'anchor',
      message: 'Anchor BPM must be a whole number.',
      errors: {
        anchor: 'Anchor BPM must be a whole number.',
      },
    });

    const greenResult = validateInputs(DEFAULT_ANCHOR, DEFAULT_GREEN_DEV + 0.1, DEFAULT_YELLOW_DEV);
    assert.deepEqual(greenResult, {
      valid: false,
      field: 'green',
      message: 'Green deviation must be a whole number.',
      errors: {
        green: 'Green deviation must be a whole number.',
      },
    });
  });

  it('rejects deviations that exceed configured bounds', () => {
    const greenTooHigh = validateInputs(DEFAULT_ANCHOR, GREEN_MAX + 1, DEFAULT_YELLOW_DEV);
    assert.deepEqual(greenTooHigh, {
      valid: false,
      field: 'green',
      message: `Green deviation must be between ${GREEN_MIN}% and ${GREEN_MAX}%.`,
      errors: {
        green: `Green deviation must be between ${GREEN_MIN}% and ${GREEN_MAX}%.`,
      },
    });

    const yellowTooLow = validateInputs(DEFAULT_ANCHOR, DEFAULT_GREEN_DEV, YELLOW_MIN - 1);
    assert.deepEqual(yellowTooLow, {
      valid: false,
      field: 'yellow',
      message: `Yellow deviation must be between ${YELLOW_MIN}% and ${YELLOW_MAX}%.`,
      errors: {
        yellow: `Yellow deviation must be between ${YELLOW_MIN}% and ${YELLOW_MAX}%.`,
      },
    });
  });
});
