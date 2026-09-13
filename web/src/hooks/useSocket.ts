import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socketService';
import type { Room } from '../types/room';
import type { GameState } from '../types/game';

export function useSocket() {
  const { userName, setUser, setConnectionState, setRoom, setGameState, setError } = useGameStore();

  const connect = useCallback(async () => {
    if (!userName) return;
    setConnectionState('connecting');
    try {
      const { userId } = await socketService.connect(userName);
      // Initial identity; reconnect replacements arrive via the `connected` listener.
      setUser(userId, userName);
      setConnectionState('connected');
    } catch {
      setConnectionState('disconnected');
      setError('连接服务器失败');
    }
  }, [userName, setUser, setConnectionState, setError]);

  useEffect(() => {
    const unsubscribers = [
      // Keep store identity in sync on initial connect and Socket.IO re-auth.
      socketService.on('connected', (data) => {
        const { userId } = data as { userId: string };
        if (!userId) return;
        const name = useGameStore.getState().userName;
        setUser(userId, name);
        setConnectionState('connected');
      }),
      socketService.on('room:created', (data) => setRoom((data as { room: Room }).room)),
      socketService.on('room:joined', (data) => setRoom((data as { room: Room }).room)),
      socketService.on('room:updated', (data) => setRoom((data as { room: Room }).room)),
      socketService.on('room:disbanded', () => { setRoom(null); setGameState(null); }),
      socketService.on('game:started', (data) => setGameState((data as { gameState: GameState }).gameState)),
      socketService.on('game:stateUpdate', (data) => setGameState((data as { gameState: GameState }).gameState)),
      socketService.on('error', (data) => setError((data as { message: string }).message)),
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [setUser, setConnectionState, setRoom, setGameState, setError]);

  return { connect };
}
