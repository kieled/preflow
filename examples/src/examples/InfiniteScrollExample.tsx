import { createFlow } from "@preflow/core";
import type { FlowItem } from "@preflow/core";
import { useState, useRef, useCallback, useEffect } from "react";

// Simulate a feed with pages of items
interface FeedItem {
	id: number;
	title: string;
	body: string;
	author: string;
	likes: number;
	height: number;
}

const adjectives = [
	"Quick", "Lazy", "Happy", "Sad", "Bright", "Dark", "Fast",
	"Slow", "Big", "Small", "New", "Old", "Hot", "Cold",
];
const nouns = [
	"fox", "dog", "cat", "bird", "fish", "tree", "river",
	"mountain", "cloud", "star", "moon", "sun", "wave", "wind",
];
const bodies = [
	"This is a short post.",
	"Here's a medium-length post with a bit more content to read through and think about carefully.",
	"A very brief update.",
	"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisi vel consectetur interdum, nisl nisi aliquet nunc, eget aliquam nisl nisi eu nisi. Sed euismod, nisi vel consectetur interdum.",
	"Just sharing some thoughts on the latest developments in virtualization technology and how prefix-sum arrays make everything O(1).",
	"TL;DR: it works.",
	"Interesting finding today: content-visibility: auto breaks down at around 2000 items and is incompatible with position: absolute. So we need a proper virtualizer.",
	"Another day, another deploy.",
	"Big announcement coming soon! Stay tuned for updates on the new preflow library that handles flow, grid, masonry, and chat virtualization with zero DOM measurement.",
	"Quick question: has anyone tried using Float64Array for prefix sums? The cache locality is incredible for sequential access patterns.",
];

function generateItem(id: number): FeedItem {
	const adj = adjectives[((id * 7) + 3) % adjectives.length]!;
	const noun = nouns[((id * 13) + 7) % nouns.length]!;
	const body = bodies[id % bodies.length]!;
	const lines = Math.ceil(body.length / 60) || 1;
	// Header: 44px, body: lines*20px, footer: 32px, padding: 32px, gaps: 16px
	const height = 44 + lines * 20 + 32 + 32 + 16;
	return {
		id,
		title: `${adj} ${noun} #${id}`,
		body,
		author: `user_${(id * 31) % 100}`,
		likes: (id * 7919) % 500,
		height,
	};
}

function seededColor(id: number): string {
	const hue = (id * 67 + 120) % 360;
	return `hsl(${hue}, 45%, 80%)`;
}

const PAGE_SIZE = 30;

