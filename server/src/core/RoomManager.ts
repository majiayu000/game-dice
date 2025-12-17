import { v4 as uuidv4 } from 'uuid';
import type { Room, RoomPlayer, RoomSettings } from '../types/index.js';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRoomMap = new Map<string, string>();

  createRoom(hostId: string, hostName: string, settings: RoomSettings): Room {
    const room: Room = {
      id: uuidv4(),
      code: this.generateCode(),
      host: hostId,
      players: [{ id: hostId, name: hostName, isHost: true, isReady: true, isAI: false }],
      settings,
      status: 'waiting'
    };
    this.rooms.set(room.id, room);
    this.playerRoomMap.set(hostId, room.id);
    return room;
  }

  joinRoom(playerId: string, playerName: string, roomCode: string): Room | null {
    const room = this.getRoomByCode(roomCode);
    if (!room || room.status !== 'waiting') return null;
    if (room.players.length >= room.settings.maxPlayers) return null;
    if (room.players.some(p => p.id === playerId)) return room;

    room.players.push({ id: playerId, name: playerName, isHost: false, isReady: false, isAI: false });
    this.playerRoomMap.set(playerId, room.id);
    return room;
  }

  leaveRoom(playerId: string): { room: Room | null; disbanded: boolean } {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return { room: null, disbanded: false };

    const room = this.rooms.get(roomId);
    if (!room) return { room: null, disbanded: false };

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRoomMap.delete(playerId);

    if (room.players.length === 0 || room.players.every(p => p.isAI)) {
      this.rooms.delete(roomId);
      return { room: null, disbanded: true };
    }

    if (room.host === playerId) {
      const newHost = room.players.find(p => !p.isAI);
      if (newHost) {
        room.host = newHost.id;
        newHost.isHost = true;
      }
    }

    return { room, disbanded: false };
  }

  addAI(roomId: string): RoomPlayer | null {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length >= room.settings.maxPlayers) return null;

    const aiCount = room.players.filter(p => p.isAI).length;
    const ai: RoomPlayer = {
      id: `ai-${uuidv4().slice(0, 8)}`,
      name: `AI ${aiCount + 1}`,
      isHost: false,
      isReady: true,
      isAI: true
    };
    room.players.push(ai);
    return ai;
  }

  removeAI(roomId: string, aiId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const idx = room.players.findIndex(p => p.id === aiId && p.isAI);
    if (idx === -1) return false;
    room.players.splice(idx, 1);
    return true;
  }

  setReady(playerId: string, ready: boolean): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const player = room.players.find(p => p.id === playerId);
    if (player) player.isReady = ready;
    return room;
  }

  canStart(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length < 2) return false;
    return room.players.every(p => p.isReady);
  }

  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !this.canStart(roomId)) return false;
    room.status = 'playing';
    return true;
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  getRoomByCode(code: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.code === code) return room;
    }
    return null;
  }

  getPlayerRoom(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }
}
