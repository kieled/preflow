import type { FlowItem } from "@preflow/core";
import type React from "react";
import { useGrid } from "../hooks/useGrid";

export interface TextTableProps {
	count: number;
	columns: number;
	columnWidth: number;
	gap?: number;
	headerHeight: number;
	getHeight: (index: number) => number;
	renderItem: (item: FlowItem) => React.ReactNode;
	renderHeader: () => React.ReactNode;
	overscan?: number;
	className?: string;
	style?: React.CSSProperties;
}

export function TextTable({
	count,
	columns,
	columnWidth,
	gap,
	headerHeight,
	getHeight,
	renderItem,
	renderHeader,
	overscan,
	className,
	style,
}: TextTableProps) {
	const { containerRef, items, totalHeight } = useGrid({
		count,
		columns,
		columnWidth,
		gap,
		getHeight,
		overscan,
	});

	return (
		<div
			ref={containerRef}
			className={className}
			style={{ ...style, overflow: "auto", position: "relative" }}
		>
			<div
				style={{
					position: "sticky",
					top: 0,
					zIndex: 1,
					height: headerHeight,
					background: "inherit",
				}}
			>
				{renderHeader()}
			</div>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
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
						{renderItem(item)}
					</div>
				))}
			</div>
		</div>
	);
}
