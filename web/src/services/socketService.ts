import { io, Socket } from 'socket.io-client';
import type { Bid } from '../types/game';
import type { RoomSettings } from '../types/room';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  /** Authenticate with display name only; server issues userId. */
  connect(userName: string): Promise<{ userId: string }> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        reject(new Error('已连接'));
        return;
      }

      this.socket?.disconnect();
      this.socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

      const timeout = setTimeout(() => reject(new Error('连接超时')), 5000);

      const onConnected = (data: { userId: string }) => {
        clearTimeout(timeout);
        this.socket?.off('error', onAuthError);
        if (!data?.userId) {
          reject(new Error('认证失败'));
          return;
        }
        resolve({ userId: data.userId });
      };

      const onAuthError = (err: { code?: string; message?: string }) => {
        if (err?.code === 'INVALID_AUTH') {
          clearTimeout(timeout);
          this.socket?.off('connected', onConnected);
          reject(new Error(err.message || '认证失败'));
        }
      };

      this.socket.on('connect', () => {
        // Never send a client-chosen userId; identity is server-assigned.
        this.socket?.emit('auth', { userName });
      });

      this.socket.on('connected', onConnected);
      this.socket.on('error', onAuthError);

      this.socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.setupListeners();
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  private setupListeners() {
    const events = [
      'room:created', 'room:joined', 'room:updated', 'room:playerJoined',
      'room:playerLeft', 'room:disbanded', 'game:started', 'game:stateUpdate',
      'game:bidMade', 'game:challenged', 'game:roundResult', 'error'
    ];
    events.forEach(event => {
      this.socket?.on(event, (data) => {
        this.listeners.get(event)?.forEach(cb => cb(data));
      });
    });
  }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  createRoom(settings: RoomSettings) {
    this.socket?.emit('room:create', { settings });
  }

  joinRoom(roomCode: string) {
    this.socket?.emit('room:join', { roomCode });
  }

  leaveRoom() {
    this.socket?.emit('room:leave');
  }

  setReady(ready: boolean) {
    this.socket?.emit('room:ready', { ready });
  }

  addAI() {
    this.socket?.emit('room:addAI');
  }

  removeAI(playerId: string) {
    this.socket?.emit('room:removeAI', { playerId });
  }

  startGame() {
    this.socket?.emit('room:start');
  }

  makeBid(bid: Bid) {
    this.socket?.emit('game:bid', { bid });
  }

  challenge() {
    this.socket?.emit('game:challenge');
  }

  nextRound() {
    this.socket?.emit('game:nextRound');
  }
}

export const socketService = new SocketService();
