import { useFlow } from "@preflow/react";
import { useState, useCallback, useRef, useEffect } from "react";

interface Post {
	id: number;
	author: string;
	handle: string;
	avatar: string;
	text: string;
	hasImage: boolean;
	imageHeight: number;
	imageHue: number;
	likes: number;
	reposts: number;
	replies: number;
	views: number;
	time: string;
	verified: boolean;
}

const authors = [
	{ name: "Sarah Chen", handle: "sarahdev", verified: true },
	{ name: "Alex Rivera", handle: "alexbuilds", verified: false },
	{ name: "Jordan Kim", handle: "jk_codes", verified: true },
	{ name: "Morgan Bailey", handle: "morganb", verified: false },
	{ name: "Casey Zhang", handle: "caseyzhang", verified: true },
	{ name: "Riley Patel", handle: "rileyp", verified: false },
	{ name: "Taylor Brooks", handle: "tbrooks_dev", verified: true },
	{ name: "Jamie Lee", handle: "jamielee", verified: false },
	{ name: "Quinn Murphy", handle: "quinnmurphy", verified: false },
	{ name: "Avery Wu", handle: "averywu", verified: true },
];

const tweets = [
	"Just shipped a new feature! The virtualized list can now handle 100k items with butter-smooth scrolling.",
	"Hot take: prefix-sum arrays are the most underrated data structure in frontend development.",
	"Working on a new approach to text virtualization. Instead of measuring DOM elements, we calculate heights from font metrics. 450x faster.",
	"Today I learned that Float64Array gives you better cache locality than regular arrays for sequential access patterns. Mind blown.",
	"The new masonry layout engine uses a shortest-column greedy algorithm. Simple but effective.",
	"Debugging a scroll correction issue with prepend. The trick is to add the correction BEFORE React re-renders.",
	"Anyone else find it wild that content-visibility: auto breaks at ~2000 items? We need better browser primitives.",
	"Just benchmarked the chat virtualizer: 10k messages, instant scrollToEnd, zero jank. Pretty happy with this.",
	"Thread: why we chose bun over node for the monorepo, and how biome replaced both eslint AND prettier for us (1/n)",
	"Quick poll: do you prefer hooks or composables for your virtualizer API?",
	"The prose engine can virtualize individual LINES within paragraphs. No other library does this. Each line is independently positioned.",
	"Shoutout to the pretext library for making arithmetic-only text measurement possible. layout() returns in 0.0002ms.",
	"TIL: O(1) offset lookup + O(log n) binary search for scroll position = prefix sum arrays. Beautiful algorithm.",
	"Weekend project: added bidirectional infinite scroll to the chat example. Prepend correction keeps your reading position stable.",
	"Release day! v0.1.0 of the virtualization engine is out. 311 tests, 4 packages, zero DOM dependencies in the core.",
	"The key insight: if you know the font metrics, you can predict text height without rendering. This changes everything for virtualizers.",
	"Interesting edge case: when all items have exactly the same height, scrollToIndex simplifies to index * height. Our code handles both paths.",
	"React 19 + our useFlow hook = 3 lines to get a fully virtualized list. const { containerRef, items, totalHeight } = useFlow({ count, getHeight })",
];

const times = [
	"2m", "5m", "12m", "23m", "45m", "1h", "2h", "3h", "5h",
	"8h", "12h", "16h", "1d", "2d", "3d", "5d", "1w", "2w",
];

function generatePost(id: number): Post {
	const authorIdx = (id * 7 + 3) % authors.length;
	const author = authors[authorIdx]!;
	const text = tweets[id % tweets.length]!;
	const hasImage = id % 3 === 0;
	const imageHeight = hasImage ? 180 + ((id * 127) % 120) : 0;
	const imageHue = (id * 67 + 200) % 360;

	return {
		id,
		author: author.name,
		handle: author.handle,
		avatar: `hsl(${(id * 97 + 30) % 360}, 65%, 55%)`,
		text,
		hasImage,
		imageHeight,
		imageHue,
		likes: (id * 7919 + 31) % 2000,
		reposts: (id * 4391 + 17) % 500,
		replies: (id * 2731 + 7) % 200,
		views: (id * 13397 + 41) % 50000 + 1000,
		time: times[id % times.length]!,
		verified: author.verified,
	};
}

// All CSS uses deterministic px values (no relative line-heights):
//   .tweet padding: 16px top + 12px bottom = 28px
//   .tweet-header: height 40px + margin-bottom 8px = 48px
//   .tweet-text: line-height 20px (exact), overflow hidden
//   .tweet-image: explicit height + margin-top 12px
//   .tweet-footer: height 24px + padding-top 8px (content-box) = 32px
//   .tweet border-bottom: 1px
//
// Total = 28 + 48 + textH + imgH + 32 + 1 = 109 + textH + imgH
//
// textH = textLines * 20
// textLines depends on container width → measured via canvas for exact char widths

// Shared canvas for text measurement (much faster than DOM)
let measureCanvas: CanvasRenderingContext2D | null = null;
function getTextWidth(text: string): number {
	if (!measureCanvas) {
		const c = document.createElement("canvas");
		measureCanvas = c.getContext("2d")!;
		// Must match .tweet-text CSS exactly
		measureCanvas.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
	}
	return measureCanvas.measureText(text).width;
}

