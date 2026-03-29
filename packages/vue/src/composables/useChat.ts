import { createChat } from "@preflow/core";
import type { FlowItem, ScrollCorrection } from "@preflow/core";
import { type Ref, type ShallowRef, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";

export interface UseChatOptions {
	count: Ref<number> | number;
	getHeight: (index: number) => number;
	overscan?: number;
}

export interface UseChatReturn {
	containerRef: Ref<HTMLElement | null>;
	items: ShallowRef<FlowItem[]>;
	totalHeight: Ref<number>;
	scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
	scrollToEnd: () => void;
	append: (count: number) => void;
	prepend: (count: number) => ScrollCorrection;
}

export function useChat(options: UseChatOptions): UseChatReturn {
	const containerRef = ref<HTMLElement | null>(null);
	const items = shallowRef<FlowItem[]>([]);
	const totalHeight = ref(0);

	const count = typeof options.count === "number" ? ref(options.count) : options.count;

	const chat = createChat({
		count: count.value,
		getHeight: options.getHeight,
		overscan: options.overscan,
	});

	totalHeight.value = chat.totalHeight;

	function updateItems() {
		items.value = chat.getItems();
		totalHeight.value = chat.totalHeight;
	}

	watch(count, (newCount) => {
		chat.setCount(newCount);
		updateItems();
	});

	let resizeObserver: ResizeObserver | null = null;

	function onScroll() {
		const el = containerRef.value;
		if (!el) return;
		if (chat.setViewport(el.scrollTop, el.clientHeight)) {
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
			chat.setContainerWidth(el.clientWidth);
			chat.setViewport(el.scrollTop, el.clientHeight);
			updateItems();
		});
		resizeObserver.observe(el);

		chat.setViewport(el.scrollTop, el.clientHeight);
		updateItems();
	});

	onUnmounted(() => {
		const el = containerRef.value;
		if (el) el.removeEventListener("scroll", onScroll);
		resizeObserver?.disconnect();
	});

	function scrollToIndex(index: number, align?: "start" | "center" | "end") {
		const offset = chat.scrollToIndex(index, align);
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	function scrollToEnd() {
		const offset = chat.scrollToEnd();
		if (containerRef.value) containerRef.value.scrollTop = offset;
	}

	function append(appendCount: number) {
		chat.append(appendCount);
		updateItems();
	}

	function prepend(prependCount: number): ScrollCorrection {
		const correction = chat.prepend(prependCount);
		if (containerRef.value) {
			containerRef.value.scrollTop += correction.offset;
		}
		updateItems();
		return correction;
	}

	return { containerRef, items, totalHeight, scrollToIndex, scrollToEnd, append, prepend };
}
