import type { FlowItem, ScrollCorrection } from "@preflow/core";
import { forwardRef, useImperativeHandle } from "react";
import type React from "react";
import { useChat } from "../hooks/useChat";

export interface TextChatHandle {
	append: (count: number) => void;
	prepend: (count: number) => ScrollCorrection;
	scrollToEnd: () => void;
	scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
}

export interface TextChatProps {
	count: number;
	getHeight: (index: number) => number;
	renderItem: (item: FlowItem) => React.ReactNode;
	overscan?: number;
	className?: string;
	style?: React.CSSProperties;
}

export const TextChat = forwardRef<TextChatHandle, TextChatProps>(function TextChat(
	{ count, getHeight, renderItem, overscan, className, style },
	ref,
) {
	const { containerRef, items, totalHeight, scrollToIndex, scrollToEnd, append, prepend } = useChat(
		{ count, getHeight, overscan },
	);

	useImperativeHandle(ref, () => ({
		append,
		prepend,
		scrollToEnd,
		scrollToIndex,
	}));

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
});
