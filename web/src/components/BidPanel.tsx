import { useState } from 'react';
import type { Bid } from '../types/game';
import { isValidBid } from '../utils/gameLogic';
import './BidPanel.css';

interface BidPanelProps {
  currentBid: Bid | null;
  onBid: (bid: Bid) => void;
  onChallenge: () => void;
  playerId: string;
  totalDice?: number;
  loading?: boolean;
}

export function BidPanel({ currentBid, onBid, onChallenge, playerId, totalDice = 30, loading = false }: BidPanelProps) {
  const [count, setCount] = useState(currentBid ? currentBid.count : 1);
  const [value, setValue] = useState(currentBid ? currentBid.value : 2);
  const [isZhai, setIsZhai] = useState(false);

  const newBid: Bid = { count, value, playerId, isZhai };
  const canBid = isValidBid(newBid, currentBid) && !loading;

  const handleBid = () => {
    if (canBid) {
      onBid(newBid);
    }
  };

  return (
    <div className="bid-panel">
      <div className="bid-controls">
        <div className="bid-selector">
          <label>数量</label>
          <div className="number-input">
            <button onClick={() => setCount(Math.max(1, count - 1))}>-</button>
            <span>{count}</span>
            <button onClick={() => setCount(Math.min(totalDice, count + 1))}>+</button>
          </div>
        </div>

        <div className="bid-selector">
          <label>点数</label>
          <div className="value-buttons">
            {[2, 3, 4, 5, 6].map(v => (
              <button
                key={v}
                className={value === v ? 'active' : ''}
                onClick={() => setValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="zhai-toggle">
          <label>
            <input
              type="checkbox"
              checked={isZhai}
              onChange={e => setIsZhai(e.target.checked)}
            />
            斋 (1点不万能)
          </label>
        </div>
      </div>

      <div className="bid-actions">
        <button
          className="btn-bid"
          onClick={handleBid}
          disabled={!canBid}
        >
          {loading ? '提交中...' : `叫 ${count}个${value}`}
        </button>

        {currentBid && (
          <button className="btn-challenge" onClick={onChallenge} disabled={loading}>
            {loading ? '...' : '开！'}
          </button>
        )}
      </div>
    </div>
  );
}
