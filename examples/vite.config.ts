import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	base: "/preflow/",
	plugins: [react()],
	resolve: {
		alias: {
			"@preflow/core": path.resolve(__dirname, "../packages/core/src"),
			"@preflow/react": path.resolve(__dirname, "../packages/react/src"),
			"@preflow/prose": path.resolve(__dirname, "../packages/prose/src"),
		},
	},
});
