import { createHmac, timingSafeEqual } from "crypto";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const server = createServer();
const wss = new WebSocketServer({ server });
const socketState = new WeakMap<
  import("ws").WebSocket,
  { userId: string; groupId: string }
>();

wss.on("connection", async (socket, request) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token");
  const state = token ? verifyToken(token) : null;
  if (!state) {
    socket.close(1008, "Unauthorized");
    return;
  }

  const membership = await db.groupMembership.findUnique({
    where: {
      userId_groupId: {
        userId: state.userId,
        groupId: state.groupId
      }
    }
  });

  if (!membership) {
    socket.close(1008, "Not a member");
    return;
  }

  socketState.set(socket, state);

  socket.on("message", async (raw) => {
    const current = socketState.get(socket);
    if (!current) {
      socket.close(1008, "Unauthorized");
      return;
    }

    const payload = JSON.parse(raw.toString()) as { content: string };

    const message = await db.groupMessage.create({
      data: {
        userId: current.userId,
        groupId: current.groupId,
        content: payload.content
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    const outgoing = JSON.stringify({ type: "group.message", message });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(outgoing);
      }
    }
  });
});

const port = Number(process.env.REALTIME_PORT ?? "3001");
server.listen(port, () => {
  console.log(`StudyHub realtime server listening on ${port}`);
});

function verifyToken(token: string): { userId: string; groupId: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId: string;
    groupId: string;
    exp: number;
  };

  if (parsed.exp < Date.now()) return null;
  return { userId: parsed.userId, groupId: parsed.groupId };
}

function sign(payload: string): string {
  const secret = process.env.REALTIME_SECRET;
  if (!secret) throw new Error("Missing REALTIME_SECRET");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
