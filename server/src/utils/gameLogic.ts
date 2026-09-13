import type { Bid, Player } from '../types/index.js';

export function rollDice(): number[] {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
}

export function countDice(players: Player[], targetValue: number, isZhai = false): number {
  let count = 0;
  for (const player of players) {
    for (const die of player.dice) {
      if (die === targetValue) {
        count++;
      } else if (!isZhai && die === 1) {
        count++;
      }
    }
  }
  return count;
}

function hasValidBidBounds(bid: Bid): boolean {
  if (!Number.isInteger(bid.count) || bid.count < 1) return false;
  if (!Number.isInteger(bid.value) || bid.value < 2 || bid.value > 6) return false;
  if (bid.isZhai !== undefined && typeof bid.isZhai !== 'boolean') return false;
  return true;
}

export function isValidBid(newBid: Bid, currentBid: Bid | null): boolean {
  // Absolute bounds always apply before raise comparisons.
  if (!hasValidBidBounds(newBid)) return false;
  if (!currentBid) return true;
  if (newBid.count > currentBid.count) return true;
  if (newBid.count === currentBid.count && newBid.value > currentBid.value) return true;
  return false;
}

export function challenge(players: Player[], bid: Bid): boolean {
  const actualCount = countDice(players, bid.value, bid.isZhai);
  return actualCount < bid.count;
}
