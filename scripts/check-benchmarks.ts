interface BenchRow {
	scenario: string;
	preflowOps: number | null;
	tanstackOps: number | null;
	preflowLowOps: number | null;
	tanstackLowOps: number | null;
	preflow: string;
	tanstack: string;
}

interface BenchOutput {
	rows: BenchRow[];
}

interface Budget {
	scenario: string;
	minPreflowOps?: number;
	minPreflowLowOps?: number;
	maxPreflowBytes?: number;
	minRatioVsTanstack?: number;
}

const budgets: Budget[] = [
	{ scenario: "Create 100K items", minPreflowOps: 800_000, minRatioVsTanstack: 2 },
	{
		scenario: "setViewport (1K scrolls, 100K items)",
		minPreflowOps: 15_000,
		minRatioVsTanstack: 5,
	},
	{ scenario: "getItems (100K items)", minPreflowOps: 20_000_000, minRatioVsTanstack: 5 },
	{ scenario: "forEachItem (100K items)", minPreflowOps: 5_000_000 },
	{
		scenario: "Full pipeline (create+scroll+render)",
		minPreflowOps: 2_000,
		minRatioVsTanstack: 10,
	},
	{
		scenario: "Append (100x100 items, infinite scroll)",
		minPreflowOps: 5_000,
		minRatioVsTanstack: 100,
	},
	{ scenario: "Masonry setViewport (1K scrolls, 100K items)", minPreflowOps: 2_000 },
	{ scenario: "Prose cached getLines (100K blocks)", minPreflowOps: 20_000_000 },
	{ scenario: "Prose column layout 100K (4 cols)", minPreflowOps: 300 },
	{ scenario: "Memory per 100K instance", maxPreflowBytes: 1_250_000 },
];

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

function parseBytes(value: string): number {
	const match = /^([\d.]+)\s*(KB|MB)$/.exec(value);
	if (!match) fail(`Cannot parse memory value: ${value}`);
	const amount = Number(match[1]);
	return match[2] === "MB" ? amount * 1024 * 1024 : amount * 1024;
}

const result = Bun.spawnSync(["bun", "run", "benchmarks/core.bench.ts", "--json"], {
	stdout: "pipe",
	stderr: "pipe",
});

if (!result.success) {
	process.stderr.write(result.stderr);
	process.stdout.write(result.stdout);
	fail(`Benchmark command failed with exit code ${result.exitCode}`);
}

const raw = result.stdout.toString();
const jsonStart = raw.indexOf("{");
if (jsonStart === -1) fail("Benchmark output did not contain JSON");

let parsed: BenchOutput;
try {
	parsed = JSON.parse(raw.slice(jsonStart));
} catch (error) {
	console.error(raw);
	fail(`Failed to parse benchmark JSON: ${error}`);
}

const rows = new Map(parsed.rows.map((row) => [row.scenario, row]));
const failures: string[] = [];

for (const budget of budgets) {
	const row = rows.get(budget.scenario);
	if (!row) {
		failures.push(`${budget.scenario}: missing benchmark row`);
		continue;
	}

	if (budget.minPreflowOps !== undefined && (row.preflowOps ?? 0) < budget.minPreflowOps) {
		failures.push(`${budget.scenario}: preflowOps ${row.preflowOps} < ${budget.minPreflowOps}`);
	}

	if (budget.minPreflowLowOps !== undefined && (row.preflowLowOps ?? 0) < budget.minPreflowLowOps) {
		failures.push(
			`${budget.scenario}: preflowLowOps ${row.preflowLowOps} < ${budget.minPreflowLowOps}`,
		);
	}

	if (budget.minRatioVsTanstack !== undefined) {
		if (!row.preflowOps || !row.tanstackOps) {
			failures.push(`${budget.scenario}: missing ops for TanStack ratio`);
		} else {
			const ratio = row.preflowOps / row.tanstackOps;
			if (ratio < budget.minRatioVsTanstack) {
				failures.push(
					`${budget.scenario}: ratio ${ratio.toFixed(1)}x < ${budget.minRatioVsTanstack}x`,
				);
			}
		}
	}

	if (budget.maxPreflowBytes !== undefined) {
		const bytes = parseBytes(row.preflow);
		if (bytes > budget.maxPreflowBytes) {
			failures.push(
				`${budget.scenario}: memory ${Math.round(bytes)} bytes > ${budget.maxPreflowBytes}`,
			);
		}
	}
}

if (failures.length > 0) {
	console.error("Benchmark budgets failed:");
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Benchmark budgets passed (${budgets.length} checks).`);
