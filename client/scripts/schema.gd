class_name Schema

static var player = Z.schema({
  name=Z.string(),
  id=Z.string(),
  peer_id=Z.integer().nullable(),
  connected=Z.boolean()
})


static var join = Z.schema({
  event=Z.literal("join"),
  room_id=Z.string(),
  player=player
})

static var leave = Z.schema({
  event=Z.literal("leave"),
  room_id=Z.string(),
  player=player
})

static var matched = Z.schema({
  event=Z.literal("matched"),
  players=Z.dictionary()
})

static var sdp = Z.schema({
  event=Z.literal("sdp"),
  from_peer_id=Z.integer(),
  to_peer_id=Z.integer(),
  type=Z.string(),
  sdp=Z.string()
})

static var ice_candidate = Z.schema({
  event=Z.literal("ice_candidate"),
  from_peer_id=Z.integer(),
  to_peer_id=Z.integer(),
  media=Z.string(),
  index=Z.integer(),
  name=Z.string()
})

static var webrtc_connected = Z.schema({
  event=Z.literal("webrtc_connected"),
  peer_id=Z.integer()
})

static var game_start = Z.schema({
  event=Z.literal("game_start")
})

static var failed = Z.schema({
  event=Z.literal("failed"),
  code=Z.integer(),
  reason=Z.string()
})

static var message = Z.union([
  join,
  leave,
  matched,
  sdp,
  ice_candidate,
  webrtc_connected,
  game_start
])
