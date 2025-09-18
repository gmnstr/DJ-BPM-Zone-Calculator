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
  if (!isNumber(anchor) || !isNumber(greenPct) || !isNumber(yellowPct)) {
    return { valid: false, message: 'Anchor and deviation values must be numbers.' };
  }

  if (anchor < ANCHOR_MIN || anchor > ANCHOR_MAX) {
    return {
      valid: false,
      message: `Anchor BPM must be between ${ANCHOR_MIN} and ${ANCHOR_MAX}.`,
    };
  }

  if (greenPct < GREEN_MIN || greenPct > GREEN_MAX) {
    return {
      valid: false,
      message: `Green deviation must be between ${GREEN_MIN}% and ${GREEN_MAX}%.`,
    };
  }

  if (yellowPct < YELLOW_MIN || yellowPct > YELLOW_MAX) {
    return {
      valid: false,
      message: `Yellow deviation must be between ${YELLOW_MIN}% and ${YELLOW_MAX}%.`,
    };
  }

  if (greenPct >= yellowPct) {
    return { valid: false, message: 'Yellow deviation must be greater than green deviation.' };
  }

  if (greenPct > PERCENTAGE_MAX || yellowPct > PERCENTAGE_MAX) {
    return { valid: false, message: 'Deviations must be 100% or less.' };
  }

  return { valid: true };
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
