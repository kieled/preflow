import { layout, prepare } from "@chenglou/pretext";
import type { LayoutResult, PreparedText } from "@chenglou/pretext";

export type { PreparedText, LayoutResult } from "@chenglou/pretext";

/**
 * Prepare text for measurement. Call once per text+font pair.
 * The result is reusable — call `measureHeight` many times with different widths.
 *
 * Uses @chenglou/pretext for pure-arithmetic text measurement (~0.0002ms per layout).
 */
export function prepareText(text: string, font: string): PreparedText {
	return prepare(text, font);
}

/**
 * Measure the height of prepared text at a given container width and line height.
 * Returns { lineCount, height } via pure arithmetic — no DOM, no canvas.
 *
 * ~450x faster than DOM measurement, ~10x faster than canvas.measureText.
 */
export function measureHeight(
	prepared: PreparedText,
	maxWidth: number,
	lineHeight: number,
): LayoutResult {
	return layout(prepared, maxWidth, lineHeight);
}

/**
 * One-shot: prepare + layout in a single call.
 * Convenient but slower if measuring the same text at multiple widths —
 * use prepareText + measureHeight separately in that case.
 */
export function measureTextHeight(
	text: string,
	font: string,
	maxWidth: number,
	lineHeight: number,
): LayoutResult {
	return layout(prepare(text, font), maxWidth, lineHeight);
}
