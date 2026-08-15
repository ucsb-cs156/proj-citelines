import {
  hexToRgb,
  getContrastTextColor,
  randomHexColor,
} from "main/utils/colorUtils";

describe("colorUtils tests", () => {
  test("hexToRgb parses 6-digit hex colors", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  test("hexToRgb parses 3-digit hex colors", () => {
    expect(hexToRgb("#0f0")).toEqual({ r: 0, g: 255, b: 0 });
  });

  test("hexToRgb returns null for invalid input", () => {
    expect(hexToRgb("not-a-color")).toBeNull();
    expect(hexToRgb(undefined)).toBeNull();
    expect(hexToRgb(null)).toBeNull();
  });

  test("getContrastTextColor returns black on light backgrounds", () => {
    expect(getContrastTextColor("#ffffff")).toBe("#000000");
    expect(getContrastTextColor("#fff9c4")).toBe("#000000");
  });

  test("getContrastTextColor returns white on dark backgrounds", () => {
    expect(getContrastTextColor("#000000")).toBe("#ffffff");
    expect(getContrastTextColor("#1e88e5")).toBe("#ffffff");
  });

  test("getContrastTextColor falls back to black for invalid colors", () => {
    expect(getContrastTextColor("not-a-color")).toBe("#000000");
    expect(getContrastTextColor(undefined)).toBe("#000000");
  });

  test("randomHexColor returns a valid hex color string", () => {
    const color = randomHexColor();
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