function postHeight(post: Post, contentWidth: number): number {
	// Exact text width via canvas — no guessing chars-per-line
	const textAvailWidth = contentWidth - 32; // .tweet horizontal padding: 16+16
	const fullTextWidth = getTextWidth(post.text);
	const textLines = Math.max(1, Math.ceil(fullTextWidth / textAvailWidth));
	const textH = textLines * 20; // line-height: 20px (exact px in CSS)
	const imgH = post.hasImage ? post.imageHeight + 12 : 0;
	// 28 (padding) + 48 (header) + textH + imgH + 32 (footer) + 1 (border)
	return 109 + textH + imgH;
}

function formatNum(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
	return String(n);
}

const PAGE_SIZE = 25;

export function FeedExample() {
	const postsRef = useRef<Post[]>(
		Array.from({ length: PAGE_SIZE * 2 }, (_, i) => generatePost(i)),
	);
	const [postCount, setPostCount] = useState(postsRef.current.length);
	const [loading, setLoading] = useState(false);
	const scrollRef = useRef<HTMLElement | null>(null);
	// Track container width for accurate height calculation
	const widthRef = useRef(800);

	const getHeight = useCallback(
		(i: number) => {
			const p = postsRef.current[i];
			return p ? postHeight(p, widthRef.current) : 100;
		},
		[],
	);

	const { containerRef, items, totalHeight, scrollToIndex, scrollToEnd } =
		useFlow({
			count: postCount,
			getHeight,
			overscan: 5,
		});

	const combinedRef = useCallback(
		(el: HTMLElement | null) => {
			scrollRef.current = el;
			if (el) widthRef.current = el.clientWidth;
			containerRef(el);
		},
		[containerRef],
	);

	// Track width changes
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				widthRef.current = entry.contentRect.width;
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// Infinite scroll
	const handleScroll = useCallback(() => {
		if (loading) return;
		const el = scrollRef.current;
		if (!el) return;
		const nearBottom =
			el.scrollTop + el.clientHeight >= el.scrollHeight - 500;
		if (nearBottom) {
			setLoading(true);
			setTimeout(() => {
				const start = postsRef.current.length;
				const newPosts = Array.from(
					{ length: PAGE_SIZE },
					(_, i) => generatePost(start + i),
				);
				postsRef.current = [...postsRef.current, ...newPosts];
				setPostCount(postsRef.current.length);
				setLoading(false);
			}, 600);
		}
	}, [loading]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Social Feed</h3>
				<p>
					Heights calculated with canvas.measureText for exact text
					width + deterministic px CSS. No DOM measurement, no
					guessing chars-per-line. Works at any resolution.
				</p>
				<div className="example-actions">
					<button onClick={() => scrollToIndex(0)}>
						Back to Top
					</button>
					<button
						onClick={() =>
							scrollToIndex(
								Math.floor(Math.random() * postCount),
								"center",
							)
						}
					>
						Random Post
					</button>
					<button onClick={() => scrollToEnd()}>Latest</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Posts</span>
						<span>{postCount}</span>
					</div>
					<div>
						<span>Visible</span>
						<span>{items.length}</span>
					</div>
					<div>
						<span>Total height</span>
						<span>
							{Math.round(totalHeight).toLocaleString()}px
						</span>
					</div>
					<div>
						<span>Width</span>
						<span>{widthRef.current}px</span>
					</div>
					<div>
						<span>Range</span>
						<span>
							{items[0]?.index ?? 0} -{" "}
							{items[items.length - 1]?.index ?? 0}
						</span>
					</div>
				</div>
				{loading && (
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
						Loading more posts...
					</div>
				)}
			</div>
			<div
				className="example-viewport feed-viewport"
				ref={combinedRef}
				style={{ background: "var(--bg)" }}
			>
				<div style={{ height: totalHeight, position: "relative" }}>
					{items.map((item) => {
						const post = postsRef.current[item.index];
						if (!post) return null;
						return (
							<div
								key={item.index}
								style={{
									position: "absolute",
									top: item.y,
									left: 0,
									right: 0,
									height: item.height,
								}}
							>
								<div className="tweet">
									<div className="tweet-header">
										<div
											className="tweet-avatar"
											style={{ background: post.avatar }}
										>
											{post.author[0]}
										</div>
										<div className="tweet-meta">
											<span className="tweet-author">
												{post.author}
												{post.verified && (
													<span className="tweet-verified" title="Verified">
														&#10003;
													</span>
												)}
											</span>
											<span className="tweet-handle">
												@{post.handle}
											</span>
											<span className="tweet-dot">
												&middot;
											</span>
											<span className="tweet-time">
												{post.time}
											</span>
										</div>
									</div>
									<div className="tweet-text">
										{post.text}
									</div>
									{post.hasImage && (
										<div
											className="tweet-image"
											style={{
												height: post.imageHeight,
												background: `linear-gradient(135deg, hsl(${post.imageHue}, 50%, 40%), hsl(${(post.imageHue + 60) % 360}, 60%, 30%))`,
											}}
										>
											<div className="tweet-image-label">
												{post.imageHeight}px image
											</div>
										</div>
									)}
									<div className="tweet-footer">
										<span className="tweet-action">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
												<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
											</svg>
											{formatNum(post.replies)}
										</span>
										<span className="tweet-action">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
												<path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
												<path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
											</svg>
											{formatNum(post.reposts)}
										</span>
										<span className="tweet-action">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
												<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
											</svg>
											{formatNum(post.likes)}
										</span>
										<span className="tweet-action">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
												<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
												<circle cx="12" cy="12" r="3" />
											</svg>
											{formatNum(post.views)}
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
