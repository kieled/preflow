import { type PropType, defineComponent, h } from "vue";
import { useGrid } from "../composables/useGrid";

/**
 * TextTable — a grid-based table virtualizer.
 * Uses the grid composable under the hood with uniform row heights.
 */
export const TextTable = defineComponent({
	name: "TextTable",
	props: {
		count: { type: Number, required: true },
		columns: { type: Number, required: true },
		columnWidth: { type: Number, required: true },
		gap: { type: Number, default: 0 },
		getHeight: {
			type: Function as PropType<(index: number) => number>,
			required: true,
		},
		overscan: { type: Number, default: 2 },
	},
	setup(props, { slots }) {
		const { containerRef, items, totalHeight } = useGrid({
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
						{
							style: { height: `${totalHeight.value}px`, position: "relative" },
							role: "table",
						},
						items.value.map((item) =>
							h(
								"div",
								{
									key: item.index,
									role: "row",
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
