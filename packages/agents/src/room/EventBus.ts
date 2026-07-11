import { EventEmitter } from "node:events";
import type { RoomEvent, RoomEventType } from "../types.js";

type Listener = (event: RoomEvent) => void;

/**
 * Typed EventEmitter for room lifecycle events:
 * message, heartbeat, agent_down, debate_end, settlement_proposal, etc.
 */
export class EventBus {
  private readonly ee = new EventEmitter();

  constructor() {
    this.ee.setMaxListeners(100);
  }

  emitEvent<T>(type: RoomEventType, roomId: string, data: T): RoomEvent<T> {
    const event: RoomEvent<T> = {
      type,
      roomId,
      timestamp: Date.now(),
      data,
    };
    this.ee.emit("event", event);
    this.ee.emit(type, event);
    this.ee.emit(`room:${roomId}`, event);
    return event;
  }

  onEvent(listener: Listener): () => void {
    this.ee.on("event", listener);
    return () => this.ee.off("event", listener);
  }

  onType(type: RoomEventType, listener: Listener): () => void {
    this.ee.on(type, listener);
    return () => this.ee.off(type, listener);
  }

  onRoom(roomId: string, listener: Listener): () => void {
    const key = `room:${roomId}`;
    this.ee.on(key, listener);
    return () => this.ee.off(key, listener);
  }

  onceType(type: RoomEventType, listener: Listener): void {
    this.ee.once(type, listener);
  }

  removeAllListeners(): void {
    this.ee.removeAllListeners();
  }
}
