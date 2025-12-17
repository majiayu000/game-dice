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

export function isValidBid(newBid: Bid, currentBid: Bid | null): boolean {
  if (!currentBid) return newBid.count >= 1 && newBid.value >= 2 && newBid.value <= 6;
  if (newBid.count > currentBid.count) return true;
  if (newBid.count === currentBid.count && newBid.value > currentBid.value) return true;
  return false;
}

export function challenge(players: Player[], bid: Bid): boolean {
  const actualCount = countDice(players, bid.value, bid.isZhai);
  return actualCount < bid.count;
}
