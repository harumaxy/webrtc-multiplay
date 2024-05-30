extends MarginContainer

var webrtc_mp := WebRTCMultiplayerPeer.new()
var webrtc_peer: WebRTCPeerConnection = (func():
  var wp = WebRTCPeerConnection.new()
  wp.initialize({
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      { "urls": "stun:stun.l.google.com:5349" },
      {
        "urls": 'turn:openrelay.metered.ca:80',
        "username": 'openrelayproject',
        "credentials": 'openrelayproject'
      }
    ]
  })
  return wp
).call()
var data_channel := webrtc_peer.create_data_channel("chat", {"id": 1, "negotiated": true})
var local_sdp_type: String = ""

@onready var local_sdp := $HBox/SDP/Local
@onready var remote_sdp := $HBox/SDP/Remote
@onready var create_offer_btn := $HBox/SDP/CreateOffer
@onready var set_remote_sdp_btn := $HBox/SDP/SetRemoteSDP
@onready var messages: RichTextLabel = $HBox/Chat/Panel/RichTextLabel


@onready var line_edit:LineEdit = $HBox/Chat/HBoxContainer/LineEdit
@onready var send_btn := $HBox/Chat/HBoxContainer/Button



func _ready():
  # Connect P1 session created to itself to set local description.
  webrtc_peer.session_description_created.connect(func(type, sdp):
    print(type, sdp)
    if local_sdp.text != "": return
    local_sdp_type = type
    local_sdp.text = sdp
    webrtc_peer.set_local_description(type, sdp)
  )
  webrtc_peer.ice_candidate_created.connect(func(media: String, index: int, name: String):
    print(media, index, name)
    local_sdp.text += "a=%s\n" % name
    pass
  )
  set_remote_sdp_btn.pressed.connect(func():
    var remote_sdp_type = "answer" if local_sdp_type == "offer" else "offer" 
    webrtc_peer.set_remote_description(remote_sdp_type, remote_sdp.text) 
    set_remote_sdp_btn.disabled = true
  )
  create_offer_btn.pressed.connect(func():
    if remote_sdp.text == "":
      webrtc_peer.create_offer()
      print("createOffer")
      create_offer_btn.disabled = true
  )
  send_btn.pressed.connect(send_messsage)
  line_edit.text_submitted.connect(func(_text): send_messsage())
  
  
  
  
  
  # Wait until data_channel will be ready  
  while data_channel.get_ready_state() != data_channel.STATE_OPEN: await get_tree().create_timer(1).timeout
  print("data channel open")
  
  messages.append_text("[color=orange]system> [/color] Data channel connected\n")
  send_btn.disabled = false
  

func _process(_delta):
  # Poll connections 
  #webrtc_peer.poll()
  # Check for messages
  if data_channel.get_available_packet_count() > 0:
    var message = data_channel.get_packet().get_string_from_utf8()
    messages.append_text("[color=red]other>[/color] %s\n" % message)
    
func send_messsage():
    var message = line_edit.text
    line_edit.text = ""
    messages.append_text("[color=green]me>[/color] %s\n" % message)
    data_channel.put_packet(message.to_utf8_buffer())  

