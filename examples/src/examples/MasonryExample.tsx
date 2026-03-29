import { useMasonry } from "@preflow/react";
import { useState, useCallback, useRef, useEffect } from "react";

function seededHeight(index: number): number {
	return 80 + ((index * 13397 + 52711) % 271);
}

function seededColor(index: number): string {
	const hue = (index * 47 + 180) % 360;
	return `hsl(${hue}, 55%, 75%)`;
}

const descriptions = [
	"A beautiful sunset over the mountains with golden light streaming through the clouds.",
	"Abstract art composition.",
	"Urban architecture in downtown.",
	"Macro photography of morning dew on a spider web, each droplet reflecting the surrounding garden.",
	"Minimalist design.",
	"Nature trail winding through an ancient redwood forest, sunbeams filtering through the canopy.",
	"Portrait study.",
	"Coastal landscape with dramatic cliffs, crashing waves, and a lighthouse in the distance standing guard.",
	"Digital illustration exploring themes of technology and humanity in the modern age.",
	"Still life with flowers.",
];

export function MasonryExample() {
	const [count, setCount] = useState(100);
	const [columns, setColumns] = useState(4);
	const [gap, setGap] = useState(12);
	const [overscan, setOverscan] = useState(3);
	const [loading, setLoading] = useState(false);
	const [infiniteScroll, setInfiniteScroll] = useState(true);
	const columnWidth = 220;
	const scrollRef = useRef<HTMLElement | null>(null);

	const getHeight = useCallback((i: number) => seededHeight(i), []);

	const { containerRef, items, totalHeight, scrollToIndex, scrollToEnd } =
		useMasonry({
			count,
			columns,
			columnWidth,
			gap,
			getHeight,
			overscan,
		});

	const combinedRef = useCallback(
		(el: HTMLElement | null) => {
			scrollRef.current = el;
			containerRef(el);
		},
		[containerRef],
	);

	// Infinite scroll
	const handleScroll = useCallback(() => {
		if (!infiniteScroll || loading) return;
		const el = scrollRef.current;
		if (!el) return;
		const nearBottom =
			el.scrollTop + el.clientHeight >= el.scrollHeight - 400;
		if (nearBottom && count < 20000) {
			setLoading(true);
			setTimeout(() => {
				setCount((c) => Math.min(c + 40, 20000));
				setLoading(false);
			}, 400);
		}
	}, [infiniteScroll, loading, count]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Masonry</h3>
				<p>
					Pinterest-style layout using shortest-column greedy
					placement. Scroll down to auto-load more cards.
				</p>
				<label>
					Items:{" "}
					<input
						type="range"
						min={20}
						max={20000}
						value={count}
						onChange={(e) => setCount(+e.target.value)}
					/>
					<span>{count.toLocaleString()}</span>
				</label>
				<label>
					Columns:{" "}
					<input
						type="range"
						min={2}
						max={6}
						value={columns}
						onChange={(e) => setColumns(+e.target.value)}
					/>
					<span>{columns}</span>
				</label>
				<label>
					Gap:{" "}
					<input
						type="range"
						min={0}
						max={24}
						value={gap}
						onChange={(e) => setGap(+e.target.value)}
					/>
					<span>{gap}px</span>
				</label>
				<label>
					Overscan:{" "}
					<input
						type="range"
						min={0}
						max={10}
						value={overscan}
						onChange={(e) => setOverscan(+e.target.value)}
					/>
					<span>{overscan}</span>
				</label>
				<label>
					<input
						type="checkbox"
						checked={infiniteScroll}
						onChange={(e) => setInfiniteScroll(e.target.checked)}
					/>
					Infinite scroll
				</label>
				<div className="example-actions">
					<button onClick={() => scrollToIndex(0)}>Top</button>
					<button
						onClick={() =>
							scrollToIndex(Math.floor(count / 2), "center")
						}
					>
						Middle
					</button>
					<button onClick={() => scrollToEnd()}>End</button>
					<button
						onClick={() =>
							scrollToIndex(
								Math.floor(Math.random() * count),
								"center",
							)
						}
					>
						Random
					</button>
					<button onClick={() => setCount((c) => c + 20)}>
						Load 20 More
					</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Visible</span>
						<span>{items.length} cards</span>
					</div>
					<div>
						<span>Total height</span>
						<span>
							{Math.round(totalHeight).toLocaleString()}px
						</span>
					</div>
					<div>
						<span>Total items</span>
						<span>{count.toLocaleString()}</span>
					</div>
					<div>
						<span>Col width</span>
						<span>{columnWidth}px</span>
					</div>
					{loading && (
						<div style={{ color: "var(--accent)", marginTop: 4 }}>
							Loading more...
						</div>
					)}
				</div>
			</div>
			<div className="example-viewport" ref={combinedRef}>
				<div style={{ height: totalHeight, position: "relative" }}>
					{items.map((item) => {
						const col = Math.round(
							item.x / (columnWidth + gap),
						);
						return (
							<div
								key={item.index}
								style={{
									position: "absolute",
									top: item.y,
									left: item.x,
									width: item.width,
									height: item.height,
								}}
							>
								<div
									className="masonry-card"
									style={{
										backgroundColor: seededColor(
											item.index,
										),
										color: "rgba(0,0,0,0.8)",
									}}
								>
									<div>
										<div className="card-title">
											Card #{item.index}
										</div>
										<div
											style={{
												fontSize: 12,
												marginTop: 6,
												lineHeight: 1.4,
												opacity: 0.7,
											}}
										>
											{descriptions[
												item.index %
													descriptions.length
											]}
										</div>
									</div>
									<div className="card-meta">
										{item.height}px | col {col}
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
