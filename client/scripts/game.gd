extends Node2D

const player_scene := preload("res://scenes/player.tscn")
@onready var mp = get_tree().get_multiplayer()
@onready var players := $Players

func _ready() -> void:
  var peer_ids = mp.get_peers()
  peer_ids.append(1)
  if !mp.is_server(): return
  for peer_id in peer_ids:
    var p := player_scene.instantiate() as Node2D
    p.name = str(peer_id)
    p.position.x += 200 * peer_id
    p.set_multiplayer_authority(peer_id, true)
    players.add_child(p)
    
