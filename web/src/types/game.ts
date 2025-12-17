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
