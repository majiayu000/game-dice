import type { Bid, GameState, Player, Room } from '../types/index.js';
import { rollDice, countDice, isValidBid, challenge } from '../utils/gameLogic.js';
import { makeAIDecision } from '../utils/aiLogic.js';

export class GameEngine {
  private games = new Map<string, GameState>();
  private timers = new Map<string, NodeJS.Timeout>();
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private onAIAction?: (roomId: string, decision: { action: string; bid?: Bid }) => void;
  private onPlayerTimeout?: (roomId: string, playerId: string) => void;

  // 游戏结束后自动清理的延迟时间（5分钟）
  private static readonly CLEANUP_DELAY = 5 * 60 * 1000;

  setAIActionCallback(cb: (roomId: string, decision: { action: string; bid?: Bid }) => void) {
    this.onAIAction = cb;
  }

  setPlayerTimeoutCallback(cb: (roomId: string, playerId: string) => void) {
    this.onPlayerTimeout = cb;
  }

  initGame(room: Room): GameState {
    const players: Player[] = room.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      dice: rollDice(),
      isCurrentTurn: i === 0,
      isAI: p.isAI,
      isConnected: true,
      seatIndex: i
    }));

    const state: GameState = {
      roomId: room.id,
      players,
      currentBid: null,
      currentPlayerIndex: 0,
      phase: 'bidding',
      winner: null,
      loser: null,
      round: 1,
      turnTimeLimit: room.settings.turnTimeLimit,
      turnStartTime: Date.now()
    };

    this.games.set(room.id, state);
    this.scheduleAITurn(room.id, state, room.settings.aiDifficulty);
    return state;
  }

  makeBid(roomId: string, playerId: string, bid: Bid): GameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'bidding') return null;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;
    if (!isValidBid(bid, state.currentBid)) return null;

    state.currentBid = { ...bid, playerId };
    this.nextTurn(state);
    return state;
  }

  challenge(roomId: string, playerId: string): { state: GameState; actualCount: number; challengerWins: boolean } | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'bidding' || !state.currentBid) return null;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

    this.clearTimer(roomId);
    state.phase = 'result';

    const challengerWins = challenge(state.players, state.currentBid);
    const actualCount = countDice(state.players, state.currentBid.value, state.currentBid.isZhai);

    if (challengerWins) {
      state.winner = playerId;
      state.loser = state.currentBid.playerId;
    } else {
      state.winner = state.currentBid.playerId;
      state.loser = playerId;
    }

    return { state, actualCount, challengerWins };
  }

  nextRound(roomId: string): GameState | null {
    const state = this.games.get(roomId);
    if (!state) return null;

    const loserIndex = state.players.findIndex(p => p.id === state.loser);
    state.currentPlayerIndex = loserIndex >= 0 ? loserIndex : 0;

    for (const p of state.players) {
      p.dice = rollDice();
      p.isCurrentTurn = false;
    }
    state.players[state.currentPlayerIndex].isCurrentTurn = true;

    state.currentBid = null;
    state.phase = 'bidding';
    state.winner = null;
    state.loser = null;
    state.round++;
    state.turnStartTime = Date.now();

    const room = this.getRoom(roomId);
    if (room) this.scheduleAITurn(roomId, state, room.settings.aiDifficulty);

    return state;
  }

  getState(roomId: string): GameState | null {
    return this.games.get(roomId) || null;
  }

  private nextTurn(state: GameState) {
    state.players[state.currentPlayerIndex].isCurrentTurn = false;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.players[state.currentPlayerIndex].isCurrentTurn = true;
    state.turnStartTime = Date.now();

    const room = this.getRoom(state.roomId);
    if (room) this.scheduleAITurn(state.roomId, state, room.settings.aiDifficulty);
  }

  private scheduleAITurn(roomId: string, state: GameState, difficulty: 'easy' | 'normal' | 'hard') {
    this.clearTimer(roomId);
    if (state.phase !== 'bidding') return;

    const currentPlayer = state.players[state.currentPlayerIndex];

    if (currentPlayer.isAI) {
      // AI 玩家延迟操作
      const timer = setTimeout(() => {
        const decision = makeAIDecision(state, currentPlayer.id, difficulty);
        this.onAIAction?.(roomId, decision);
      }, 1500 + Math.random() * 1000);
      this.timers.set(roomId, timer);
    } else if (state.turnTimeLimit > 0) {
      // 人类玩家超时处理
      const timer = setTimeout(() => {
        this.onPlayerTimeout?.(roomId, currentPlayer.id);
      }, state.turnTimeLimit * 1000);
      this.timers.set(roomId, timer);
    }
  }

  private clearTimer(roomId: string) {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
  }

  // 清理游戏数据
  cleanupGame(roomId: string) {
    this.clearTimer(roomId);
    this.cancelCleanup(roomId);
    this.games.delete(roomId);
    this.rooms.delete(roomId);
  }

  // 延迟清理（游戏结束后调用）
  scheduleCleanup(roomId: string) {
    this.cancelCleanup(roomId);
    const timer = setTimeout(() => {
      this.cleanupGame(roomId);
    }, GameEngine.CLEANUP_DELAY);
    this.cleanupTimers.set(roomId, timer);
  }

  private cancelCleanup(roomId: string) {
    const timer = this.cleanupTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(roomId);
    }
  }

  // 获取当前活跃游戏数量（用于监控）
  getActiveGamesCount(): number {
    return this.games.size;
  }

  private rooms = new Map<string, Room>();
  setRoom(room: Room) { this.rooms.set(room.id, room); }
  private getRoom(roomId: string): Room | null { return this.rooms.get(roomId) || null; }
}
