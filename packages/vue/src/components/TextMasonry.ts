import { type PropType, defineComponent, h } from "vue";
import { useMasonry } from "../composables/useMasonry";

export const TextMasonry = defineComponent({
	name: "TextMasonry",
	props: {
		count: { type: Number, required: true },
		columns: { type: Number, required: true },
		columnWidth: { type: Number, required: true },
		gap: { type: Number, default: 0 },
		getHeight: {
			type: Function as PropType<(index: number) => number>,
			required: true,
		},
		overscan: { type: Number, default: 3 },
	},
	setup(props, { slots }) {
		const { containerRef, items, totalHeight } = useMasonry({
			count: props.count,
			columns: props.columns,
			columnWidth: props.columnWidth,
			gap: props.gap,
			getHeight: props.getHeight,
			overscan: props.overscan,
		});

		return () =>
			h(
				"div",
				{
					ref: containerRef,
					style: { overflow: "auto", position: "relative" },
				},
				[
					h(
						"div",
						{ style: { height: `${totalHeight.value}px`, position: "relative" } },
						items.value.map((item) =>
							h(
								"div",
								{
									key: item.index,
									style: {
										position: "absolute",
										top: `${item.y}px`,
										left: `${item.x}px`,
										width: `${item.width}px`,
										height: `${item.height}px`,
									},
								},
								slots.default?.({ item }),
							),
						),
					),
				],
			);
	},
});
