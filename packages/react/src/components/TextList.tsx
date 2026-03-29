import type { FlowItem } from "@preflow/core";
import type React from "react";
import { useFlow } from "../hooks/useFlow";

export interface TextListProps {
	count: number;
	getHeight: (index: number) => number;
	renderItem: (item: FlowItem) => React.ReactNode;
	overscan?: number;
	className?: string;
	style?: React.CSSProperties;
}

export function TextList({
	count,
	getHeight,
	renderItem,
	overscan,
	className,
	style,
}: TextListProps) {
	const { containerRef, items, totalHeight } = useFlow({ count, getHeight, overscan });

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
							width: item.width || "100%",
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
