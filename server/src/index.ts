import { Elysia } from "elysia";
import type { Context } from "elysia";
export { Room } from "./room.do";
import { Stream } from "@elysiajs/stream";

interface CF extends Context {
  env: Env;
  // ctx: ExecutionContext;
}

const app = new Elysia({ aot: false });

app
  .get("/rooms*", (c: CF) => {
    const room = c.env.ROOM.get(c.env.ROOM.idFromName("singleton"));
    return room.fetch(c.request);
  })
  .get(
    "/sse",
    (c: CF) =>
      new Stream(async (stream) => {
        stream.send("hello");
        await stream.wait(1000);
        stream.send("world");
        stream.close();
      })
  );

export default {
  async fetch(request: Request, env: Env, ctx: Context) {
    return app.decorate({ env }).fetch(request);
  },
};
