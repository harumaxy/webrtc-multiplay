import { type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import * as schemas from "./schemas";
import { PartialDeep } from "type-fest";

type RoomState = Static<typeof schemas.roomStateSchema>;
type PlayerWsTags = [playerId: string, name: string, roomId: string];
const MAX_PLAYERS = 2;

export function messageHandler(
  roomId: string,
  msg: Static<typeof schemas.messageSchema>,
  from: WebSocket,
  state: DurableObjectState
) {
  console.log(msg.event, roomId);

  switch (msg.event) {
    case "join": {
      return onJoin(msg, from, state);
    }
    case "leave": {
      return onLeave(msg, from, state);
    }
    // case "matched": {
    //   return onMatched(msg, from, state);
    // }
    case "sdp":
    case "ice_candidate": {
      return broadcast(msg, roomId, state);
    }
    case "webrtc_connected": {
      return onWebRtcConnected(msg, from, state);
    }
    // case "game_start": {
    //   return onGameStart(msg);
    // }
  }
}

function broadcast(
  msg: Static<typeof schemas.messageSchema>,
  roomId: string,
  state: DurableObjectState
) {
  const socketsInRoom = state.getWebSockets(roomId);
  for (const socket of socketsInRoom) {
    socket.send(JSON.stringify(msg));
  }
}

async function closeRoom(roomId: string, state: DurableObjectState) {
  const socketsInRoom = state.getWebSockets(roomId);
  for (const socket of socketsInRoom) {
    socket.close();
  }
  await state.storage.delete(roomId);
}

// function sendOthers(
//   msg: Static<typeof messageSchema>,
//   roomId: string,
//   from: WebSocket,
//   state: DurableObjectState
// ) {
//   const socketsInRoom = state.getWebSockets(roomId).filter((s) => s !== from);
// }

async function onJoin(
  msg: Static<typeof schemas.join>,
  from: WebSocket,
  state: DurableObjectState
) {
  const { room_id, player } = msg;
  let roomState = await state.storage.get<RoomState>(room_id, {
    allowConcurrency: false,
  });
  if (!roomState || !Value.Check(schemas.roomStateSchema, roomState)) {
    console.log("create new room", room_id);
    roomState = {
      room_id,
      players: {},
    };
  }
  roomState.players[player.id] = player;
  await state.storage.put(room_id, roomState, {
    allowConcurrency: false,
  });
  broadcast(msg, room_id, state);

  // check matched
  const playerNum = Object.keys(roomState.players).length;
  console.log({ playerNum, room_id });

  if (playerNum > MAX_PLAYERS) {
    console.error("participants exceeded");
    return closeRoom(room_id, state);
  }
  console.log("before matched", playerNum, MAX_PLAYERS);

  if (playerNum === MAX_PLAYERS) {
    console.log("matched");
    return onMatched(state, roomState);
  }
}

async function onLeave(
  msg: Static<typeof schemas.leave>,
  from: WebSocket,
  state: DurableObjectState
) {
  const { room_id, player } = msg;
  let roomState = await state.storage.get<RoomState>(room_id);
  if (!Value.Check(schemas.roomStateSchema, roomState)) {
    return;
  }
  const newRoomState = {
    ...roomState,
    players: Object.fromEntries(
      Object.entries(roomState.players).filter(([id]) => id !== player.id)
    ),
  };

  await state.storage.put(room_id, newRoomState);
  broadcast(msg, room_id, state);
}

async function onMatched(state: DurableObjectState, roomState: RoomState) {
  // assign peer_id
  const newRoomState = {
    ...roomState,
    players: Object.fromEntries(
      Object.entries(roomState.players).map(([id, player], i) => [
        id,
        { ...player, peer_id: i + 1, connected: false },
      ])
    ),
  };
  await state.storage.put(roomState.room_id, newRoomState);
  const matched = {
    event: "matched",
    players: newRoomState.players,
  } satisfies Static<typeof schemas.matched>;
  await broadcast(matched, roomState.room_id, state);
}

async function onWebRtcConnected(
  msg: Static<typeof schemas.webRtcConnected>,
  from: WebSocket,
  state: DurableObjectState
) {
  const [playerId, name, roomId] = state.getTags(from) as PlayerWsTags;
  const roomState = await state.storage.get<RoomState>(roomId);
  if (!roomState || !Value.Check(schemas.roomStateSchema, roomState)) {
    return closeRoom(roomId, state);
  }

  roomState.players[playerId].connected = true;

  if (Object.values(roomState.players).every((p) => p.connected)) {
    await onGameStart(roomState, state);
  }

  await state.storage.put(roomId, roomState);
}

async function onGameStart(roomState: RoomState, state: DurableObjectState) {
  console.log("game start", roomState.room_id);

  await broadcast({ event: "game_start" }, roomState.room_id, state);
  return state.storage.delete(roomState.room_id);
}
