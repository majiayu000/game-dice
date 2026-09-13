import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from './core/RoomManager.js';
import { GameEngine } from './core/GameEngine.js';
import type { Bid, GameError } from './types/index.js';
import { ErrorCodes } from './types/index.js';
import { logger } from './utils/logger.js';
import { sanitizeRoomSettings } from './utils/roomSettings.js';

// 错误消息映射
const ErrorMessages: Record<string, string> = {
  [ErrorCodes.ROOM_NOT_FOUND]: '房间不存在或已满',
  [ErrorCodes.NOT_IN_ROOM]: '您不在任何房间中',
  [ErrorCodes.NOT_HOST]: '只有房主可以执行此操作',
  [ErrorCodes.CANNOT_START]: '无法开始游戏，请确保所有玩家已准备',
  [ErrorCodes.NOT_YOUR_TURN]: '还没轮到您操作',
  [ErrorCodes.INVALID_BID]: '无效的叫点',
  [ErrorCodes.GAME_NOT_STARTED]: '游戏尚未开始',
  [ErrorCodes.INVALID_AUTH]: '认证信息无效',
  [ErrorCodes.INVALID_PHASE]: '当前阶段无法执行此操作',
};

function createError(code: string): GameError {
  return { code: code as GameError['code'], message: ErrorMessages[code] || '未知错误' };
}

/** Reject non-object / non-integer bid payloads at the socket boundary. */
function parseBidPayload(data: unknown): Bid | null {
  if (!data || typeof data !== 'object') return null;
  const bid = (data as { bid?: unknown }).bid;
  if (!bid || typeof bid !== 'object') return null;

  const { count, value, isZhai, playerId } = bid as {
    count?: unknown;
    value?: unknown;
    isZhai?: unknown;
    playerId?: unknown;
  };

  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 2 || value > 6) return null;
  if (isZhai !== undefined && typeof isZhai !== 'boolean') return null;
  if (playerId !== undefined && typeof playerId !== 'string') return null;

  const parsed: Bid = { count, value, playerId: typeof playerId === 'string' ? playerId : '' };
  if (isZhai !== undefined) parsed.isZhai = isZhai;
  return parsed;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const roomManager = new RoomManager();
const gameEngine = new GameEngine();
/** Live userId → socket.id; one active connection per identity. */
const activeSessions = new Map<string, string>();

function releaseSession(userId: string, socketId: string) {
  if (userId && activeSessions.get(userId) === socketId) {
    activeSessions.delete(userId);
  }
}

gameEngine.setAIActionCallback((roomId, decision) => {
  const state = gameEngine.getState(roomId);
  if (!state) return;

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (decision.action === 'bid' && decision.bid) {
    const newState = gameEngine.makeBid(roomId, currentPlayer.id, decision.bid);
    if (newState) {
      io.to(roomId).emit('game:bidMade', {
        bid: decision.bid,
        nextPlayerId: newState.players[newState.currentPlayerIndex].id
      });
      io.to(roomId).emit('game:stateUpdate', { gameState: newState });
    }
  } else {
    const result = gameEngine.challenge(roomId, currentPlayer.id);
    if (result) {
      io.to(roomId).emit('game:challenged', { challengerId: currentPlayer.id });
      io.to(roomId).emit('game:roundResult', {
        actualCount: result.actualCount,
        challengerWins: result.challengerWins,
        winnerId: result.state.winner,
        loserId: result.state.loser,
        allDice: result.state.players.map(p => ({ id: p.id, dice: p.dice }))
      });
      io.to(roomId).emit('game:stateUpdate', { gameState: result.state });
    }
  }
});

// 玩家超时处理：自动开盅
gameEngine.setPlayerTimeoutCallback((roomId, playerId) => {
  const state = gameEngine.getState(roomId);
  if (!state || state.phase !== 'bidding') return;

  // 通知所有玩家超时
  io.to(roomId).emit('game:playerTimeout', { playerId });

  // 如果有当前叫点，自动开盅
  if (state.currentBid) {
    const result = gameEngine.challenge(roomId, playerId);
    if (result) {
      io.to(roomId).emit('game:challenged', { challengerId: playerId, isTimeout: true });
      io.to(roomId).emit('game:roundResult', {
        actualCount: result.actualCount,
        challengerWins: result.challengerWins,
        winnerId: result.state.winner,
        loserId: result.state.loser,
        allDice: result.state.players.map(p => ({ id: p.id, dice: p.dice }))
      });
      io.to(roomId).emit('game:stateUpdate', { gameState: result.state });
    }
  }
});

