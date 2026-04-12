/**
 * Socket.io server boilerplate for SmartNotes.
 *
 * Rooms strategy
 * ──────────────
 *  Every connected socket is automatically joined into two rooms:
 *    • "group:<studyGroup>"  – e.g. "group:4ID12B"
 *    • "year:<yearOfStudy>"  – e.g. "year:3"
 *  This lets the server emit targeted notifications for:
 *    • GROUP-visibility files → emit to "group:<studyGroup>"
 *    • YEAR-visibility files  → emit to "year:<yearOfStudy>"
 *    • USER-visibility files  → emit to the individual socket (private room)
 *
 * Usage (standalone / custom server)
 * ───────────────────────────────────
 *  import http from "http";
 *  import { createSocketServer } from "./server/socket";
 *
 *  const httpServer = http.createServer(app);
 *  const io = createSocketServer(httpServer);
 *  httpServer.listen(3001);
 */

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

// ─── Event Contracts ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  /** Emitted when a file is shared with the receiving user, group, or year. */
  fileShared: (payload: FileSharedPayload) => void;
}

export interface ClientToServerEvents {
  /** Client must emit this after connecting to join the correct rooms. */
  register: (payload: RegisterPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  studyGroup: string;
  yearOfStudy: number;
}

export interface RegisterPayload {
  userId: string;
  studyGroup: string;
  yearOfStudy: number;
}

export interface FileSharedPayload {
  fileId: string;
  fileName: string;
  authorId: string;
  visibility: "USER" | "GROUP" | "YEAR";
  targetValue: string;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Attaches a Socket.io server to an existing HTTP server and returns it.
 * The `allowedOrigins` parameter should list the front-end origin(s)
 * (e.g. ["http://localhost:3000", "https://smartnotes.prz.edu.pl"]).
 */
export function createSocketServer(
  httpServer: HttpServer,
  allowedOrigins: string[] = ["http://localhost:3000"]
): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    // ── register ────────────────────────────────────────────────────────────
    socket.on("register", ({ userId, studyGroup, yearOfStudy }) => {
      socket.data.userId = userId;
      socket.data.studyGroup = studyGroup;
      socket.data.yearOfStudy = yearOfStudy;

      // Join group and year rooms
      socket.join(`group:${studyGroup}`);
      socket.join(`year:${yearOfStudy}`);
      // Also join a personal room (used for USER-visibility notifications)
      socket.join(`user:${userId}`);

      console.log(
        `[socket] ${socket.id} registered as user=${userId}, group=${studyGroup}, year=${yearOfStudy}`
      );
    });

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`[socket] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

// ─── Notification Helpers ─────────────────────────────────────────────────────

type IoInstance = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Emits a "fileShared" notification to the appropriate room(s) based on the
 * SharePermission visibility level.
 *
 * Call this from your API route after creating the SharePermission record.
 */
export function notifyFileShared(
  io: IoInstance,
  payload: FileSharedPayload
): void {
  switch (payload.visibility) {
    case "USER":
      io.to(`user:${payload.targetValue}`).emit("fileShared", payload);
      break;
    case "GROUP":
      io.to(`group:${payload.targetValue}`).emit("fileShared", payload);
      break;
    case "YEAR":
      io.to(`year:${payload.targetValue}`).emit("fileShared", payload);
      break;
  }
}
