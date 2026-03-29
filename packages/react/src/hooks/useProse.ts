// TODO: Replace with @preflow/prose's createProse once the prose package is built.
// For now, this is a stub that delegates to useFlow with prose-specific naming.

import { useFlow } from "./useFlow";
import type { UseFlowOptions, UseFlowResult } from "./useFlow";

export interface UseProseOptions extends UseFlowOptions {}

export interface UseProseResult extends UseFlowResult {}

export function useProse(options: UseProseOptions): UseProseResult {
	return useFlow(options);
}
