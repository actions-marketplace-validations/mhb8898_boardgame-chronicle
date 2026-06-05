# 🎲 Boardgame Chronicle

A personal boardgame play log compiled into a static website. Your git repo is
the database: each play session is a small YAML file. On every push, GitHub
Actions validates the data, recomputes all stats and badges, and deploys the
site to GitHub Pages.

**Demo (this repo's sample data):** https://mhb8898.github.io/boardgame-chronicle/

## Use it for your own log

This repo is the **engine**. Your data lives in a separate, tiny repo — you
never fork or copy the engine code.

1. Create a new repo (public, for free GitHub Pages) with this layout:

   ```
   your-gamelog/
   ├── data/
   │   ├── players.yaml
   │   ├── groups.yaml
   │   ├── games.yaml
   │   ├── sessions/           # one YAML file per play
   │   └── badges/manual.yaml  # optional
   ├── chronicle.config.yaml
   └── .github/workflows/deploy.yml
   ```

   Copy the formats from this repo's `data/` directory (it's the demo dataset).

2. `chronicle.config.yaml`:

   ```yaml
   title: My Game Log
   site: https://YOUR-USERNAME.github.io
   base: /your-gamelog            # your repo name
   repoUrl: https://github.com/YOUR-USERNAME/your-gamelog   # optional footer link
   ```

3. `.github/workflows/deploy.yml`:

   ```yaml
   name: Deploy
   on:
     push: { branches: [main] }
     workflow_dispatch:
   permissions: { contents: read, pages: write, id-token: write }
   jobs:
     chronicle:
       uses: mhb8898/boardgame-chronicle/.github/workflows/build-deploy.yml@main
       # Pin a release for stability:
       # with: { engine-ref: v1.0.0 }
   ```

4. In your repo: **Settings → Pages → Source → GitHub Actions**. Push — your
   site is live.

### Upgrading

- Tracking `@main` (the default): every push of yours builds with the latest
  engine — nothing to do.
- Pinned to a tag: bump both the `@vX.Y.Z` in `uses:` and `engine-ref` when a
  new [release](https://github.com/mhb8898/boardgame-chronicle/releases) is out.

Your data never changes shape silently: any breaking data-format change comes
with a major version tag and release notes.

## Logging a session

Create one file per play in `data/sessions/`, named `YYYY-MM-DD-<game>.yaml`:

```yaml
date: 2026-06-05
game: root                # id from data/games.yaml
group: thursday-crew      # id from data/groups.yaml
location: Mahdi's place   # optional
notes: First Eyrie win!   # optional
players:
  - { player: mahdi, faction: eyrie, winner: true }
  - { player: sara, faction: marquise, score: 24 }
```

- `winner` defaults to `false`; multiple winners (co-op/teams) or zero winners
  (the game won) are both fine.
- `faction` and `score` are optional, but factions unlock faction badges.

Commit, push — done. The build **fails loudly** on any typo'd id, unknown
faction, or malformed file, so bad data never reaches the site.

## Adding players, groups, games

- `data/players.yaml` — roster: `id`, `name`, optional `avatar` emoji.
- `data/groups.yaml` — groups: `id`, `name`, `members` (player ids), optional `description`.
- `data/games.yaml` — registry: `id`, `name`, optional `factions` (`{id, name}` list),
  `bggId`, `minPlayers`, `maxPlayers`.

## Badges

Badges are **recomputed from the full log on every build** — fix old data and
history corrects itself.

Automatic rules (see `src/badges/config.ts` for thresholds):

| Badge | Earned by |
|---|---|
| 🌟 First Win: *game* | first victory in each game |
| 🚩 First win with *faction* in *game* | first victory with each faction |
| 🥉🥈🥇 *N* Games Played | 10 / 25 / 50 sessions |
| 🥉🥈🥇 *N* Wins | 5 / 15 / 30 victories |
| 🔥 On Fire | 3 wins in a row |
| 💎 Completionist: *game* | won with every faction of a game |
| 🥉🥈🥇 Explorer | played 5 / 10 / 20 distinct games |

**Hand-awarded badges** for special moments go in `data/badges/manual.yaml`:

```yaml
- id: comeback-king
  title: Comeback King
  description: Won after being last at mid-game.
  icon: "👑"
  player: mahdi
  session: 2026-06-05-root   # or a `date:` if not tied to a session
```

**New rule?** Write a small factory in `src/badges/rules/` returning a
`BadgeRule` (look at `streaks.ts` for the pattern), add it to
`src/badges/config.ts`, and add a test in `src/badges/engine.test.ts`.

## Development

```sh
npm install
npm test          # schema, stats, and badge-engine tests
npm run dev       # local dev server
npm run build     # full static build (validates all data)
```

## Deploying

Pushes to `main` run `.github/workflows/deploy.yml`: tests → Astro build →
GitHub Pages. One-time setup: repo **Settings → Pages → Source → GitHub Actions**.
