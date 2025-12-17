import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { socketService } from '../services/socketService';
import type { RoomSettings } from '../types/room';
import './LobbyPage.css';

export function LobbyPage() {
  const navigate = useNavigate();
  const { userId, userName, setUser, currentRoom, connectionState, error, setError } = useGameStore();
  const { connect } = useSocket();

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 4,
    turnTimeLimit: 30,
    aiDifficulty: 'normal'
  });

  useEffect(() => {
    if (!userId) {
      const id = `user-${Math.random().toString(36).slice(2, 10)}`;
      setUser(id, '');
    }
  }, [userId, setUser]);

  useEffect(() => {
    if (userId && userName && connectionState === 'disconnected') {
      connect();
    }
  }, [userId, userName, connectionState, connect]);

  useEffect(() => {
    if (currentRoom) navigate('/room');
  }, [currentRoom, navigate]);

  const handleEnter = () => {
    if (!name.trim()) return;
    setUser(userId, name.trim());
  };

  const handleCreate = () => {
    socketService.createRoom(settings);
    setShowCreate(false);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    socketService.joinRoom(roomCode.trim().toUpperCase());
  };

  if (!userName) {
    return (
      <div className="lobby-container">
        <h1>吹牛骰</h1>
        <div className="name-input">
          <input
            type="text"
            placeholder="输入你的昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
            maxLength={10}
          />
          <button onClick={handleEnter} disabled={!name.trim()}>进入游戏</button>
        </div>
      </div>
    );
  }

  if (connectionState !== 'connected') {
    return (
      <div className="lobby-container">
        <h1>吹牛骰</h1>
        <p>{connectionState === 'connecting' ? '连接中...' : '连接失败'}</p>
        {connectionState === 'disconnected' && (
          <button onClick={connect}>重新连接</button>
        )}
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <h1>吹牛骰</h1>
      <p className="welcome">欢迎, {userName}</p>

      {error && <p className="error" onClick={() => setError(null)}>{error}</p>}

      <div className="lobby-actions">
        <button className="primary" onClick={() => setShowCreate(true)}>创建房间</button>
        <div className="join-section">
          <input
            type="text"
            placeholder="房间码"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button onClick={handleJoin} disabled={roomCode.length !== 6}>加入房间</button>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>创建房间</h2>
            <div className="setting">
              <label>人数上限</label>
              <select value={settings.maxPlayers} onChange={(e) => setSettings({ ...settings, maxPlayers: +e.target.value })}>
                {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}人</option>)}
              </select>
            </div>
            <div className="setting">
              <label>回合时限</label>
              <select value={settings.turnTimeLimit} onChange={(e) => setSettings({ ...settings, turnTimeLimit: +e.target.value })}>
                <option value={15}>15秒</option>
                <option value={30}>30秒</option>
                <option value={60}>60秒</option>
              </select>
            </div>
            <div className="setting">
              <label>AI难度</label>
              <select value={settings.aiDifficulty} onChange={(e) => setSettings({ ...settings, aiDifficulty: e.target.value as 'easy' | 'normal' | 'hard' })}>
                <option value="easy">简单</option>
                <option value="normal">普通</option>
                <option value="hard">困难</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreate(false)}>取消</button>
              <button className="primary" onClick={handleCreate}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
