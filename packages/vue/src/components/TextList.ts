import { type PropType, defineComponent, h } from "vue";
import { useFlow } from "../composables/useFlow";

export const TextList = defineComponent({
	name: "TextList",
	props: {
		count: { type: Number, required: true },
		getHeight: {
			type: Function as PropType<(index: number) => number>,
			required: true,
		},
		overscan: { type: Number, default: 3 },
	},
	setup(props, { slots }) {
		const { containerRef, items, totalHeight } = useFlow({
			count: props.count,
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
										width: item.width ? `${item.width}px` : "100%",
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