export function InfiniteScrollExample() {
	const [items, setItems] = useState<FeedItem[]>(() =>
		Array.from({ length: PAGE_SIZE }, (_, i) => generateItem(i)),
	);
	const [loading, setLoading] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [oldestId, setOldestId] = useState(0);
	const [newestId, setNewestId] = useState(PAGE_SIZE - 1);
	const itemsRef = useRef(items);
	itemsRef.current = items;

	const containerRef = useRef<HTMLDivElement | null>(null);
	const flowRef = useRef<ReturnType<typeof createFlow> | null>(null);
	const [visibleItems, setVisibleItems] = useState<FlowItem[]>([]);
	const [totalHeight, setTotalHeight] = useState(0);

	// Initialize flow
	useEffect(() => {
		flowRef.current = createFlow({
			count: items.length,
			getHeight: (i) => itemsRef.current[i]?.height ?? 80,
			overscan: 5,
		});
		const el = containerRef.current;
		if (el) {
			flowRef.current.setViewport(el.scrollTop, el.clientHeight);
		}
		setVisibleItems(flowRef.current.getItems());
		setTotalHeight(flowRef.current.totalHeight);
	}, []); // eslint-disable-line

	const sync = useCallback(() => {
		const flow = flowRef.current;
		if (!flow) return;
		setVisibleItems(flow.getItems());
		setTotalHeight(flow.totalHeight);
	}, []);

	// Scroll handler with infinite scroll detection
	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		const flow = flowRef.current;
		if (!el || !flow) return;

		if (flow.setViewport(el.scrollTop, el.clientHeight)) {
			sync();
		}

		// Load more at bottom
		const nearBottom =
			el.scrollTop + el.clientHeight >= el.scrollHeight - 400;
		if (nearBottom && !loading) {
			setLoading(true);
			setTimeout(() => {
				const newItems = Array.from(
					{ length: PAGE_SIZE },
					(_, i) => generateItem(newestId + 1 + i),
				);
				itemsRef.current = [...itemsRef.current, ...newItems];
				setItems(itemsRef.current);
				setNewestId((id) => id + PAGE_SIZE);
				flow.append(PAGE_SIZE);
				sync();
				setLoading(false);
			}, 500);
		}

		// Load older at top
		const nearTop = el.scrollTop <= 200;
		if (nearTop && !loadingOlder && oldestId > -500) {
			setLoadingOlder(true);
			setTimeout(() => {
				const newOldestId = oldestId - PAGE_SIZE;
				const olderItems = Array.from(
					{ length: PAGE_SIZE },
					(_, i) => generateItem(newOldestId + i),
				);
				itemsRef.current = [...olderItems, ...itemsRef.current];
				setItems(itemsRef.current);
				setOldestId(newOldestId);
				const correction = flow.prepend(PAGE_SIZE);
				if (el) {
					el.scrollTop += correction.offset;
				}
				sync();
				setLoadingOlder(false);
			}, 500);
		}
	}, [sync, loading, loadingOlder, newestId, oldestId]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver(() => {
			const flow = flowRef.current;
			if (!flow) return;
			flow.setContainerWidth(el.clientWidth);
			if (flow.setViewport(el.scrollTop, el.clientHeight)) {
				sync();
			}
		});

		el.addEventListener("scroll", handleScroll, { passive: true });
		observer.observe(el);

		// Initial sync
		const flow = flowRef.current;
		if (flow) {
			flow.setViewport(el.scrollTop, el.clientHeight);
			sync();
		}

		return () => {
			el.removeEventListener("scroll", handleScroll);
			observer.disconnect();
		};
	}, [handleScroll, sync]);

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Infinite Feed</h3>
				<p>
					Bidirectional infinite scroll using @preflow/core directly.
					Scroll down to load newer posts, scroll to top to load
					older ones. Prepend uses scroll correction to maintain
					position.
				</p>
				<div className="example-stats">
					<div>
						<span>Loaded items</span>
						<span>{items.length}</span>
					</div>
					<div>
						<span>Visible</span>
						<span>{visibleItems.length}</span>
					</div>
					<div>
						<span>Total height</span>
						<span>
							{Math.round(totalHeight).toLocaleString()}px
						</span>
					</div>
					<div>
						<span>ID range</span>
						<span>
							{oldestId} to {newestId}
						</span>
					</div>
					<div>
						<span>Range</span>
						<span>
							{visibleItems[0]?.index ?? 0} -{" "}
							{visibleItems[visibleItems.length - 1]?.index ?? 0}
						</span>
					</div>
				</div>
				{(loading || loadingOlder) && (
					<div
						style={{
							marginTop: 12,
							padding: "8px 12px",
							background: "var(--surface-2)",
							borderRadius: 6,
							fontSize: 12,
							color: "var(--accent)",
						}}
					>
						{loadingOlder
							? "Loading older posts..."
							: "Loading newer posts..."}
					</div>
				)}
				<div className="example-actions" style={{ marginTop: 16 }}>
					<button
						onClick={() => {
							const el = containerRef.current;
							if (el) el.scrollTop = 0;
						}}
					>
						Scroll to Top
					</button>
					<button
						onClick={() => {
							const flow = flowRef.current;
							const el = containerRef.current;
							if (flow && el) {
								el.scrollTop = flow.scrollToEnd();
							}
						}}
					>
						Scroll to End
					</button>
				</div>
			</div>
			<div className="example-viewport" ref={containerRef}>
				<div style={{ height: totalHeight, position: "relative" }}>
					{loadingOlder && (
						<div
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								height: 40,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 12,
								color: "var(--text-dim)",
							}}
						>
							Loading older...
						</div>
					)}
					{visibleItems.map((item) => {
						const feed = itemsRef.current[item.index];
						if (!feed) return null;
						return (
							<div
								key={item.index}
								style={{
									position: "absolute",
									top: item.y,
									left: 0,
									right: 0,
									height: item.height,
									padding: "8px 16px",
								}}
							>
								<div
									className="feed-card"
									style={{
										background: "var(--surface-2)",
										borderRadius: 8,
										padding: 16,
										height: "100%",
										borderLeft: `3px solid ${seededColor(feed.id)}`,
										display: "flex",
										flexDirection: "column",
										gap: 8,
									}}
								>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
										}}
									>
										<div>
											<span
												style={{
													fontWeight: 600,
													fontSize: 14,
												}}
											>
												{feed.title}
											</span>
											<span
												style={{
													marginLeft: 8,
													fontSize: 11,
													color: "var(--text-dim)",
												}}
											>
												by {feed.author}
											</span>
										</div>
										<span
											style={{
												fontSize: 11,
												color: "var(--text-dim)",
											}}
										>
											idx:{item.index}
										</span>
									</div>
									<div
										style={{
											fontSize: 13,
											lineHeight: 1.5,
											color: "var(--text-dim)",
											flex: 1,
										}}
									>
										{feed.body}
									</div>
									<div
										style={{
											fontSize: 11,
											color: "var(--text-dim)",
											display: "flex",
											gap: 16,
										}}
									>
										<span>{feed.likes} likes</span>
										<span>id: {feed.id}</span>
									</div>
								</div>
							</div>
						);
					})}
					{loading && (
						<div
							style={{
								position: "absolute",
								bottom: 0,
								left: 0,
								right: 0,
								height: 40,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 12,
								color: "var(--text-dim)",
							}}
						>
							Loading more...
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
