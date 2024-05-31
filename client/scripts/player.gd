extends CharacterBody2D


const SPEED = 300.0
const JUMP_VELOCITY = -400.0


@onready var mp := get_tree().get_multiplayer()
@onready var player_name := $PlayerName
@onready var synchronizer := $MultiplayerSynchronizer

func _ready() -> void:
  if self.name.to_int() != mp.get_unique_id():
    self.set_physics_process(false)
  player_name.text = self.name
  
  
func _physics_process(delta: float) -> void:
  # Add the gravity.
  if not is_on_floor():
    velocity += get_gravity() * delta

  # Handle jump.
  if Input.is_action_just_pressed("ui_accept") and is_on_floor():
    velocity.y = JUMP_VELOCITY

  # Get the input direction and handle the movement/deceleration.
  # As good practice, you should replace UI actions with custom gameplay actions.
  var direction := Input.get_axis("ui_left", "ui_right")
  if direction:
    velocity.x = direction * SPEED
  else:
    velocity.x = move_toward(velocity.x, 0, SPEED)

  move_and_slide()
  rpc(StringName("sync_pos"), position)

@rpc("authority", "unreliable")
func sync_pos(pos: Vector2):
  self.position = pos
  
  
