# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static boardgame play-log site built with Astro. Git is the database: each play session is one YAML file. Every build re-validates all data and recomputes all stats and badges from scratch — there is no stored state, so editing history corrects itself on the next build.

## Commands

Requires Node >= 22.12.

```sh
npm test                              # all tests (vitest run)
npx vitest run src/badges/engine.test.ts          # single test file
npx vitest run src/lib/stats.test.ts -t "leaderboard"  # single test by name
npm run dev                           # local dev server
npm run build                         # full static build (also validates all data)
```

## Engine vs. data repo

This repo is the **engine** plus a demo dataset. Real users keep their data in a separate tiny repo (just `data/`, `chronicle.config.yaml`, and a caller workflow) and invoke the reusable workflow `.github/workflows/build-deploy.yml`, which checks out the engine, overlays the data repo's `data/` and `chronicle.config.yaml` on top, then builds. Consequences:

- `data/` here is sample data — it must stay valid (engine self-tests run against it in CI) and exercise the formats documented in README.md.
- Breaking changes to data formats are breaking changes for downstream data repos; they require a major version tag and release notes.
- `astro.config.mjs` reads only `site`/`base` from `chronicle.config.yaml`; full config validation is in `src/lib/config.ts`.

## Data flow

1. **`src/lib/schema.ts`** — Zod `strictObject` schemas for players, groups, games, sessions, manual badges. All cross-reference ids are kebab-case (`idSchema`). Dates normalize to `YYYY-MM-DD` strings (js-yaml may parse them as `Date`). A session's `id` is derived from its filename (`data/sessions/YYYY-MM-DD-<game>.yaml` minus extension).
2. **`src/lib/load.ts`** — `loadChronicle('data')` parses every file and validates all cross-references (unknown player/group/game/faction ids, duplicate ids). Any problem throws `ChronicleError` naming the file — the build **fails loudly by design**; never let bad data degrade silently. Sessions come out sorted chronologically ascending (date, then id) and all downstream code relies on that ordering.
3. **`src/lib/site.ts`** — `getSite()` is the single entry point pages use: loads the chronicle, computes awards, and exposes name/avatar lookup helpers. Cached in a module-level singleton (loaded once per build). `href(path)` prefixes the configured base path (GitHub Pages subpath) — always use it for internal links.
4. **`src/lib/stats.ts`** — pure functions over `Session[]` (leaderboard, faction stats, head-to-head, streaks). Each has tests in `stats.test.ts`.
5. **`src/pages/`** — Astro pages render from `getSite()`. Dynamic routes (`players/[id]`, `games/[id]`, etc.) use `getStaticPaths`.

## Badge engine

`src/badges/engine.ts` `computeAwards(chronicle)` runs every `BadgeRule` over the full pre-sorted session list, merges hand-awarded badges from `data/badges/manual.yaml`, and returns a deterministic, date-sorted `Award[]`.

To add a rule: write a small factory in `src/badges/rules/` returning a `BadgeRule` (see `streaks.ts` for the pattern; tiered rules like `milestones.ts` take `TierThresholds`), register it in the `defaultRules` list in `src/badges/config.ts` (thresholds are tuned there too), and add a test in `src/badges/engine.test.ts`. `badgeId` must be a stable kind-id (e.g. `faction-first-win:root:eyrie`); rules must derive everything from the chronicle alone so recomputation stays deterministic.

## "Log a play" form (issue-driven logging)

An opt-in flow that lets non-git users log sessions from the site. Off by default; a data repo enables it by setting `dataRepoUrl` in its `chronicle.config.yaml` (this also makes the nav link appear) and adding a caller workflow for `.github/workflows/log-issue.yml`.

- **`src/lib/log-session.ts`** — pure helpers shared by the form and the validator: form input → session YAML (must match hand-written file style and round-trip `SessionSchema`), issue title/body, prefilled new-issue URL.
- **`src/pages/log.astro`** — the form. Build-time data is baked into a JSON island; the client script generates YAML and opens a prefilled GitHub issue on `dataRepoUrl` (no backend).
- **`scripts/validate-session.ts`** — CI/CLI validator (`npm run validate-session -- --yaml-file <f> --data-dir <d>`): schema + full `loadChronicle` cross-ref checks, collision-safe filename, emits a `===RESULT===` JSON line consumed by the workflow.
- **`.github/workflows/log-issue.yml`** — reusable workflow: on issue opened/edited (gated on `log` label or `[log]` title) validate + comment preview/errors; on the `approved` label (added by someone with write/admin permission) commit the session file to the data repo and close the issue. Exposes a `committed` output so callers can chain `build-deploy.yml` — GITHUB_TOKEN pushes don't trigger push workflows.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml` (this repo's own demo site): tests → Astro build → GitHub Pages. `build-deploy.yml` is the reusable workflow for data repos and takes an `engine-ref` input to pin an engine version.
