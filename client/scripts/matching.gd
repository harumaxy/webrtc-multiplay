extends Node
class_name Matching

const MATCHING_WS_ENDPOINT = "ws://localhost:8787"
const WEB_RTC_CONFIG = {
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun.l.google.com:5349" },
    #{
      #"urls": 'turn:openrelay.metered.ca:80',
      #"username": 'openrelayproject',
      #"credentials": 'openrelayproject'
    #}
  ]
}

@onready var multiplay_apis: Multiplay = $Multiplay

var ws := WebSocketPeer.new()
var webrtc_mp = WebRTCMultiplayerPeer.new()

var my_player_id: String
var conn_map := {}
var player_map := {}

class Player:
  var id: String
  var name: String
  var peer_id: int
  var connected: bool

signal join(room_id: String, player: Player)
signal leave(room_id: String, player: Player)
signal matched(players: Array[Player])
signal sdp(peer_id: int, type: String, _sdp: String)
signal ice_candidate(peer_id: int, media: String, index: int, name: String)
#signal webrtc_connected(peer_id: int)
signal game_start()
signal failed(code: int, reason: String)

func _ready() -> void:
  matched.connect(_on_matched)
  sdp.connect(func(from_peer_id, _to_peer_id, type, _sdp):
    var conn: WebRTCPeerConnection=conn_map[from_peer_id]
    if not conn: return
    conn.set_remote_description(type, _sdp)
    print("remote description was set")
  )
  ice_candidate.connect(func(from_peer_id, _to_peer_id, media, index, name):
    await get_tree().create_timer(3).timeout
    var conn: WebRTCPeerConnection=conn_map[from_peer_id]
    if not conn: return
    print(_to_peer_id, from_peer_id)
    conn.add_ice_candidate(media, index, name)
    print("ice added to peer : " , from_peer_id)
  )
  webrtc_mp.peer_connected.connect(func(peer_id):
    print("connected: ", peer_id)
    var connected_player = player_map.values().filter(func(p): return p.peer_id == peer_id)[0]
    print("connected:", connected_player)
    if not connected_player: return
    connected_player.connected = true
    print(player_map)
    print("peer_connected ", peer_id)
    
    # check connected
    if player_map.values().all(func(p): return p.connected):
      var me = player_map[my_player_id]
      ws.send_text(JSON.stringify({event="webrtc_connected", peer_id=me.peer_id}))
  )
  webrtc_mp.peer_disconnected.connect(func(peer_id):
    print("disconnected: ", peer_id)
    # remove game_scene
    print("peer_disconnected ", peer_id)
  )
  game_start.connect(func():
    # start game
    print("game_start")
    multiplay_apis.game_start()
  )
  get_tree().get_multiplayer().connected_to_server.connect(func():
    print("i am client. I've been connected to server")
  )
  

func _process(delta: float) -> void:
  ws.poll()
  var state = ws.get_ready_state()
  if state != ws.STATE_OPEN: return
  while ws.get_available_packet_count():
    var msg = JSON.parse_string(ws.get_packet().get_string_from_utf8())
    if not Schema.message.parse(msg): return
    _emit(msg)
    

func _emit(message: Dictionary):
  match message.event:
    "join":
      join.emit(message.room_id, message.player)
      print("%s joined" % message.player.name)
    "leave":
      leave.emit(message.room_id, message.player)
      print("%s left" % message.player.name)
    "matched":
      matched.emit(message.players)
      print("matched")
    "sdp":
      var me = player_map[my_player_id]
      if message.from_peer_id == me.peer_id: return
      sdp.emit(message.from_peer_id, message.to_peer_id, message.type, message.sdp)
      print("sdp recieved from peer_id: %d" % message.from_peer_id)
    "ice_candidate":
      var me = player_map[my_player_id]
      if message.from_peer_id == me.peer_id: return
      ice_candidate.emit(message.from_peer_id, message.to_peer_id, message.media, message.index, message.name)
      print("ice_candidate recieved from peer_id: %d" % message.from_peer_id)
    #"webrtc_connected":
      #webrtc_connected.emit(message.peer_id)
      #print("webrtc_connected")
    "game_start":
      game_start.emit()
      print("game_start")

# create webrtc mesh
func _on_matched(players: Dictionary):
  player_map = players
  var me = player_map.get(my_player_id)
  me.connected = true
  var others = players.values().filter(func(p): return p.id != my_player_id)
  # setup WebRtcMultiplayerPeer
  webrtc_mp.create_mesh(me.peer_id)
  get_tree().get_multiplayer().multiplayer_peer = webrtc_mp
  for o in others:
    var conn := WebRTCPeerConnection.new()
    conn.initialize(WEB_RTC_CONFIG)
    conn_map[o.peer_id] = conn
    conn.session_description_created.connect(func(type: String, sdp: String):
      conn.set_local_description(type, sdp)
      var req={event="sdp", from_peer_id=me.peer_id, to_peer_id=o.peer_id, type=type, sdp=sdp}
      #if Schema.sdp.parse(req): push_error("Failed to parse sdp message")
      ws.send_text(JSON.stringify(req))
    )
    conn.ice_candidate_created.connect(func(media: String, index: int, name: String):
      print("ice created")
      var req={event="ice_candidate", from_peer_id=me.peer_id, to_peer_id=o.peer_id, media=media, index=index, name=name}
      ws.send_text(JSON.stringify(req))
    )
    webrtc_mp.add_peer(conn, o.peer_id, 0)
    if me.peer_id < o.peer_id:
      conn.create_offer()
    

func join_room(room_id: String, player_id: String, player_name: String):
  my_player_id = player_id
  var path = "/rooms/%s" % room_id
  var queries = "?player_id=%s&player_name=%s" % [my_player_id, player_name]
  var err = ws.connect_to_url(MATCHING_WS_ENDPOINT + path + queries)
  print("ws result ", err)
  for i in range(0, 10):
    print(i)
    await get_tree().create_timer(1).timeout
    if ws.get_ready_state() == ws.STATE_OPEN:
      var req = {event = "join", room_id = room_id, player = {id = player_id, name = player_name, peer_id=null,connected=false}}
      #if Schema.join.parse(req): push_error("Failed to parse join message")
      ws.send_text(JSON.stringify(req))
      return
  # If took more than 10 sec  
  push_error("Failed to connect")
  ws.close()
