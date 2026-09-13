import type { Player } from '../types/game';
import { Dice } from './Dice';
import './PlayerArea.css';

interface PlayerAreaProps {
  player: Player;
  isMe: boolean;
  showDice: boolean;
  rolling?: boolean;
}

export function PlayerArea({ player, isMe, showDice, rolling }: PlayerAreaProps) {
  return (
    <div className={`player-area ${isMe ? 'is-me' : ''} ${player.isCurrentTurn ? 'active' : ''}`}>
      <div className="player-name">
        {player.name}
        {player.isCurrentTurn && <span className="turn-indicator">👈 轮到TA</span>}
      </div>
      <div className="dice-container">
        {(
          showDice && player.dice.length > 0
            ? player.dice
            : isMe
              ? player.dice
              : Array.from({ length: player.diceCount ?? player.dice.length }, () => 0)
        ).map((value, index) => (
          <Dice
            key={index}
            value={value}
            hidden={!showDice && !isMe}
            rolling={rolling}
          />
        ))}
      </div>
    </div>
  );
}
