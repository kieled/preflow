import { useChat } from "@preflow/react";
import { useState, useCallback, useRef } from "react";

const sampleTexts = [
	"Hey!",
	"What's up?",
	"Not much, working on the virtualizer",
	"Oh cool! How's it going?",
	"Pretty well actually. Got 311 tests passing across 4 packages.",
	"Nice! That's impressive. What are the packages?",
	"Core engine, prose (line-level virtualization), React hooks/components, and Vue composables.",
	"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
	"Short reply",
	"The key insight is using prefix-sum arrays for O(1) offset lookups. Combined with pretext's arithmetic-only text measurement, we skip DOM measurement entirely.",
	"k",
	"Want to grab lunch?",
];

interface Message {
	text: string;
	sender: "me" | "them";
}

// Height must match what CSS actually renders.
// Wrapper: padding 8px (4+4) vertical.
// .chat-message: padding 20px (10+10), font 14px * line-height 1.5 = 21px/line.
// Index label: ~14px (font 10px + 2px margin).
// Max-width: 70% of container. Assume ~500px effective width for text.
// ~8px per char at 14px font => ~62 chars/line.
function msgHeight(text: string): number {
	const charsPerLine = 50;
	const lineH = 21;
	const lines = Math.ceil(text.length / charsPerLine) || 1;
	const indexLabel = 14;
	const msgPadding = 20;
	const wrapperPadding = 12;
	return wrapperPadding + msgPadding + indexLabel + lines * lineH;
}

export function ChatExample() {
	const messagesRef = useRef<Message[]>(
		Array.from({ length: 50 }, (_, i) => ({
			text: sampleTexts[i % sampleTexts.length]!,
			sender: (i % 3 === 0 ? "them" : "me") as "me" | "them",
		})),
	);
	const [messageCount, setMessageCount] = useState(messagesRef.current.length);
	const [isAtBottom, setIsAtBottom] = useState(true);

	const getHeight = useCallback(
		(i: number) => msgHeight(messagesRef.current[i]?.text ?? ""),
		[],
	);

	const { containerRef, items, totalHeight, scrollToEnd, append, prepend } =
		useChat({
			count: messageCount,
			getHeight,
			overscan: 5,
		});

	const scrollAreaRef = useRef<HTMLElement | null>(null);

	const handleScroll = useCallback(() => {
		const el = scrollAreaRef.current;
		if (!el) return;
		const atBottom =
			el.scrollTop >= el.scrollHeight - el.clientHeight - 2;
		setIsAtBottom(atBottom);
	}, []);

	const combinedRef = useCallback(
		(el: HTMLElement | null) => {
			scrollAreaRef.current = el;
			containerRef(el);
		},
		[containerRef],
	);

	const handleSend = useCallback(() => {
		const text =
			sampleTexts[Math.floor(Math.random() * sampleTexts.length)]!;
		// Update ref BEFORE append so getHeight sees the new message
		messagesRef.current = [...messagesRef.current, { text, sender: "me" }];
		setMessageCount(messagesRef.current.length);
		append(1);
	}, [append]);

	const handleReceive = useCallback(() => {
		const text =
			sampleTexts[Math.floor(Math.random() * sampleTexts.length)]!;
		messagesRef.current = [
			...messagesRef.current,
			{ text, sender: "them" },
		];
		setMessageCount(messagesRef.current.length);
		append(1);
	}, [append]);

	const handleLoadOlder = useCallback(() => {
		const older = Array.from({ length: 20 }, (_, i) => ({
			text: sampleTexts[(i + 5) % sampleTexts.length]!,
			sender: (i % 2 === 0 ? "them" : "me") as "me" | "them",
		}));
		// Update ref BEFORE prepend so getHeight sees the new messages
		messagesRef.current = [...older, ...messagesRef.current];
		setMessageCount(messagesRef.current.length);
		prepend(20);
	}, [prepend]);

	return (
		<div className="chat-layout">
			<div className="example-controls">
				<h3>Chat</h3>
				<p>
					Bottom-anchored messaging with append (new messages) and
					prepend (load older). Auto-follows when at bottom.
				</p>
				<div className="example-actions">
					<button onClick={handleSend}>Send Message</button>
					<button onClick={handleReceive}>Receive Message</button>
					<button onClick={handleLoadOlder}>Load 20 Older</button>
					<button onClick={() => scrollToEnd()}>
						Jump to Bottom
					</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Messages</span>
						<span>{messageCount}</span>
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
				<div
					className={`chat-status ${isAtBottom ? "at-bottom" : "scrolled-up"}`}
					style={{ marginTop: 12 }}
				>
					{isAtBottom
						? "-- At bottom (auto-follow) --"
						: "-- Scrolled up --"}
				</div>
			</div>
			<div className="chat-viewport">
				<div
					className="chat-scroll-area"
					ref={combinedRef}
					onScroll={handleScroll}
				>
					<div
						style={{ height: totalHeight, position: "relative" }}
					>
						{items.map((item) => {
							const msg = messagesRef.current[item.index];
							if (!msg) return null;
							return (
								<div
									key={item.index}
									style={{
										position: "absolute",
										top: item.y,
										left: 0,
										right: 0,
										height: item.height,
										display: "flex",
										alignItems: "center",
										padding: "4px 16px",
									}}
								>
									<div
										className={`chat-message ${msg.sender}`}
									>
										<div
											style={{
												fontSize: 10,
												opacity: 0.6,
												marginBottom: 2,
											}}
										>
											#{item.index}
										</div>
										{msg.text}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
