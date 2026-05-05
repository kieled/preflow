const packageDirs = ["packages/core", "packages/prose", "packages/react", "packages/vue"] as const;

interface PackageJson {
	name: string;
	version: string;
}

const failures: string[] = [];

for (const dir of packageDirs) {
	const packageJson = (await Bun.file(`${dir}/package.json`).json()) as PackageJson;
	const result = Bun.spawnSync(["npm", "view", packageJson.name, "version"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const published = result.success ? result.stdout.toString().trim() : "";

	if (published === packageJson.version) {
		failures.push(`${packageJson.name}@${packageJson.version} is already published`);
	} else if (published) {
		console.log(`${packageJson.name}: local ${packageJson.version}, npm ${published}`);
	} else {
		console.log(`${packageJson.name}: local ${packageJson.version}, npm version not found`);
	}
}

if (failures.length > 0) {
	console.error("Publish version checks failed:");
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Publish version checks passed (${packageDirs.length} packages).`);
