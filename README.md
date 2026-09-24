# Ice Skate Server

Colyseus multiplayer server for [Ice-Skate](../Ice-Skate), structured after
the sibling project's own backend, `server-laser-escape` — same stack
(`colyseus` + `@colyseus/schema` + Mongo persistence + Bloxity Legion
deploy), adapted to Ice-Skate's actual game state.

## :ice_skate: Usage

```
npm install
npm start
```

Then open http://localhost:2567 for the playground, or /monitor for the monitor.

## Structure

- `src/index.ts`: entry point — leave it alone if you plan to deploy to Colyseus Cloud
- `src/app.config.ts`: server configuration — rooms, HTTP routes, express middleware
- `src/rooms/RinkRoom.ts`: the single global room every client joins (`client.joinOrCreate("rink")`)
- `src/rooms/schema/RinkState.ts`: the state synchronized to every client in the room
- `src/db.ts`: Mongo-backed player-progress persistence (degrades to no-op if `MONGODB_URI` is unset/unreachable)
- `test/RinkRoom.test.ts`: boots the real server and connects real clients
- `loadtest/example.ts`: scriptable client for `npm run loadtest`
- `ecosystem.config.cjs`: pm2 configuration, used when deploying to Colyseus Cloud

## Scripts

- `npm start`: run the server in watch mode (`tsx watch src/index.ts`)
- `npm test`: run the mocha test suite
- `npm run build`: compile to `build/`
- `npm run loadtest`: connect N simulated clients with [`@colyseus/loadtest`](https://github.com/colyseus/colyseus-loadtest/)

## Wire protocol

`Ice-Skate/src/systems/net.js` implements this contract. Every field name
below matches `Ice-Skate/src/store/useGameStore.js` exactly, the same way
`server-laser-escape`'s `ArenaRoom` mirrors its own client's
`useGameStore.js`.

Join with `client.joinOrCreate("rink", { username, avatar, userId })`.
`userId` is the stable Bloxity user id (`systems/bloxity.js`'s
`getStableUserId()`) — omit it for a guest, whose progress simply isn't
persisted.

### Client → server messages

| Message | Payload | Cadence |
|---|---|---|
| `move` | `{ x, y, z, yaw, moveBlend }` | throttled, not per physics frame |
| `setAvatar` | `{ avatar }` (JSON string, same shape `avatarState.js` builds) | on connect + whenever the portal reports the avatar changed |
| `stats` | `{ speed, rebirth, wins, timePlayed }` | debounced on change |
| `saveProgress` | `{ speed, rebirth, wins, timePlayed, ownedHexPads, equippedHexPad, ownedAuras, equippedAura, ownedTargets, moveSpeed, moveSpeedLevelBonus }` | debounced on change; no-ops for a guest (no `userId`) |
| `identify` | `{ username, userId }` | whenever sign-in state changes after join |

`timePlayed` is total wall-clock seconds this account has spent in the game
(client `systems/playTime.js`), buffered client-side and flushed roughly
once a second — it's the stat `LeaderboardSign3` ("Most Time") ranks by.

### Server → client messages

| Message | Payload | When |
|---|---|---|
| `progress` | full saved `PlayerDoc` (see `src/db.ts`) | once, right after a signed-in join/identify, if a saved doc exists |
| `leaderboard` | `{ speed: Row[], rebirth: Row[], wins: Row[], timePlayed: Row[] }`, `Row = { id, name, value }` | every 15s, merging the live roster with all-time Mongo top scorers |

`RinkState.players` (keyed by `sessionId`) carries `username`, `x/y/z/yaw`,
`moveBlend`, `avatar`, `speed`, `rebirth`, `wins`, `timePlayed` for every
connected player.

## Environment

- `MONGODB_URI` — injected per game+channel by Bloxity Legion hosting; unset locally (persistence degrades to a no-op, same posture as every other external dependency in the client).
- `CLIENT_ORIGIN` — injected in deployed environments; CORS falls back to `*` locally.
- `PORT` — injected by Legion; falls back to 2567.

## Deploy

`.github/workflows/deploy.yml` builds a Docker image, pushes it to GHCR, and
calls the Bloxity Legion deploy API on every push to `dev` (→ `dev` channel)
or `main` (→ `prod` channel). It needs, per-repo:

- **Variable** `BLOXITY_GAME_ID` — the lowercase game ID from the Bloxity "My Games" dashboard (Settings → Secrets and variables → Actions → Variables).
- **Secret** `LEGION_DEPLOY_TOKEN` — the Legion deploy token (Settings → Secrets and variables → Actions → Secrets).

`GITHUB_TOKEN` (for the GHCR push) is provided automatically.
