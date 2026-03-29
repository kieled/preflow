import { createGrid } from "@preflow/core";
import type { FlowItem } from "@preflow/core";
import { type Ref, type ShallowRef, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";

export interface UseGridOptions {
	count: Ref<number> | number;
	columns: number;
	columnWidth: number;
	gap?: number;
	getHeight: (index: number) => number;
	overscan?: number;
}

export interface UseGridReturn {
	containerRef: Ref<HTMLElement | null>;
	items: ShallowRef<FlowItem[]>;
	totalHeight: Ref<number>;
	scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
	scrollToEnd: () => void;
}

export function useGrid(options: UseGridOptions): UseGridReturn {
	const containerRef = ref<HTMLElement | null>(null);
	const items = shallowRef<FlowItem[]>([]);
	const totalHeight = ref(0);

	const count = typeof options.count === "number" ? ref(options.count) : options.count;

	const grid = createGrid({
		count: count.value,
		columns: options.columns,
		columnWidth: options.columnWidth,
		gap: options.gap,
		getHeight: options.getHeight,
		overscan: options.overscan,
	});

	totalHeight.value = grid.totalHeight;

	function updateItems() {
		items.value = grid.getItems();
		totalHeight.value = grid.totalHeight;
	}

	watch(count, (newCount) => {
		grid.setCount(newCount);
		updateItems();
	});

	let resizeObserver: ResizeObserver | null = null;

	function onScroll() {
		const el = containerRef.value;
		if (!el) return;
		if (grid.setViewport(el.scrollTop, el.clientHeight)) {
			updateItems();
		}
	}

	onMounted(() => {
		const el = containerRef.value;
		if (!el) return;

		el.addEventListener("scroll", onScroll, { passive: true });

		resizeObserver = new ResizeObserver(() => {
			const el = containerRef.value;
			if (!el) return;
			grid.setContainerWidth(el.clientWidth);
			grid.setViewport(el.scrollTop, el.clientHeight);
			updateItems();
		});
		resizeObserver.observe(el);

		grid.setViewport(el.scrollTop, el.clientHeight);
		updateItems();
	});

	onUnmounted(() => {
		const el = containerRef.value;
		if (el) el.removeEventListener("scroll", onScroll);
		resizeObserver?.disconnect();
	});

	function scrollToIndex(index: number, align?: "start" | "center" | "end") {
		const offset = grid.scrollToIndex(index, align);
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	function scrollToEnd() {
		const offset = grid.scrollToEnd();
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	return { containerRef, items, totalHeight, scrollToIndex, scrollToEnd };
}
