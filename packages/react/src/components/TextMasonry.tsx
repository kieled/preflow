import type { FlowItem } from "@preflow/core";
import type React from "react";
import { useMasonry } from "../hooks/useMasonry";

export interface TextMasonryProps {
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

export function TextMasonry({
	count,
	columns,
	columnWidth,
	gap,
	getHeight,
	renderItem,
	overscan,
	className,
	style,
}: TextMasonryProps) {
	const { containerRef, items, totalHeight } = useMasonry({
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
