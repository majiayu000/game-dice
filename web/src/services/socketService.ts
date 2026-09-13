import { io, Socket } from 'socket.io-client';
import type { Bid } from '../types/game';
import type { RoomSettings } from '../types/room';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  /** True only after the server acknowledges identity via `connected`. */
  private authenticated = false;

  /** Authenticate with display name only; server issues userId. */
  connect(userName: string): Promise<{ userId: string }> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        reject(new Error('已连接'));
        return;
      }

      this.authenticated = false;
      this.socket?.disconnect();
      // Handshake auth runs before Socket.IO flushes any buffered emits on
      // reconnect, so room/game actions cannot race ahead of authentication.
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        auth: { userName },
      });

      const timeout = setTimeout(() => reject(new Error('连接超时')), 5000);
      let settled = false;

      const onConnected = (data: { userId: string }) => {
        if (!data?.userId) {
          this.authenticated = false;
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            this.socket?.off('error', onAuthError);
            reject(new Error('认证失败'));
          }
          return;
        }

        this.authenticated = true;
        // Fan out every identity (including reconnect re-auth) to store listeners.
        this.emitLocal('connected', data);

        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          this.socket?.off('error', onAuthError);
          resolve({ userId: data.userId });
        }
      };

      const onAuthError = (err: { code?: string; message?: string }) => {
        if (err?.code === 'INVALID_AUTH' && !settled) {
          settled = true;
          clearTimeout(timeout);
          this.socket?.off('connected', onConnected);
          reject(new Error(err.message || '认证失败'));
        }
      };

      this.socket.on('disconnect', () => {
        this.authenticated = false;
        this.emitLocal('disconnect', null);
      });

      this.socket.on('connected', onConnected);
      this.socket.on('error', onAuthError);

      this.socket.on('connect_error', (err) => {
        this.authenticated = false;
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      this.setupListeners();
    });
  }

  disconnect() {
    this.authenticated = false;
    this.socket?.disconnect();
    this.socket = null;
  }

  private emitLocal(event: string, data: unknown) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  /** Drop app emits until handshake auth completes (no offline send buffer). */
  private emitApp(event: string, data?: unknown) {
    if (!this.socket?.connected || !this.authenticated) return;
    if (data === undefined) {
      this.socket.emit(event);
    } else {
      this.socket.emit(event, data);
    }
  }

  private setupListeners() {
    const events = [
      'room:created', 'room:joined', 'room:updated', 'room:playerJoined',
      'room:playerLeft', 'room:disbanded', 'game:started', 'game:stateUpdate',
      'game:bidMade', 'game:challenged', 'game:roundResult', 'error'
    ];
    events.forEach(event => {
      this.socket?.on(event, (data) => {
        this.emitLocal(event, data);
      });
    });
  }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  createRoom(settings: RoomSettings) {
    this.emitApp('room:create', { settings });
  }

  joinRoom(roomCode: string) {
    this.emitApp('room:join', { roomCode });
  }

  leaveRoom() {
    this.emitApp('room:leave');
  }

  setReady(ready: boolean) {
    this.emitApp('room:ready', { ready });
  }

  addAI() {
    this.emitApp('room:addAI');
  }

  removeAI(playerId: string) {
    this.emitApp('room:removeAI', { playerId });
  }

  startGame() {
    this.emitApp('room:start');
  }

  makeBid(bid: Bid) {
    this.emitApp('game:bid', { bid });
  }

  challenge() {
    this.emitApp('game:challenge');
  }

  nextRound() {
    this.emitApp('game:nextRound');
  }
}

export const socketService = new SocketService();
