import { create } from 'zustand';
import type { GameState } from '../types/game';
import type { Room } from '../types/room';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface GameStore {
  connectionState: ConnectionState;
  userId: string;
  userName: string;
  currentRoom: Room | null;
  gameState: GameState | null;
  error: string | null;

  setConnectionState: (state: ConnectionState) => void;
  setUser: (id: string, name: string) => void;
  setRoom: (room: Room | null) => void;
  setGameState: (state: GameState | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connectionState: 'disconnected',
  userId: '',
  userName: '',
  currentRoom: null,
  gameState: null,
  error: null,

  setConnectionState: (connectionState) => set({ connectionState }),
  setUser: (userId, userName) => set({ userId, userName }),
  setRoom: (currentRoom) => set({ currentRoom }),
  setGameState: (gameState) => set({ gameState }),
  setError: (error) => set({ error }),
  reset: () => set({ currentRoom: null, gameState: null, error: null }),
}));
