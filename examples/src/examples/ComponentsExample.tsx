import { useState, useCallback } from "react";
import { TextList, TextGrid, TextMasonry } from "@preflow/react";
import type { FlowItem } from "@preflow/core";

function seededHeight(index: number): number {
	return 40 + ((index * 7919 + 104729) % 121);
}

function seededColor(index: number): string {
	const hue = (index * 137) % 360;
	return `hsl(${hue}, 65%, 85%)`;
}

function masonryHeight(index: number): number {
	return 80 + ((index * 13397 + 52711) % 221);
}

type Tab = "list" | "grid" | "masonry";

export function ComponentsExample() {
	const [tab, setTab] = useState<Tab>("list");
	const [count] = useState(3000);

	const listGetHeight = useCallback((i: number) => seededHeight(i), []);
	const gridGetHeight = useCallback(
		(i: number) => 60 + ((i * 4391 + 77731) % 61),
		[],
	);
	const masonryGetHeight = useCallback(
		(i: number) => masonryHeight(i),
		[],
	);

	const renderListItem = useCallback(
		(item: FlowItem) => (
			<div
				style={{
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0 16px",
					backgroundColor: seededColor(item.index),
					fontSize: 13,
				}}
			>
				<span style={{ fontWeight: 600 }}>#{item.index}</span>
				<span style={{ fontSize: 11, opacity: 0.6 }}>
					{item.height}px
				</span>
			</div>
		),
		[],
	);

	const renderGridItem = useCallback(
		(item: FlowItem) => (
			<div
				className="grid-item"
				style={{
					height: "100%",
					backgroundColor: seededColor(item.index),
				}}
			>
				#{item.index}
			</div>
		),
		[],
	);

	const renderMasonryItem = useCallback(
		(item: FlowItem) => (
			<div
				className="masonry-card"
				style={{
					backgroundColor: seededColor(item.index),
					color: "rgba(0,0,0,0.8)",
				}}
			>
				<div className="card-title">Card #{item.index}</div>
				<div className="card-meta">{item.height}px</div>
			</div>
		),
		[],
	);

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Components</h3>
				<p>
					Pre-built React components that wrap the hooks. Minimal
					boilerplate -- just provide count, getHeight, and
					renderItem.
				</p>
				<div className="tab-bar">
					<button
						className={tab === "list" ? "active" : ""}
						onClick={() => setTab("list")}
					>
						TextList
					</button>
					<button
						className={tab === "grid" ? "active" : ""}
						onClick={() => setTab("grid")}
					>
						TextGrid
					</button>
					<button
						className={tab === "masonry" ? "active" : ""}
						onClick={() => setTab("masonry")}
					>
						TextMasonry
					</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Items</span>
						<span>{count.toLocaleString()}</span>
					</div>
					<div>
						<span>Component</span>
						<span>
							{tab === "list"
								? "TextList"
								: tab === "grid"
									? "TextGrid"
									: "TextMasonry"}
						</span>
					</div>
				</div>
				<div className="code-snippet">
					{tab === "list" && (
						<>
							{"<"}
							<span className="fn">TextList</span>
							{"\n"}
							{"  count={3000}\n"}
							{"  getHeight={fn}\n"}
							{"  renderItem={fn}\n"}
							{"  overscan={5}\n"}
							{"/>"}
						</>
					)}
					{tab === "grid" && (
						<>
							{"<"}
							<span className="fn">TextGrid</span>
							{"\n"}
							{"  count={3000}\n"}
							{"  columns={3}\n"}
							{"  columnWidth={200}\n"}
							{"  gap={8}\n"}
							{"  getHeight={fn}\n"}
							{"  renderItem={fn}\n"}
							{"/>"}
						</>
					)}
					{tab === "masonry" && (
						<>
							{"<"}
							<span className="fn">TextMasonry</span>
							{"\n"}
							{"  count={3000}\n"}
							{"  columns={4}\n"}
							{"  columnWidth={200}\n"}
							{"  gap={10}\n"}
							{"  getHeight={fn}\n"}
							{"  renderItem={fn}\n"}
							{"/>"}
						</>
					)}
				</div>
			</div>
			<div
				className="example-viewport"
				style={{ overflow: "hidden", display: "flex" }}
			>
				{tab === "list" && (
					<TextList
						count={count}
						getHeight={listGetHeight}
						renderItem={renderListItem}
						overscan={5}
						style={{ flex: 1 }}
					/>
				)}
				{tab === "grid" && (
					<TextGrid
						count={count}
						columns={3}
						columnWidth={200}
						gap={8}
						getHeight={gridGetHeight}
						renderItem={renderGridItem}
						overscan={3}
						style={{ flex: 1 }}
					/>
				)}
				{tab === "masonry" && (
					<TextMasonry
						count={count}
						columns={4}
						columnWidth={200}
						gap={10}
						getHeight={masonryGetHeight}
						renderItem={renderMasonryItem}
						overscan={3}
						style={{ flex: 1 }}
					/>
				)}
			</div>
		</div>
	);
}
