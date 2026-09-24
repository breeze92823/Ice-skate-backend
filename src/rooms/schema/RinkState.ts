import { schema, t, type SchemaType } from "@colyseus/schema";

export const PlayerState = schema(
  {
    username: t.string().default(""), // client-reported Bloxity displayName/username, not validated
    x: t.number().default(0),
    y: t.number().default(0),
    z: t.number().default(0),
    yaw: t.number().default(0),
    // 0..1 eased gait factor (client Player.jsx's wishSpeed / SPEED, client
    // systems/net.js reportLocal()) -- purely cosmetic, drives remote skate
    // animation blend. Distinct from the `speed` stat field below.
    moveBlend: t.number().default(0),
    // The player's Bloxity avatar, so remote clients render the real character
    // (equipped cosmetics + proportions) instead of the capsule fallback. A
    // JSON string: {"e": <equipped ids object>, "p": <proportions object>}.
    // Client-reported, never validated -- same trust model as `username`;
    // only length-capped (see RinkRoom.ts AVATAR_MAX_LEN).
    avatar: t.string().default(""),
    // Live client-reported gameplay stats (client store/useGameStore.js
    // speed/rebirth/wins), so an in-world leaderboard can rank currently-
    // connected players. Client-reported, never validated beyond a
    // finite/non-negative check (RinkRoom.ts's `stats` handler) -- same
    // trust model as `username`/`avatar`. No persistence: like every other
    // field here, these reset to 0 for a player on rejoin and the whole room
    // resets on server restart.
    speed: t.number().default(0),
    rebirth: t.number().default(0),
    wins: t.number().default(0),
    // Total wall-clock seconds this account has spent in the game (client
    // systems/playTime.js), for the "Most Time" in-world leaderboard. Same
    // trust/persistence model as speed/rebirth/wins above.
    timePlayed: t.number().default(0),
  },
  "PlayerState",
);
export type PlayerState = SchemaType<typeof PlayerState>;

export const RinkState = schema(
  {
    players: t.map(PlayerState), // keyed by sessionId
  },
  "RinkState",
);
export type RinkState = SchemaType<typeof RinkState>;
