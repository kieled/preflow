/**
 * Prefix-sum array for O(1) offset lookups and O(log n) scroll-to-index.
 *
 * prefixSums[i] = sum of heights[0..i-1]
 * prefixSums[0] = 0  (offset of item 0)
 * prefixSums[n] = totalHeight
 */
export function buildPrefixSums(count: number, getHeight: (index: number) => number): Float64Array {
	const sums = new Float64Array(count + 1);
	for (let i = 0; i < count; i++) {
		sums[i + 1] = sums[i]! + getHeight(i);
	}
	return sums;
}

/**
 * Rebuild prefix sums from `fromIndex` onward, reusing existing values before it.
 */
export function rebuildPrefixSumsFrom(
	sums: Float64Array,
	fromIndex: number,
	count: number,
	getHeight: (index: number) => number,
): Float64Array {
	if (count + 1 > sums.length) {
		const newSums = new Float64Array(count + 1);
		newSums.set(sums.subarray(0, fromIndex + 1));
		for (let i = fromIndex; i < count; i++) {
			newSums[i + 1] = newSums[i]! + getHeight(i);
		}
		return newSums;
	}
	for (let i = fromIndex; i < count; i++) {
		sums[i + 1] = sums[i]! + getHeight(i);
	}
	return sums;
}

/** O(1): pixel offset of item at `index`. */
export function getOffset(sums: Float64Array, index: number): number {
	return sums[index] ?? 0;
}

/** O(1): height of item at `index`. */
export function getItemHeight(sums: Float64Array, index: number): number {
	return (sums[index + 1] ?? 0) - (sums[index] ?? 0);
}

/** O(1): total height of all items. */
export function getTotalHeight(sums: Float64Array, count: number): number {
	return sums[count] ?? 0;
}

/**
 * O(log n): find the item index that contains the given scroll offset.
 * Binary search on the prefix-sum array.
 */
export function findIndexAtOffset(sums: Float64Array, count: number, scrollTop: number): number {
	if (count === 0) return 0;
	if (scrollTop <= 0) return 0;
	const total = sums[count]!;
	if (scrollTop >= total) return Math.max(0, count - 1);

	let lo = 0;
	let hi = count - 1;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (sums[mid + 1]! <= scrollTop) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	return lo;
}

/**
 * Compute visible range [start, end) with overscan.
 */
export function computeVisibleRange(
	sums: Float64Array,
	count: number,
	scrollTop: number,
	viewportHeight: number,
	overscan: number,
): { start: number; end: number } {
	if (count === 0) return { start: 0, end: 0 };

	const firstVisible = findIndexAtOffset(sums, count, scrollTop);
	const lastVisible = findIndexAtOffset(sums, count, scrollTop + viewportHeight);

	const start = Math.max(0, firstVisible - overscan);
	const end = Math.min(count, lastVisible + 1 + overscan);

	return { start, end };
}
