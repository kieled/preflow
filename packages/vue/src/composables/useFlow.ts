import { createFlow } from "@preflow/core";
import type { FlowItem } from "@preflow/core";
import { type Ref, type ShallowRef, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";

export interface UseFlowOptions {
	count: Ref<number> | number;
	getHeight: (index: number) => number;
	overscan?: number;
}

export interface UseFlowReturn {
	containerRef: Ref<HTMLElement | null>;
	items: ShallowRef<FlowItem[]>;
	totalHeight: Ref<number>;
	scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
	scrollToEnd: () => void;
}

export function useFlow(options: UseFlowOptions): UseFlowReturn {
	const containerRef = ref<HTMLElement | null>(null);
	const items = shallowRef<FlowItem[]>([]);
	const totalHeight = ref(0);

	const count = typeof options.count === "number" ? ref(options.count) : options.count;

	const flow = createFlow({
		count: count.value,
		getHeight: options.getHeight,
		overscan: options.overscan,
	});

	totalHeight.value = flow.totalHeight;

	function updateItems() {
		items.value = flow.getItems();
		totalHeight.value = flow.totalHeight;
	}

	// Watch count changes
	watch(count, (newCount) => {
		flow.setCount(newCount);
		updateItems();
	});

	let resizeObserver: ResizeObserver | null = null;

	function onScroll() {
		const el = containerRef.value;
		if (!el) return;
		if (flow.setViewport(el.scrollTop, el.clientHeight)) {
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
			flow.setContainerWidth(el.clientWidth);
			flow.setViewport(el.scrollTop, el.clientHeight);
			updateItems();
		});
		resizeObserver.observe(el);

		flow.setViewport(el.scrollTop, el.clientHeight);
		updateItems();
	});

	onUnmounted(() => {
		const el = containerRef.value;
		if (el) el.removeEventListener("scroll", onScroll);
		resizeObserver?.disconnect();
	});

	function scrollToIndex(index: number, align?: "start" | "center" | "end") {
		const offset = flow.scrollToIndex(index, align);
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	function scrollToEnd() {
		const offset = flow.scrollToEnd();
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	return { containerRef, items, totalHeight, scrollToIndex, scrollToEnd };
}
