import type { FlowItem } from "@preflow/core";
import type React from "react";
import { useFlow } from "../hooks/useFlow";

export interface TextCodeProps {
	count: number;
	lineHeight?: number;
	getHeight?: (index: number) => number;
	renderLine: (item: FlowItem) => React.ReactNode;
	showLineNumbers?: boolean;
	lineNumberWidth?: number;
	overscan?: number;
	className?: string;
	style?: React.CSSProperties;
}

const defaultLineHeight = 20;
const defaultLineNumberWidth = 48;

export function TextCode({
	count,
	lineHeight = defaultLineHeight,
	getHeight,
	renderLine,
	showLineNumbers = true,
	lineNumberWidth = defaultLineNumberWidth,
	overscan,
	className,
	style,
}: TextCodeProps) {
	const resolvedGetHeight = getHeight ?? (() => lineHeight);
	const { containerRef, items, totalHeight } = useFlow({
		count,
		getHeight: resolvedGetHeight,
		overscan,
	});

	return (
		<div
			ref={containerRef}
			className={className}
			style={{
				...style,
				overflow: "auto",
				position: "relative",
				fontFamily: "monospace",
				fontSize: 14,
				lineHeight: `${lineHeight}px`,
			}}
		>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
					<div
						key={item.index}
						style={{
							position: "absolute",
							top: item.y,
							left: 0,
							width: "100%",
							height: item.height,
							display: "flex",
						}}
					>
						{showLineNumbers && (
							<span
								style={{
									width: lineNumberWidth,
									minWidth: lineNumberWidth,
									textAlign: "right",
									paddingRight: 12,
									opacity: 0.5,
									userSelect: "none",
								}}
							>
								{item.index + 1}
							</span>
						)}
						<span style={{ flex: 1 }}>{renderLine(item)}</span>
					</div>
				))}
			</div>
		</div>
	);
}