io.on('connection', (socket: Socket) => {
  let userId = '';
  let userName = '';
  logger.info('Socket', 'Client connected', { socketId: socket.id });

  const requireAuth = (): boolean => {
    if (!userId || activeSessions.get(userId) !== socket.id) {
      logger.warn('Auth', 'Unauthenticated handler rejected', { socketId: socket.id });
      socket.emit('error', createError(ErrorCodes.INVALID_AUTH));
      return false;
    }
    return true;
  };

  /** Bind a server-issued identity. Returns false when the attempt is rejected. */
  const authenticate = (rawName: unknown, source: 'handshake' | 'event'): boolean => {
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name || name.length > 20) {
      logger.warn('Auth', 'Invalid auth attempt', { socketId: socket.id, source });
      socket.emit('error', createError(ErrorCodes.INVALID_AUTH));
      return false;
    }

    // Identity is immutable for the lifetime of this socket. Re-auth would
    // orphan any RoomManager membership under the prior userId (ghost player /
    // stuck host), so reject instead of rotating.
    if (userId) {
      logger.warn('Auth', 'Rejected re-auth on authenticated socket', {
        userId,
        socketId: socket.id,
        source,
      });
      socket.emit('error', createError(ErrorCodes.INVALID_AUTH));
      return false;
    }

    const assignedId = uuidv4();
    const existingSocketId = activeSessions.get(assignedId);
    if (existingSocketId && existingSocketId !== socket.id) {
      logger.warn('Auth', 'Rejected duplicate live session', { userId: assignedId, socketId: socket.id });
      socket.emit('error', createError(ErrorCodes.INVALID_AUTH));
      return false;
    }

    userId = assignedId;
    userName = name;
    activeSessions.set(userId, socket.id);
    logger.info('Auth', 'User authenticated', { userId, userName, source });
    socket.emit('connected', { userId, sessionId: socket.id });
    return true;
  };

  // Prefer handshake auth so identity is bound before any buffered client
  // packets are delivered after a reconnect flush.
  const handshakeName = (socket.handshake.auth as { userName?: unknown } | undefined)?.userName;
  if (handshakeName !== undefined && handshakeName !== null && handshakeName !== '') {
    if (!authenticate(handshakeName, 'handshake')) {
      socket.disconnect(true);
      return;
    }
  }

  socket.on('auth', (data: { userName?: string; userId?: string }) => {
    // Ignore any client-supplied userId; identity is always server-issued.
    // Event-based auth remains as a fallback for clients without handshake auth.
    authenticate(data?.userName, 'event');
  });

  socket.on('room:create', (data: { settings?: unknown }) => {
    if (!requireAuth()) return;
    const settings = sanitizeRoomSettings(data?.settings);
    const room = roomManager.createRoom(userId, userName, settings);
    socket.join(room.id);
    logger.info('Room', 'Room created', {
      roomId: room.id,
      roomCode: room.code,
      host: userId,
      settings: room.settings,
    });
    socket.emit('room:created', { room });
  });

  socket.on('room:join', (data: { roomCode: string }) => {
    if (!requireAuth()) return;
    const room = roomManager.joinRoom(userId, userName, data.roomCode);
    if (!room) {
      logger.warn('Room', 'Join failed - room not found', { roomCode: data.roomCode, userId });
      socket.emit('error', createError(ErrorCodes.ROOM_NOT_FOUND));
      return;
    }
    socket.join(room.id);
    logger.info('Room', 'Player joined room', { roomId: room.id, userId });
    socket.emit('room:joined', { room });
    socket.to(room.id).emit('room:playerJoined', { player: room.players.find(p => p.id === userId) });
  });

  socket.on('room:leave', () => {
    if (!requireAuth()) return;
    const { room, disbanded } = roomManager.leaveRoom(userId);
    if (disbanded) {
      io.to(room?.id || '').emit('room:disbanded', {});
      if (room) gameEngine.cleanupGame(room.id);
    } else if (room) {
      socket.to(room.id).emit('room:playerLeft', { playerId: userId });
      socket.to(room.id).emit('room:updated', { room });
    }
    socket.leave(room?.id || '');
  });

  socket.on('room:ready', (data: { ready: boolean }) => {
    if (!requireAuth()) return;
    const room = roomManager.setReady(userId, data.ready);
    if (room) io.to(room.id).emit('room:updated', { room });
  });

  socket.on('room:addAI', () => {
    if (!requireAuth()) return;
    logger.debug('Room', 'addAI request', { userId });
    const room = roomManager.getPlayerRoom(userId);
    if (!room) {
      logger.warn('Room', 'addAI failed - not in room', { userId });
      socket.emit('error', createError(ErrorCodes.NOT_IN_ROOM));
      return;
    }
    if (room.host !== userId) {
      logger.warn('Room', 'addAI failed - not host', { userId, host: room.host });
      socket.emit('error', createError(ErrorCodes.NOT_HOST));
      return;
    }
    const ai = roomManager.addAI(room.id);
    if (ai) {
      const updatedRoom = roomManager.getRoom(room.id);
      logger.info('Room', 'AI added', { roomId: room.id, aiId: ai.id, playerCount: updatedRoom?.players.length });
      io.to(room.id).emit('room:updated', { room: updatedRoom });
    } else {
      logger.warn('Room', 'addAI failed - room full or not found', { roomId: room.id });
    }
  });

  socket.on('room:removeAI', (data: { playerId: string }) => {
    if (!requireAuth()) return;
    const room = roomManager.getPlayerRoom(userId);
    if (!room) {
      socket.emit('error', createError(ErrorCodes.NOT_IN_ROOM));
      return;
    }
    if (room.host !== userId) {
      socket.emit('error', createError(ErrorCodes.NOT_HOST));
      return;
    }
    if (roomManager.removeAI(room.id, data.playerId)) {
      io.to(room.id).emit('room:updated', { room: roomManager.getRoom(room.id) });
    }
  });

  socket.on('room:start', () => {
    if (!requireAuth()) return;
    const room = roomManager.getPlayerRoom(userId);
    if (!room) {
      socket.emit('error', createError(ErrorCodes.NOT_IN_ROOM));
      return;
    }
    if (room.host !== userId) {
      socket.emit('error', createError(ErrorCodes.NOT_HOST));
      return;
    }
    if (!roomManager.canStart(room.id)) {
      socket.emit('error', createError(ErrorCodes.CANNOT_START));
      return;
    }
    roomManager.startGame(room.id);
    gameEngine.setRoom(room);
    const gameState = gameEngine.initGame(room);
    logger.info('Game', 'Game started', { roomId: room.id, playerCount: room.players.length });
    io.to(room.id).emit('game:started', { gameState });
  });

  socket.on('game:bid', (data: unknown) => {
    if (!requireAuth()) return;
    const bid = parseBidPayload(data);
    if (!bid) {
      socket.emit('error', createError(ErrorCodes.INVALID_BID));
      return;
    }
    const room = roomManager.getPlayerRoom(userId);
    if (!room) {
      socket.emit('error', createError(ErrorCodes.NOT_IN_ROOM));
      return;
    }
    const currentState = gameEngine.getState(room.id);
    if (!currentState) {
      socket.emit('error', createError(ErrorCodes.GAME_NOT_STARTED));
      return;
    }
    if (currentState.players[currentState.currentPlayerIndex].id !== userId) {
      socket.emit('error', createError(ErrorCodes.NOT_YOUR_TURN));
      return;
    }
    const state = gameEngine.makeBid(room.id, userId, bid);
    if (!state) {
      socket.emit('error', createError(ErrorCodes.INVALID_BID));
      return;
    }
    io.to(room.id).emit('game:bidMade', {
      bid,
      nextPlayerId: state.players[state.currentPlayerIndex].id
    });
    io.to(room.id).emit('game:stateUpdate', { gameState: state });
  });

  socket.on('game:challenge', () => {
    if (!requireAuth()) return;
    const room = roomManager.getPlayerRoom(userId);
    if (!room) {
      socket.emit('error', createError(ErrorCodes.NOT_IN_ROOM));
      return;
    }
    const currentState = gameEngine.getState(room.id);
    if (!currentState) {
      socket.emit('error', createError(ErrorCodes.GAME_NOT_STARTED));
      return;
    }
    if (currentState.players[currentState.currentPlayerIndex].id !== userId) {
      socket.emit('error', createError(ErrorCodes.NOT_YOUR_TURN));
      return;
    }
    const result = gameEngine.challenge(room.id, userId);
    if (!result) {
      socket.emit('error', createError(ErrorCodes.INVALID_BID));
      return;
    }
    io.to(room.id).emit('game:challenged', { challengerId: userId });
    io.to(room.id).emit('game:roundResult', {
      actualCount: result.actualCount,
      challengerWins: result.challengerWins,
      winnerId: result.state.winner,
      loserId: result.state.loser,
      allDice: result.state.players.map(p => ({ id: p.id, dice: p.dice }))
    });
    io.to(room.id).emit('game:stateUpdate', { gameState: result.state });
  });

  socket.on('game:nextRound', () => {
    if (!requireAuth()) return;
    const room = roomManager.getPlayerRoom(userId);
    if (!room) {
      socket.emit('error', createError(ErrorCodes.NOT_IN_ROOM));
      return;
    }
    if (room.host !== userId) {
      socket.emit('error', createError(ErrorCodes.NOT_HOST));
      return;
    }
    const currentState = gameEngine.getState(room.id);
    if (!currentState) {
      socket.emit('error', createError(ErrorCodes.GAME_NOT_STARTED));
      return;
    }
    const state = gameEngine.nextRound(room.id);
    if (!state) {
      socket.emit('error', createError(ErrorCodes.INVALID_PHASE));
      return;
    }
    io.to(room.id).emit('game:stateUpdate', { gameState: state });
  });

  socket.on('disconnect', () => {
    logger.info('Socket', 'Client disconnected', { userId, socketId: socket.id });
    releaseSession(userId, socket.id);
    if (!userId) return;
    const { room, disbanded } = roomManager.leaveRoom(userId);
    if (disbanded && room) {
      logger.info('Room', 'Room disbanded', { roomId: room.id });
      gameEngine.cleanupGame(room.id);
    } else if (room) {
      socket.to(room.id).emit('room:playerLeft', { playerId: userId });
      socket.to(room.id).emit('room:updated', { room });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info('Server', `Server running on port ${PORT}`);
});
