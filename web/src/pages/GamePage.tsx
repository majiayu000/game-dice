import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { socketService } from '../services/socketService';
import { Dice } from '../components/Dice';
import { BidPanel } from '../components/BidPanel';
import type { Bid, GamePhase } from '../types/game';
import './GamePage.css';

export function GamePage() {
  const navigate = useNavigate();
  const { userId, gameState, currentRoom, error, setError, setGameState } = useGameStore();
  useSocket();
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextRoundLoading, setNextRoundLoading] = useState(false);
  const [resultData, setResultData] = useState<{
    actualCount: number;
    challengerWins: boolean;
    allDice: { id: string; dice: number[] }[];
  } | null>(null);
  const prevPhaseRef = useRef<GamePhase | undefined>(undefined);

  useEffect(() => {
    if (!gameState) navigate('/');
    else setLoading(false);
  }, [gameState, navigate]);

  useEffect(() => {
    const unsub = socketService.on('game:roundResult', (data) => {
      setResultData(data as typeof resultData);
      setShowResult(true);
      setLoading(false);
      setNextRoundLoading(false);
      setError(null);
    });
    return () => { unsub(); };
  }, [setError]);

  // Close only after an observed result → non-result transition. Closing on
  // phase !== 'result' alone races with game:roundResult arriving before
  // game:stateUpdate (phase still 'bidding'), which would clear the modal
  // and never reopen it when phase later becomes 'result'.
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const currentPhase = gameState?.phase;
    prevPhaseRef.current = currentPhase;

    if (
      showResult &&
      prevPhase === 'result' &&
      currentPhase !== undefined &&
      currentPhase !== 'result'
    ) {
      setShowResult(false);
      setResultData(null);
      setNextRoundLoading(false);
      setError(null);
    }
  }, [gameState, showResult, setError]);

  useEffect(() => {
    if (error && nextRoundLoading) {
      setNextRoundLoading(false);
    }
  }, [error, nextRoundLoading]);

  if (!gameState) return null;

  const me = gameState.players.find(p => p.id === userId);
  const isMyTurn = me?.isCurrentTurn;
  const isHost = currentRoom?.host === userId;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const otherPlayers = gameState.players.filter(p => p.id !== userId);

  const handleBid = (bid: Bid) => {
    setLoading(true);
    socketService.makeBid({ ...bid, playerId: userId });
  };

  const handleChallenge = () => {
    setLoading(true);
    socketService.challenge();
  };

  const canAdvanceRound =
    isHost && gameState.phase === 'result' && !nextRoundLoading;

  const handleNextRound = () => {
    // Require observed result-phase stateUpdate before emitting nextRound.
    // Otherwise a roundResult-before-stateUpdate race (plus polling) can
    // advance the server while prevPhaseRef never sees 'result', sticking
    // the overlay.
    if (!canAdvanceRound) return;
    setError(null);
    setNextRoundLoading(true);
    socketService.nextRound();
  };

  const handleLeave = () => {
    socketService.leaveRoom();
    setGameState(null);
    navigate('/');
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="leave-btn" onClick={handleLeave}>退出</button>
        <div className="round-info">第 {gameState.round} 轮</div>
        <div className="room-info">{currentRoom?.code}</div>
      </div>

      <div className="other-players">
        {otherPlayers.map(player => (
          <div key={player.id} className={`other-player ${player.isCurrentTurn ? 'active' : ''}`}>
            <div className="player-label">
              {player.isAI ? '🤖' : '👤'} {player.name}
              {player.isCurrentTurn && <span className="turn-indicator">思考中...</span>}
            </div>
            <div className="dice-row">
              {(
                showResult
                  ? (resultData?.allDice.find(d => d.id === player.id)?.dice ?? [])
                  : Array.from({ length: player.diceCount ?? player.dice.length }, () => 0)
              ).map((d, i) => (
                <Dice key={i} value={d} hidden={!showResult} size="small" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="current-bid-area">
        {gameState.currentBid ? (
          <div className="current-bid">
            <span className="bid-label">当前叫点</span>
            <span className="bid-value">
              {gameState.currentBid.count} 个 {gameState.currentBid.value}
              {gameState.currentBid.isZhai && ' (斋)'}
            </span>
            <span className="bid-player">
              — {gameState.players.find(p => p.id === gameState.currentBid?.playerId)?.name}
            </span>
          </div>
        ) : (
          <div className="current-bid empty">等待叫点...</div>
        )}
      </div>

      <div className="my-area">
        <div className="my-label">我的骰子</div>
        <div className="my-dice">
          {me?.dice.map((d, i) => <Dice key={i} value={d} size="large" />)}
        </div>
      </div>

      {isMyTurn && gameState.phase === 'bidding' && (
        <div className="action-area">
          <BidPanel
            currentBid={gameState.currentBid}
            onBid={handleBid}
            onChallenge={handleChallenge}
            playerId={userId}
            loading={loading}
          />
        </div>
      )}

      {!isMyTurn && gameState.phase === 'bidding' && (
        <div className="waiting-turn">
          等待 {currentPlayer.name} 操作...
        </div>
      )}

      {showResult && resultData && (
        <div className="result-overlay">
          <div className="result-modal">
            <h2>{resultData.challengerWins ? '开盅成功!' : '开盅失败!'}</h2>
            <p className="result-detail">
              实际有 <strong>{resultData.actualCount}</strong> 个 {gameState.currentBid?.value}
              {gameState.currentBid?.isZhai ? '' : ' (含1点)'}
            </p>
            <p className="result-winner">
              {gameState.players.find(p => p.id === gameState.loser)?.name} 输了这轮!
            </p>
            {error && (
              <p className="error" onClick={() => setError(null)}>{error}</p>
            )}
            {isHost ? (
              <button
                className="primary"
                onClick={handleNextRound}
                disabled={!canAdvanceRound}
              >
                {nextRoundLoading
                  ? '处理中...'
                  : gameState.phase !== 'result'
                    ? '同步结果中...'
                    : '下一轮'}
              </button>
            ) : (
              <p className="waiting-host">等待房主开始下一轮...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
