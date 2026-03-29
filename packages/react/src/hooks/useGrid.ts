import { createGrid } from "@preflow/core";
import type { FlowItem } from "@preflow/core";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseGridOptions {
	count: number;
	columns: number;
	columnWidth: number;
	gap?: number;
	getHeight: (index: number) => number;
	overscan?: number;
}

export interface UseGridResult {
	containerRef: React.RefCallback<HTMLElement>;
	items: FlowItem[];
	totalHeight: number;
	scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
	scrollToEnd: () => void;
}

export function useGrid(options: UseGridOptions): UseGridResult {
	const { count, columns, columnWidth, gap, getHeight, overscan } = options;
	const [, rerender] = useState(0);
	const flowRef = useRef<ReturnType<typeof createGrid> | null>(null);
	const containerElRef = useRef<HTMLElement | null>(null);
	const cleanupRef = useRef<(() => void) | null>(null);
	const getHeightRef = useRef(getHeight);
	getHeightRef.current = getHeight;

	// Recreate when grid config changes
	const configRef = useRef({ columns, columnWidth, gap, overscan });
	const configChanged =
		configRef.current.columns !== columns ||
		configRef.current.columnWidth !== columnWidth ||
		configRef.current.gap !== gap ||
		configRef.current.overscan !== overscan;

	if (flowRef.current === null || configChanged) {
		configRef.current = { columns, columnWidth, gap, overscan };
		flowRef.current = createGrid({
			count,
			columns,
			columnWidth,
			gap,
			getHeight: (i) => getHeightRef.current(i),
			overscan,
		});
	}

	const flow = flowRef.current;

	useEffect(() => {
		flow.setCount(count);
		rerender((c) => c + 1);
	}, [flow, count]);

	const containerRef = useCallback(
		(el: HTMLElement | null) => {
			if (cleanupRef.current) {
				cleanupRef.current();
				cleanupRef.current = null;
			}

			containerElRef.current = el;

			if (!el) return;

			const onScroll = () => {
				if (flow.setViewport(el.scrollTop, el.clientHeight)) {
					rerender((c) => c + 1);
				}
			};

			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					flow.setContainerWidth(entry.contentRect.width);
				}
				flow.setViewport(el.scrollTop, el.clientHeight);
				rerender((c) => c + 1);
			});

			el.addEventListener("scroll", onScroll, { passive: true });
			observer.observe(el);

			flow.setContainerWidth(el.clientWidth);
			flow.setViewport(el.scrollTop, el.clientHeight);
			rerender((c) => c + 1);

			cleanupRef.current = () => {
				el.removeEventListener("scroll", onScroll);
				observer.disconnect();
			};
		},
		[flow],
	);

	useEffect(() => {
		return () => {
			if (cleanupRef.current) {
				cleanupRef.current();
				cleanupRef.current = null;
			}
		};
	}, []);

	const scrollToIndex = useCallback(
		(index: number, align?: "start" | "center" | "end") => {
			const offset = flow.scrollToIndex(index, align);
			if (containerElRef.current) {
				containerElRef.current.scrollTop = offset;
			}
		},
		[flow],
	);

	const scrollToEnd = useCallback(() => {
		const offset = flow.scrollToEnd();
		if (containerElRef.current) {
			containerElRef.current.scrollTop = offset;
		}
	}, [flow]);

	return {
		containerRef,
		items: flow.getItems(),
		totalHeight: flow.totalHeight,
		scrollToIndex,
		scrollToEnd,
	};
}
