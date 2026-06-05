# 🎲 Boardgame Chronicle

A personal boardgame play log compiled into a static website. The git repo is the
database: each play session is a small YAML file. On every push, GitHub Actions
validates the data, recomputes all stats and badges, and deploys the site to
GitHub Pages.

**Live site:** https://mhb8898.github.io/boardgame-chronicle/

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
