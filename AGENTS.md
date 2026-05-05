# Agent Workflow

Before presenting changes as ready or pushing a branch, run:

```sh
bun run verify:push
```

For ordinary local iteration, use:

```sh
bun run verify
```

`verify` checks lint, package builds, package export integrity, all tests, example typechecking, example production build, and diff whitespace. `verify:push` adds benchmark budget checks.

Publishing has an extra guard:

```sh
bun run check:publish
```

This fails when a package version is already published to npm. Bump changed package versions before publishing.

Install the tracked Git hook path once per checkout:

```sh
bun run hooks:install
```
