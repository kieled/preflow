import { createFlow } from "@preflow/core";
import type { FlowItem } from "@preflow/core";
import { useRef, useState, useEffect, useCallback } from "react";

function seededHeight(index: number): number {
	return 50 + ((index * 6271 + 31337) % 101);
}

function seededColor(index: number): string {
	const hue = (index * 97 + 60) % 360;
	return `hsl(${hue}, 50%, 80%)`;
}

const COUNT = 5000;

export function CoreDirectExample() {
	const flowRef = useRef(
		createFlow({
			count: COUNT,
			getHeight: seededHeight,
			overscan: 5,
		}),
	);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const [items, setItems] = useState<FlowItem[]>([]);
	const [totalHeight, setTotalHeight] = useState(0);

	const sync = useCallback(() => {
		const flow = flowRef.current;
		setItems(flow.getItems());
		setTotalHeight(flow.totalHeight);
	}, []);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const flow = flowRef.current;

		const onScroll = () => {
			if (flow.setViewport(el.scrollTop, el.clientHeight)) {
				sync();
			}
		};

		const observer = new ResizeObserver(() => {
			flow.setContainerWidth(el.clientWidth);
			if (flow.setViewport(el.scrollTop, el.clientHeight)) {
				sync();
			}
		});

		// Initial
		flow.setViewport(el.scrollTop, el.clientHeight);
		sync();

		el.addEventListener("scroll", onScroll, { passive: true });
		observer.observe(el);

		return () => {
			el.removeEventListener("scroll", onScroll);
			observer.disconnect();
		};
	}, [sync]);

	const handleScrollToMiddle = useCallback(() => {
		const flow = flowRef.current;
		const el = containerRef.current;
		if (!el) return;
		el.scrollTop = flow.scrollToIndex(Math.floor(COUNT / 2), "center");
	}, []);

	const handleScrollToEnd = useCallback(() => {
		const flow = flowRef.current;
		const el = containerRef.current;
		if (!el) return;
		el.scrollTop = flow.scrollToEnd();
	}, []);

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Core Direct API</h3>
				<p>
					Using @preflow/core directly without React hooks. Manual
					scroll listeners, manual ResizeObserver, manual state
					management. Proves the core is framework-agnostic.
				</p>
				<div className="example-actions">
					<button
						onClick={() => {
							const el = containerRef.current;
							if (el) el.scrollTop = 0;
						}}
					>
						Top
					</button>
					<button onClick={handleScrollToMiddle}>Middle</button>
					<button onClick={handleScrollToEnd}>End</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Items</span>
						<span>{COUNT.toLocaleString()}</span>
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
				</div>
				<div className="code-snippet">
					<span className="comment">
						// Framework-agnostic core API
					</span>
					{"\n"}
					<span className="keyword">import</span>
					{" { "}
					<span className="fn">createFlow</span>
					{" } "}
					<span className="keyword">from</span>{" "}
					<span className="string">"@preflow/core"</span>;{"\n\n"}
					<span className="keyword">const</span> flow ={" "}
					<span className="fn">createFlow</span>
					{"({\n"}
					{"  count: 5000,\n"}
					{"  "}
					<span className="fn">getHeight</span>: (i) {"=>"} heights[i],
					{"\n"}
					{"  overscan: 5,\n"}
					{"});\n\n"}
					<span className="comment">
						// Manual scroll handling
					</span>
					{"\n"}
					el.addEventListener(
					<span className="string">"scroll"</span>, () {"=> {\n"}
					{"  "}
					<span className="keyword">if</span> (flow.
					<span className="fn">setViewport</span>(
					{"\n"}
					{"    el.scrollTop,\n"}
					{"    el.clientHeight\n"}
					{"  )) {\n"}
					{"    "}
					<span className="comment">// range changed, re-render</span>
					{"\n"}
					{"    render(flow."}
					<span className="fn">getItems</span>());{"\n"}
					{"  }\n"}
					{"});\n\n"}
					<span className="comment">// O(1) scroll operations</span>
					{"\n"}
					flow.<span className="fn">scrollToIndex</span>(2500,{" "}
					<span className="string">"center"</span>);{"\n"}
					flow.<span className="fn">scrollToEnd</span>();
				</div>
			</div>
			<div className="example-viewport" ref={containerRef}>
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
								{item.height}px | core API
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
