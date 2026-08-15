// Utility functions for working with hex color strings.

/**
 * Converts a hex color string (e.g. "#ff0000" or "f00") into an
 * { r, g, b } object with values in the range 0-255.
 *
 * Returns null if the input is not a valid hex color.
 */
export function hexToRgb(hex) {
  if (typeof hex !== "string") return null;

  const normalized = hex.trim().replace(/^#/, "");

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  const r = parseInt(expanded.substring(0, 2), 16);
  const g = parseInt(expanded.substring(2, 4), 16);
  const b = parseInt(expanded.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Given a background hex color, decides whether black or white text will
 * be more readable on top of it, using the standard YIQ brightness
 * heuristic.
 *
 * @param {string} hexColor a hex color string, e.g. "#1e88e5"
 * @returns {"#000000"|"#ffffff"} the recommended text color
 */
export function getContrastTextColor(hexColor) {
  const rgb = hexToRgb(hexColor);
  // Stryker disable next-line ConditionalExpression : defensive fallback for invalid/missing color
  if (!rgb) return "#000000";

  const { r, g, b } = rgb;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 128 ? "#000000" : "#ffffff";
}

/**
 * Returns a random hex color string, e.g. "#a1b2c3".
 */
export function randomHexColor() {
  const randomByte = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  return `#${randomByte()}${randomByte()}${randomByte()}`;
}
