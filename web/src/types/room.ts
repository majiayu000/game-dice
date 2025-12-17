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
