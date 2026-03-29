import { createFlow } from "@preflow/core";
import type { FlowItem } from "@preflow/core";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseFlowOptions {
	count: number;
	getHeight: (index: number) => number;
	overscan?: number;
	/** Use window scroll instead of container scroll. */
	windowScroll?: boolean;
}

export interface UseFlowResult {
	containerRef: React.RefCallback<HTMLElement>;
	items: FlowItem[];
	totalHeight: number;
	scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
	scrollToEnd: () => void;
}

export function useFlow(options: UseFlowOptions): UseFlowResult {
	const { count, getHeight, overscan, windowScroll } = options;
	const [, rerender] = useState(0);
	const flowRef = useRef<ReturnType<typeof createFlow> | null>(null);
	const containerElRef = useRef<HTMLElement | null>(null);
	const cleanupRef = useRef<(() => void) | null>(null);
	const getHeightRef = useRef(getHeight);
	getHeightRef.current = getHeight;

	const overscanRef = useRef(overscan);
	if (flowRef.current === null || overscanRef.current !== overscan) {
		overscanRef.current = overscan;
		flowRef.current = createFlow({
			count,
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

			if (windowScroll) {
				const onScroll = () => {
					const rect = el.getBoundingClientRect();
					const scrollTop = Math.max(0, -rect.top);
					const viewportHeight = window.innerHeight;
					if (flow.setViewport(scrollTop, viewportHeight)) {
						rerender((c) => c + 1);
					}
				};

				const observer = new ResizeObserver((entries) => {
					for (const entry of entries) {
						flow.setContainerWidth(entry.contentRect.width);
					}
					// Always re-render after width change — heights/positions changed
					// even if the visible range is the same
					rerender((c) => c + 1);
				});

				window.addEventListener("scroll", onScroll, { passive: true });
				window.addEventListener("resize", onScroll, { passive: true });
				observer.observe(el);

				// Synchronous initial width + viewport before first paint
				flow.setContainerWidth(el.clientWidth);
				onScroll();

				cleanupRef.current = () => {
					window.removeEventListener("scroll", onScroll);
					window.removeEventListener("resize", onScroll);
					observer.disconnect();
				};
			} else {
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

				// Synchronous initial width + viewport before first paint
				flow.setContainerWidth(el.clientWidth);
				flow.setViewport(el.scrollTop, el.clientHeight);
				rerender((c) => c + 1);

				cleanupRef.current = () => {
					el.removeEventListener("scroll", onScroll);
					observer.disconnect();
				};
			}
		},
		[flow, windowScroll],
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
			if (windowScroll) {
				const el = containerElRef.current;
				if (el) {
					const elTop = el.getBoundingClientRect().top + window.scrollY;
					window.scrollTo({ top: elTop + offset, behavior: "auto" });
				}
			} else if (containerElRef.current) {
				containerElRef.current.scrollTop = offset;
			}
		},
		[flow, windowScroll],
	);

	const scrollToEnd = useCallback(() => {
		const offset = flow.scrollToEnd();
		if (windowScroll) {
			const el = containerElRef.current;
			if (el) {
				const elTop = el.getBoundingClientRect().top + window.scrollY;
				window.scrollTo({ top: elTop + offset, behavior: "auto" });
			}
		} else if (containerElRef.current) {
			containerElRef.current.scrollTop = offset;
		}
	}, [flow, windowScroll]);

	return {
		containerRef,
		items: flow.getItems(),
		totalHeight: flow.totalHeight,
		scrollToIndex,
		scrollToEnd,
	};
}
