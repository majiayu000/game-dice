import type { Player, Bid } from '../types/game';

// 摇骰子
export function rollDice(): number[] {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
}

// 统计所有玩家的骰子点数
export function countDice(players: Player[], targetValue: number, isZhai: boolean): number {
  let count = 0;
  for (const player of players) {
    for (const die of player.dice) {
      if (die === targetValue) {
        count++;
      } else if (!isZhai && die === 1) {
        // 1点万能（非斋模式）
        count++;
      }
    }
  }
  return count;
}

// 验证叫点是否合法（必须比上一个叫点大）
export function isValidBid(newBid: Bid, currentBid: Bid | null): boolean {
  if (!currentBid) return true;

  // 数量更多
  if (newBid.count > currentBid.count) return true;

  // 数量相同，点数更大
  if (newBid.count === currentBid.count && newBid.value > currentBid.value) return true;

  return false;
}

// 开盅判定
export function challenge(players: Player[], bid: Bid): { challengerWins: boolean; actualCount: number } {
  const actualCount = countDice(players, bid.value, bid.isZhai || false);
  return {
    challengerWins: actualCount < bid.count,
    actualCount
  };
}

