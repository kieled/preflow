import type { FlowItem } from "@preflow/core";
import type React from "react";
import { useGrid } from "../hooks/useGrid";

export interface TextGridProps {
	count: number;
	columns: number;
	columnWidth: number;
	gap?: number;
	getHeight: (index: number) => number;
	renderItem: (item: FlowItem) => React.ReactNode;
	overscan?: number;
	className?: string;
	style?: React.CSSProperties;
}

export function TextGrid({
	count,
	columns,
	columnWidth,
	gap,
	getHeight,
	renderItem,
	overscan,
	className,
	style,
}: TextGridProps) {
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
