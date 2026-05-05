import { existsSync } from "node:fs";
import { join } from "node:path";

const packageDirs = ["packages/core", "packages/prose", "packages/react", "packages/vue"] as const;

interface ExportTarget {
	types?: string;
	import?: string;
}

interface PackageJson {
	name: string;
	main?: string;
	types?: string;
	exports?: Record<string, ExportTarget>;
	files?: string[];
	sideEffects?: boolean;
}

function assertFile(path: string, label: string, failures: string[]): void {
	if (!existsSync(path)) failures.push(`${label} missing: ${path}`);
}

const failures: string[] = [];

for (const dir of packageDirs) {
	const packageJson = (await Bun.file(join(dir, "package.json")).json()) as PackageJson;
	const label = packageJson.name;

	if (packageJson.files?.includes("dist") !== true) {
		failures.push(`${label}: package.json files must include dist`);
	}
	if (packageJson.sideEffects !== false) {
		failures.push(`${label}: package.json sideEffects must be false`);
	}

	if (!packageJson.main || !packageJson.main.startsWith("dist/")) {
		failures.push(`${label}: main must point at dist`);
	} else {
		assertFile(join(dir, packageJson.main), `${label} main`, failures);
	}

	if (!packageJson.types || !packageJson.types.startsWith("dist/")) {
		failures.push(`${label}: types must point at dist`);
	} else {
		assertFile(join(dir, packageJson.types), `${label} types`, failures);
	}

	for (const [exportName, target] of Object.entries(packageJson.exports ?? {})) {
		if (!target.import?.startsWith("./dist/")) {
			failures.push(`${label} ${exportName}: import export must point at ./dist`);
		} else {
			assertFile(join(dir, target.import.slice(2)), `${label} ${exportName} import`, failures);
		}

		if (!target.types?.startsWith("./dist/")) {
			failures.push(`${label} ${exportName}: types export must point at ./dist`);
		} else {
			assertFile(join(dir, target.types.slice(2)), `${label} ${exportName} types`, failures);
		}
	}
}

if (failures.length > 0) {
	console.error("Package checks failed:");
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Package checks passed (${packageDirs.length} packages).`);
