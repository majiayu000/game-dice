import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socketService';
import type { Room } from '../types/room';
import type { GameState } from '../types/game';

export function useSocket() {
  const { userId, userName, setConnectionState, setRoom, setGameState, setError } = useGameStore();

  const connect = useCallback(async () => {
    if (!userId) return;
    setConnectionState('connecting');
    try {
      await socketService.connect(userId, userName);
      setConnectionState('connected');
    } catch {
      setConnectionState('disconnected');
      setError('连接服务器失败');
    }
  }, [userId, userName, setConnectionState, setError]);

  useEffect(() => {
    const unsubscribers = [
      socketService.on('room:created', (data) => setRoom((data as { room: Room }).room)),
      socketService.on('room:joined', (data) => setRoom((data as { room: Room }).room)),
      socketService.on('room:updated', (data) => setRoom((data as { room: Room }).room)),
      socketService.on('room:disbanded', () => { setRoom(null); setGameState(null); }),
      socketService.on('game:started', (data) => setGameState((data as { gameState: GameState }).gameState)),
      socketService.on('game:stateUpdate', (data) => setGameState((data as { gameState: GameState }).gameState)),
      socketService.on('error', (data) => setError((data as { message: string }).message)),
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [setRoom, setGameState, setError]);

  return { connect };
}
