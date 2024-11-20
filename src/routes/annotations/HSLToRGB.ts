/**
 * Generate a prominent color in hex based on hue.
 * @param {number} hue - The hue value (0-360) for the desired color.
 * @returns {string} - The hex color string (e.g., "#ff0000").
 */
export function generateProminentColor(hue: number, saturation: number, lightness: number): string {
	if (hue <= 0 || hue > 360) {
		throw new Error("Hue must be between 0 and 360");
	}
	if (saturation <= 0 || saturation >= 100) {
		throw new Error("Saturation must be between 1 and 99");
	}
	if (lightness <= 0 || lightness >= 100) {
		throw new Error("Lightness must be between 1 and 99");
	}

	// Convert HSL to RGB
	const rgb = hslToRgb(hue, saturation, lightness);

	// Convert RGB to Hex
	return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert HSL to RGB.
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {object} - RGB values {r, g, b}.
 */

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	s /= 100;
	l /= 100;

	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

	return {
		r: Math.round(f(0) * 255),
		g: Math.round(f(8) * 255),
		b: Math.round(f(4) * 255),
	};
}

/**
 * Convert RGB to Hex.
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} - Hex color string.
 */
function rgbToHex(r: number, g: number, b: number): string {
	return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function generateRandomColor(
	currentColors: string[],
	saturation: number,
	lightness: number
): string {
	const hue = Math.floor(Math.random() * 360);
	const color = generateProminentColor(hue, saturation, lightness);
	console.log("color", color);

	if (currentColors.includes(color)) {
		return generateRandomColor(currentColors, saturation, lightness);
	}

	return color;
}
