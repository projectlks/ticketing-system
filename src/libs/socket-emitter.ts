import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_PATH =
  process.env.WEB_SOCKET_PATH ||
  process.env.NEXT_PUBLIC_WEB_SOCKET_PATH ||
  "/socket.io";
const SOCKET_TOKEN =
  process.env.WEB_SOCKET_TOKEN || process.env.NEXT_PUBLIC_WEB_SOCKET_TOKEN;

function resolveSocketUrl() {
  const configured =
    process.env.WEB_SOCKET_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEB_SOCKET_URL?.trim();
  if (configured) return configured;

  const port =
    process.env.WEB_SOCKET_PORT ||
    process.env.NEXT_PUBLIC_WEB_SOCKET_PORT ||
    "3010";
  return `http://127.0.0.1:${port}`;
}

function getEmitterSocket(): Socket {
  if (!socket) {
    const url = resolveSocketUrl();
    const options = {
      path: SOCKET_PATH,
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: SOCKET_TOKEN ? { token: SOCKET_TOKEN } : undefined,
    };

    socket = io(url, options);
    socket.on("connect_error", (err) => {
      console.error("[socket-emitter] connection error:", err.message);
    });
    socket.connect();
  }

  return socket;
}

function emitEvent(event: string, payload: Record<string, unknown>) {
  try {
    const sock = getEmitterSocket();
    if (sock.connected) {
      sock.emit(event, payload);
      return;
    }

    sock.once("connect", () => {
      sock.emit(event, payload);
    });
  } catch (error) {
    console.error("[socket-emitter] emit failed", {
      event,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function emitTicketsChanged(payload: Record<string, unknown>) {
  emitEvent("tickets-changed", payload);
}

export function emitAlertsChanged(payload: Record<string, unknown>) {
  emitEvent("alerts-changed", payload);
}
