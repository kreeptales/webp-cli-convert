# Contributing to webp-cli-convert

Thank you for your interest in contributing! Please be respectful and constructive in all interactions.

## Setup

Requirements: Node.js ≥ 20.3.0, npm ≥ 10.

```bash
git clone https://github.com/username/webp-cli-convert.git
cd webp-cli-convert
npm install
```

## Development scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript → `dist/cli.js` |
| `npm run dev` | Watch mode (auto-rebuild on save) |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint and format check (Biome) |
| `npm run lint:fix` | Auto-fix lint/format issues |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

## Project layout

```
src/
  cli.ts          Entry point
  args.ts         CLI argument parsing and validation
  converter.ts    Core image conversion (sharp)
  scanner.ts      File/directory discovery
  constants.ts    Shared constants and defaults
  types.ts        TypeScript types and CliError
  ui/
    colors.ts     ANSI colors, NO_COLOR support
    log.ts        log.success/info/warn/error/dim
    components.ts box(), bar(), banner(), formatBytes()
    help.ts       --help output
    raw-mode.ts   RawModeSession (safe TTY management)
    prompts.ts    selectPrompt, togglePrompt, numberPrompt, textPrompt
    browser.ts    Interactive folder browser
    wizard.ts     Options configuration wizard
tests/
  helpers/fixtures.ts  Test image generation
  args.test.ts
  scanner.test.ts
  converter.test.ts
```

## Guidelines

- **Keep the dependency footprint small.** The only runtime dependency is `sharp`. Avoid adding more.
- **Tests for all logic changes.** Core modules (`args`, `scanner`, `converter`) must be covered. UI modules (TTY-dependent) are excluded from test coverage requirements.
- **Pass CI before opening a PR.** `npm run lint && npm run typecheck && npm run test && npm run build` must all succeed on Linux and Windows.
- **Originals stay safe.** Never change the default to delete originals. That default protects users' data.
- **English** for all code, comments, docs, and commit messages.

## Pull request process

1. Fork the repository and create a branch from `main`.
2. Make your changes with tests.
3. Run `npm run lint:fix` to auto-format.
4. Open a PR with a clear description of what changes and why.
5. CI must be green before merging.

## Releasing (maintainers only)

Create an annotated tag `vX.Y.Z` and push it. The `release.yml` workflow publishes to npm automatically.

```bash
git tag -a v2.1.0 -m "v2.1.0"
git push origin v2.1.0
```
