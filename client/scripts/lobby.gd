extends Control

const UUID = preload("res://addons/uuid.gd")

@onready var player_id: LineEdit = $VBoxContainer/GridContainer/PlayerId
@onready var room_id: LineEdit = $VBoxContainer/GridContainer/RoomId
@onready var player_name: LineEdit = $VBoxContainer/GridContainer/PlayerName
@onready var join_btn: Button = $VBoxContainer/Join
@onready var matching: Matching = $Matching

func _ready() -> void:
  player_id.editable = false
  player_id.text = UUID.v4()
  join_btn.pressed.connect(join)
#debug
  room_id.text = "test"
  player_name.text = str(randi())
  get_tree().create_timer(1).timeout.connect(func():
    join_btn.pressed.emit()
  )

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
  pass

func join():
  if not room_id.text or not player_name.text:
    return
  # Start Matching
  matching.join_room(room_id.text, player_id.text, player_name.text)
  join_btn.disabled = true
    
  
