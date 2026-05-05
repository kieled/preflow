import { readFileSync, readdirSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, relative } from "node:path";

interface Boundary {
	declaredDependencies: Set<string>;
	imports: Set<string>;
	roots: string[];
}

const boundaries: Record<string, Boundary> = {
	"packages/core": {
		declaredDependencies: new Set(),
		imports: new Set(),
		roots: ["src", "tests"],
	},
	"packages/prose": {
		declaredDependencies: new Set(["@preflow/core"]),
		imports: new Set(["@preflow/core"]),
		roots: ["src", "tests"],
	},
	"packages/react": {
		declaredDependencies: new Set([
			"@preflow/core",
			"react",
			"react-dom",
			"@types/react",
			"@types/react-dom",
		]),
		imports: new Set(["@preflow/core", "react"]),
		roots: ["src", "tests"],
	},
	"packages/vue": {
		declaredDependencies: new Set(["@preflow/core", "vue"]),
		imports: new Set(["@preflow/core", "vue"]),
		roots: ["src", "tests"],
	},
	examples: {
		declaredDependencies: new Set([
			"@chenglou/pretext",
			"@preflow/core",
			"@preflow/prose",
			"@preflow/react",
			"@tanstack/react-virtual",
			"@types/react",
			"@types/react-dom",
			"@vitejs/plugin-react",
			"react",
			"react-dom",
			"react-virtuoso",
			"typescript",
			"vite",
		]),
		imports: new Set([
			"@chenglou/pretext",
			"@preflow/core",
			"@preflow/prose",
			"@preflow/react",
			"@tanstack/react-virtual",
			"react",
			"react-dom",
			"react-virtuoso",
		]),
		roots: ["src"],
	},
};

const rootImportAllowlist = new Set([
	"@tanstack/react-virtual",
	"@tanstack/virtual-core",
	"@vitejs/plugin-react",
	"playwright",
	"react",
	"react-dom",
	"react-virtuoso",
	"vite",
]);
const rootManifestAllowlist = new Set([
	"@biomejs/biome",
	"@tanstack/react-virtual",
	"@tanstack/virtual-core",
	"@types/react",
	"@types/react-dom",
	"@vitejs/plugin-react",
	"playwright",
	"react",
	"react-dom",
	"react-virtuoso",
	"typescript",
	"vite",
]);

const nodeBuiltins = new Set([
	...builtinModules,
	...builtinModules.map((name) => `node:${name}`),
	"bun:test",
]);
const importPattern =
	/(?:import\s+(?:type\s+)?(?:[^"']+\s+from\s+)?|export\s+(?:type\s+)?[^"']+\s+from\s+|require\()\s*["']([^"']+)["']/g;

function packageName(specifier: string): string | null {
	if (specifier.startsWith(".") || specifier.startsWith("/")) return null;
	if (nodeBuiltins.has(specifier)) return null;
	const parts = specifier.split("/");
	return specifier.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]!;
}

function walk(dir: string, files: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		const stat = statSync(path);
		if (stat.isDirectory()) walk(path, files);
		else if (/\.(ts|tsx|js|jsx)$/.test(entry)) files.push(path);
	}
	return files;
}

function readPackageDependencies(path: string): Set<string> {
	const json = JSON.parse(readFileSync(path, "utf8")) as {
		dependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	return new Set([
		...Object.keys(json.dependencies ?? {}),
		...Object.keys(json.peerDependencies ?? {}),
		...Object.keys(json.devDependencies ?? {}),
	]);
}

const failures: string[] = [];

for (const dep of readPackageDependencies("package.json")) {
	if (!rootManifestAllowlist.has(dep)) {
		failures.push(`package.json: unexpected root manifest dependency ${dep}`);
	}
}

for (const [dir, boundary] of Object.entries(boundaries)) {
	const packagePath = join(dir, "package.json");
	const declared = readPackageDependencies(packagePath);
	for (const dep of declared) {
		if (!boundary.declaredDependencies.has(dep))
			failures.push(`${dir}: unexpected manifest dependency ${dep}`);
	}
	for (const dep of boundary.declaredDependencies) {
		if (!declared.has(dep)) failures.push(`${dir}: missing expected manifest dependency ${dep}`);
	}

	for (const root of boundary.roots) {
		for (const file of walk(join(dir, root))) {
			const text = readFileSync(file, "utf8");
			for (const match of text.matchAll(importPattern)) {
				const name = packageName(match[1]!);
				if (name && !boundary.imports.has(name)) {
					failures.push(`${relative(".", file)}: unexpected external import ${name}`);
				}
			}
		}
	}
}

for (const dir of ["benchmarks", "scripts"]) {
	for (const file of walk(dir)) {
		const text = readFileSync(file, "utf8");
		for (const match of text.matchAll(importPattern)) {
			const name = packageName(match[1]!);
			if (name && !rootImportAllowlist.has(name)) {
				failures.push(`${relative(".", file)}: unexpected external import ${name}`);
			}
		}
	}
}

if (failures.length > 0) {
	console.error("Dependency boundary checks failed:");
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log("Dependency boundary checks passed.");
