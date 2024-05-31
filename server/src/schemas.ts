import * as t from "@sinclair/typebox";

const Nullable = <T extends t.TSchema>(schema: T) =>
  t.Union([schema, t.Null()]);

export const playerSchema = t.Object({
  id: t.String(),
  name: t.String(),
  peer_id: Nullable(t.Number()),
  connected: t.Boolean(),
});

export const roomStateSchema = t.Object({
  room_id: t.String(),
  players: t.Record(t.String(), playerSchema), // player_id -> player
});

// Websocket messages
export const join = t.Object({
  event: t.Literal("join"),
  room_id: t.String(),
  player: playerSchema,
});
export const leave = t.Object({
  event: t.Literal("leave"),
  room_id: t.String(),
  player: playerSchema,
});
export const matched = t.Object({
  event: t.Literal("matched"),
  players: t.Record(t.String(), t.Required(playerSchema)),
});
export const sdp = t.Object({
  event: t.Literal("sdp"),
  to_peer_id: t.Number(),
  from_peer_id: t.Number(),
  type: t.Union([t.Literal("offer"), t.Literal("answer")]),
  sdp: t.String(),
});
export const iceCandidate = t.Object({
  event: t.Literal("ice_candidate"),
  to_peer_id: t.Number(),
  from_peer_id: t.Number(),
  media: t.String(),
  index: t.Number(),
  name: t.String(),
});
export const webRtcConnected = t.Object({
  event: t.Literal("webrtc_connected"),
  peer_id: t.Number(),
});
export const gameStart = t.Object({
  event: t.Literal("game_start"),
});
export const failed = t.Object({
  event: t.Literal("failed"),
  code: t.Number(),
  reason: t.String(),
});

export const messageSchema = t.Union([
  join,
  leave,
  matched,
  sdp,
  iceCandidate,
  webRtcConnected,
  gameStart,
]);
