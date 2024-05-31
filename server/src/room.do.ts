import { Value } from "@sinclair/typebox/value";
import { DurableObject } from "cloudflare:workers";
import Elysia from "elysia";
import { messageSchema } from "./schemas";
import { messageHandler } from "./handler";

interface RoomStatus {
  id: string;
}

type PlayerWsTags = [playerId: string, name: string, roomId: string];

const makeRoomApp = (ctx: DurableObjectState, env: Env) =>
  new Elysia({ aot: false })
    .decorate({ cfEnv: env, cfCtx: ctx })
    .get("/rooms", (c) => {
      return new Response("Hello from Rooms!", { status: 200 });
    })
    .get("/rooms/:id", async (c) => {
      const { upgrade } = c.headers;
      if (upgrade !== "websocket") {
        return new Response("ws upgrade header required", { status: 426 });
      }
      const { id: room_id } = c.params;
      const { player_id, player_name } = c.query;
      if (!player_id || !player_name) {
        return new Response("player_id and player_name required", {
          status: 400,
        });
      }

      const status = await c.cfCtx.storage.get<RoomStatus>(room_id);
      const { 0: client, 1: server } = new WebSocketPair();
      c.cfCtx.acceptWebSocket(server, [
        player_id,
        player_name,
        room_id,
      ] satisfies PlayerWsTags);
      console.log("WebSocket connected", { room_id, status });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    });

export class Room extends DurableObject {
  #app;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.#app = makeRoomApp(ctx, env);
  }

  async fetch(request: Request) {
    return this.#app.fetch(request);
  }

  async webSocketMessage(from: WebSocket, message: ArrayBuffer | string) {
    if (typeof message !== "string") {
      return;
    }
    const msg = JSON.parse(message);
    if (!Value.Check(messageSchema, msg)) {
      return console.error("invalid message", msg);
    }

    const [playerId, playerName, roomId] = this.ctx.getTags(from);
    await messageHandler(roomId, msg, from, this.ctx);
  }

  // prettier-ignore
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const [playerId, playerName, roomId] = this.ctx.getTags(ws)
    await messageHandler(roomId, { event: "leave", player: { id: playerId, name: playerName, peer_id: null, connected: false }, room_id: roomId }, ws, this.ctx)
    await this.ctx.storage.delete(roomId)
    console.log(`player ${playerId} left room ${roomId}`)
  }
}
