import { useState, useEffect } from 'react';
import './Dice.css';

interface DiceProps {
  value: number;
  hidden?: boolean;
  rolling?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function Dice({ value, hidden = false, rolling = false, size = 'medium' }: DiceProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [rolling, value]);

  if (hidden) {
    return <div className="dice dice-hidden">?</div>;
  }

  return (
    <div className={`dice dice-${displayValue} dice-${size} ${rolling ? 'rolling' : ''}`}>
      {renderDots(displayValue)}
    </div>
  );
}

function renderDots(value: number) {
  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  return (
    <div className="dice-face">
      {dotPositions[value].map((pos, i) => (
        <span key={i} className={`dot ${pos}`} />
      ))}
    </div>
  );
}
