import { createMasonry } from "@preflow/core";
import type { FlowItem } from "@preflow/core";
import { type Ref, type ShallowRef, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";

export interface UseMasonryOptions {
	count: Ref<number> | number;
	columns: number;
	columnWidth: number;
	gap?: number;
	getHeight: (index: number) => number;
	overscan?: number;
}

export interface UseMasonryReturn {
	containerRef: Ref<HTMLElement | null>;
	items: ShallowRef<FlowItem[]>;
	totalHeight: Ref<number>;
	scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
	scrollToEnd: () => void;
}

export function useMasonry(options: UseMasonryOptions): UseMasonryReturn {
	const containerRef = ref<HTMLElement | null>(null);
	const items = shallowRef<FlowItem[]>([]);
	const totalHeight = ref(0);

	const count = typeof options.count === "number" ? ref(options.count) : options.count;

	const masonry = createMasonry({
		count: count.value,
		columns: options.columns,
		columnWidth: options.columnWidth,
		gap: options.gap,
		getHeight: options.getHeight,
		overscan: options.overscan,
	});

	totalHeight.value = masonry.totalHeight;

	function updateItems() {
		items.value = masonry.getItems();
		totalHeight.value = masonry.totalHeight;
	}

	watch(count, (newCount) => {
		masonry.setCount(newCount);
		updateItems();
	});

	let resizeObserver: ResizeObserver | null = null;

	function onScroll() {
		const el = containerRef.value;
		if (!el) return;
		if (masonry.setViewport(el.scrollTop, el.clientHeight)) {
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
			masonry.setContainerWidth(el.clientWidth);
			masonry.setViewport(el.scrollTop, el.clientHeight);
			updateItems();
		});
		resizeObserver.observe(el);

		masonry.setViewport(el.scrollTop, el.clientHeight);
		updateItems();
	});

	onUnmounted(() => {
		const el = containerRef.value;
		if (el) el.removeEventListener("scroll", onScroll);
		resizeObserver?.disconnect();
	});

	function scrollToIndex(index: number, align?: "start" | "center" | "end") {
		const offset = masonry.scrollToIndex(index, align);
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	function scrollToEnd() {
		const offset = masonry.scrollToEnd();
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	return { containerRef, items, totalHeight, scrollToIndex, scrollToEnd };
}
