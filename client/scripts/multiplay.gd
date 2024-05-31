extends Node
class_name Multiplay

const game_scene := preload("res://scenes/game.tscn")

@rpc
func game_start():
  get_tree().change_scene_to_packed(game_scene)
