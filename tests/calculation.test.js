import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANCHOR_MIN,
  ANCHOR_MAX,
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
    });
  });

  it('rejects anchors outside of range', () => {
    assert.deepEqual(validateInputs(ANCHOR_MIN - 1, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV), {
      valid: false,
      message: `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`,
    });
    assert.deepEqual(validateInputs(ANCHOR_MAX + 1, DEFAULT_GREEN_DEV, DEFAULT_YELLOW_DEV), {
      valid: false,
      message: `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`,
    });
  });

  it('rejects when yellow deviation is not greater than green', () => {
    assert.deepEqual(validateInputs(DEFAULT_ANCHOR, 8, 6), {
      valid: false,
      message: 'Yellow deviation must be greater than green deviation.',
    });
  });
});
