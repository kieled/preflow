import { type UseFlowOptions, type UseFlowReturn, useFlow } from "./useFlow";

export type UseProseOptions = UseFlowOptions;
export type UseProseReturn = UseFlowReturn;

/**
 * Stub composable for prose virtualization.
 * TODO: Wire to @preflow/prose when the prose package is ready.
 * For now, re-exports useFlow with prose naming.
 */
export function useProse(options: UseProseOptions): UseProseReturn {
	return useFlow(options);
}
