/**
 * Holds the Socket.io Server instance so routes can emit events
 * without creating circular dependencies with server/src/index.ts.
 */
import { Server } from "socket.io";

let _io: Server | null = null;

export function setIo(io: Server): void {
  _io = io;
}

export function getIo(): Server {
  if (!_io) throw new Error("Socket.io server not initialized yet.");
  return _io;
}
