export const ANCHOR_MIN = 60;
export const ANCHOR_MAX = 220;
export const GREEN_MIN = 1;
export const GREEN_MAX = 20;
export const YELLOW_MIN = 1;
export const YELLOW_MAX = 25;
export const DEFAULT_ANCHOR = 133;
export const DEFAULT_GREEN_DEV = 6;
export const DEFAULT_YELLOW_DEV = 8;

const PERCENTAGE_MAX = 100;

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateInputs(anchor, greenPct, yellowPct) {
  const errors = {};

  if (!isNumber(anchor)) {
    errors.anchor = 'Anchor BPM must be a number.';
  } else if (!Number.isInteger(anchor)) {
    errors.anchor = 'Anchor BPM must be a whole number.';
  }

  if (!isNumber(greenPct)) {
    errors.green = 'Green deviation must be a number.';
  } else if (!Number.isInteger(greenPct)) {
    errors.green = 'Green deviation must be a whole number.';
  }

  if (!isNumber(yellowPct)) {
    errors.yellow = 'Yellow deviation must be a number.';
  } else if (!Number.isInteger(yellowPct)) {
    errors.yellow = 'Yellow deviation must be a whole number.';
  }

  if (!errors.anchor) {
    if (anchor < ANCHOR_MIN || anchor > ANCHOR_MAX) {
      errors.anchor = `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`;
    }
  }

  if (!errors.green) {
    if (greenPct < GREEN_MIN || greenPct > GREEN_MAX) {
      errors.green = `Green deviation must be between ${GREEN_MIN}% and ${GREEN_MAX}%.`;
    } else if (greenPct > PERCENTAGE_MAX) {
      errors.green = 'Green deviation must be 100% or less.';
    }
  }

  if (!errors.yellow) {
    if (yellowPct < YELLOW_MIN || yellowPct > YELLOW_MAX) {
      errors.yellow = `Yellow deviation must be between ${YELLOW_MIN}% and ${YELLOW_MAX}%.`;
    } else if (yellowPct > PERCENTAGE_MAX) {
      errors.yellow = 'Yellow deviation must be 100% or less.';
    }
  }

  if (!errors.green && !errors.yellow && greenPct >= yellowPct) {
    errors.yellow = 'Yellow deviation must be greater than green deviation.';
  }

  const errorKeys = Object.keys(errors);

  if (errorKeys.length > 0) {
    const field = errorKeys[0];
    return { valid: false, message: errors[field], field, errors };
  }

  return { valid: true, errors: {} };
}

function calculateDeviation(anchor, percentage) {
  const offset = (anchor * percentage) / 100;
  const up = Math.round(anchor - offset);
  const down = Math.round(anchor + offset);

  return { up, down };
}

export function calculateMixingZones(anchor, greenPct, yellowPct) {
  const validation = validateInputs(anchor, greenPct, yellowPct);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const green = calculateDeviation(anchor, greenPct);
  const yellow = calculateDeviation(anchor, yellowPct);

  return {
    anchor,
    green,
    yellow,
    red: {
      upThreshold: yellow.up,
      downThreshold: yellow.down,
    },
  };
}

export function formatBpm(value) {
  return `${value} BPM`;
}

export function formatThreshold(prefix, value) {
  return `${prefix} ${value} BPM`;
}
