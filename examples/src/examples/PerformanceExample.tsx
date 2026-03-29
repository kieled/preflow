import { useFlow } from "@preflow/react";
import { useState, useCallback, useRef, useEffect } from "react";

const ITEM_COUNT = 100000;

function seededHeight(index: number): number {
	return 30 + ((index * 7919 + 104729) % 71);
}

function seededColor(index: number): string {
	const hue = (index * 137) % 360;
	return `hsl(${hue}, 60%, 82%)`;
}

function useFps() {
	const [fps, setFps] = useState(0);
	const framesRef = useRef(0);
	const lastRef = useRef(performance.now());

	useEffect(() => {
		let id: number;
		const tick = () => {
			framesRef.current++;
			const now = performance.now();
			if (now - lastRef.current >= 1000) {
				setFps(framesRef.current);
				framesRef.current = 0;
				lastRef.current = now;
			}
			id = requestAnimationFrame(tick);
		};
		id = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(id);
	}, []);

	return fps;
}

export function PerformanceExample() {
	const [autoScroll, setAutoScroll] = useState(false);
	const [jumpTest, setJumpTest] = useState(false);
	const [jumpCount, setJumpCount] = useState(0);
	const scrollRef = useRef<HTMLElement | null>(null);
	const autoScrollRef = useRef(false);
	const jumpTestRef = useRef(false);
	const fps = useFps();

	const getHeight = useCallback((i: number) => seededHeight(i), []);

	const { containerRef, items, totalHeight, scrollToIndex, scrollToEnd } =
		useFlow({
			count: ITEM_COUNT,
			getHeight,
			overscan: 5,
		});

	const combinedRef = useCallback(
		(el: HTMLElement | null) => {
			scrollRef.current = el;
			containerRef(el);
		},
		[containerRef],
	);

	// Auto-scroll effect
	useEffect(() => {
		autoScrollRef.current = autoScroll;
		if (!autoScroll) return;

		let id: number;
		const tick = () => {
			if (!autoScrollRef.current) return;
			const el = scrollRef.current;
			if (el) {
				el.scrollTop += 3;
				if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
					el.scrollTop = 0;
				}
			}
			id = requestAnimationFrame(tick);
		};
		id = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(id);
	}, [autoScroll]);

	// Jump test effect
	useEffect(() => {
		jumpTestRef.current = jumpTest;
		if (!jumpTest) return;

		let count = 0;
		const interval = setInterval(() => {
			if (!jumpTestRef.current || count >= 100) {
				setJumpTest(false);
				return;
			}
			const idx = Math.floor(Math.random() * ITEM_COUNT);
			scrollToIndex(idx, "center");
			count++;
			setJumpCount(count);
		}, 50);

		return () => clearInterval(interval);
	}, [jumpTest, scrollToIndex]);

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Stress Test (100k)</h3>
				<p>
					100,000 items with variable heights. Test scrolling
					performance with the FPS counter. Auto-scroll and jump
					tests verify smooth rendering under load.
				</p>
				<div className="example-actions">
					<button
						onClick={() => setAutoScroll((v) => !v)}
						style={{
							background: autoScroll
								? "#e74c3c"
								: "var(--accent)",
						}}
					>
						{autoScroll ? "Stop Auto-Scroll" : "Auto-Scroll"}
					</button>
					<button
						onClick={() => {
							setJumpCount(0);
							setJumpTest(true);
						}}
						disabled={jumpTest}
						style={{
							opacity: jumpTest ? 0.5 : 1,
						}}
					>
						{jumpTest
							? `Jumping... ${jumpCount}/100`
							: "Jump Test (100x)"}
					</button>
				</div>
				<div className="example-actions">
					<button
						onClick={() => {
							const el = scrollRef.current;
							if (el) el.scrollTop = 0;
						}}
					>
						Top
					</button>
					<button
						onClick={() =>
							scrollToIndex(
								Math.floor(ITEM_COUNT / 2),
								"center",
							)
						}
					>
						Middle
					</button>
					<button onClick={() => scrollToEnd()}>End</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Total items</span>
						<span>{ITEM_COUNT.toLocaleString()}</span>
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
						<span>Range</span>
						<span>
							{items[0]?.index ?? 0} -{" "}
							{items[items.length - 1]?.index ?? 0}
						</span>
					</div>
				</div>
			</div>
			<div className="example-viewport" ref={combinedRef}>
				<div style={{ height: totalHeight, position: "relative" }}>
					{items.map((item) => (
						<div
							key={item.index}
							className="flow-item"
							style={{
								position: "absolute",
								top: item.y,
								left: 0,
								right: 0,
								height: item.height,
								backgroundColor: seededColor(item.index),
							}}
						>
							<span className="item-index">#{item.index}</span>
							<span className="item-info">
								{item.height}px
							</span>
						</div>
					))}
				</div>
			</div>
			<div className="fps-counter">
				FPS: {fps} | Rendered: {items.length} items
			</div>
		</div>
	);
}
