import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { socketService } from '../services/socketService';
import './RoomPage.css';

export function RoomPage() {
  const navigate = useNavigate();
  const { userId, currentRoom, gameState } = useGameStore();
  useSocket();

  useEffect(() => {
    if (!currentRoom) navigate('/');
  }, [currentRoom, navigate]);

  useEffect(() => {
    if (gameState) navigate('/game');
  }, [gameState, navigate]);

  if (!currentRoom) return null;

  const isHost = currentRoom.host === userId;
  const me = currentRoom.players.find(p => p.id === userId);
  const canStart = currentRoom.players.length >= 2 && currentRoom.players.every(p => p.isReady);

  return (
    <div className="room-container">
      <div className="room-header">
        <button className="back-btn" onClick={() => socketService.leaveRoom()}>← 离开</button>
        <div className="room-code">
          <span>房间码</span>
          <strong>{currentRoom.code}</strong>
        </div>
      </div>

      <div className="players-grid">
        {Array.from({ length: currentRoom.settings.maxPlayers }).map((_, i) => {
          const player = currentRoom.players[i];
          return (
            <div key={i} className={`player-slot ${player ? 'filled' : 'empty'}`}>
              {player ? (
                <>
                  <div className="player-avatar">{player.isAI ? '🤖' : '👤'}</div>
                  <div className="player-name">
                    {player.name}
                    {player.isHost && <span className="host-badge">房主</span>}
                  </div>
                  <div className={`ready-status ${player.isReady ? 'ready' : ''}`}>
                    {player.isReady ? '✓ 已准备' : '等待中'}
                  </div>
                  {isHost && player.isAI && (
                    <button className="remove-ai" onClick={() => socketService.removeAI(player.id)}>移除</button>
                  )}
                </>
              ) : (
                <div className="empty-slot">空位</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="room-settings">
        <span>回合时限: {currentRoom.settings.turnTimeLimit}秒</span>
        <span>AI难度: {currentRoom.settings.aiDifficulty === 'easy' ? '简单' : currentRoom.settings.aiDifficulty === 'normal' ? '普通' : '困难'}</span>
      </div>

      <div className="room-actions">
        {isHost && currentRoom.players.length < currentRoom.settings.maxPlayers && (
          <button onClick={() => socketService.addAI()}>+ 添加AI</button>
        )}
        {!me?.isAI && (
          <button
            className={me?.isReady ? '' : 'primary'}
            onClick={() => socketService.setReady(!me?.isReady)}
          >
            {me?.isReady ? '取消准备' : '准备'}
          </button>
        )}
        {isHost && (
          <button className="primary start-btn" onClick={() => socketService.startGame()} disabled={!canStart}>
            开始游戏
          </button>
        )}
      </div>
    </div>
  );
}
