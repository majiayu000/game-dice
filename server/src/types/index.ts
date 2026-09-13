export interface Player {
  id: string;
  name: string;
  dice: number[];
  isCurrentTurn: boolean;
  isAI: boolean;
  isConnected: boolean;
  seatIndex: number;
}

export interface Bid {
  count: number;
  value: number;
  playerId: string;
  isZhai?: boolean;
}

export type GamePhase = 'waiting' | 'rolling' | 'bidding' | 'result';

export interface GameState {
  roomId: string;
  players: Player[];
  currentBid: Bid | null;
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: string | null;
  loser: string | null;
  round: number;
  turnTimeLimit: number;
  turnStartTime: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  isAI: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  turnTimeLimit: number;
  aiDifficulty: 'easy' | 'normal' | 'hard';
}

export interface Room {
  id: string;
  code: string;
  host: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  status: 'waiting' | 'playing' | 'finished';
}

export interface Session {
  id: string;
  oderId: string;
  socketId: string;
  roomId: string | null;
}

// 错误码定义
export const ErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  NOT_HOST: 'NOT_HOST',
  CANNOT_START: 'CANNOT_START',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_BID: 'INVALID_BID',
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  INVALID_AUTH: 'INVALID_AUTH',
  INVALID_PHASE: 'INVALID_PHASE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface GameError {
  code: ErrorCode;
  message: string;
}
