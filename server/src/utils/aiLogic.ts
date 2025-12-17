import type { Bid, GameState, Player } from '../types/index.js';

export interface AIDecision {
  action: 'bid' | 'challenge';
  bid?: Bid;
}

// 难度配置
const DifficultyConfig = {
  easy: { bidThreshold: 0.2, challengeThreshold: 0.25, bluffChance: 0.1 },
  normal: { bidThreshold: 0.3, challengeThreshold: 0.35, bluffChance: 0.2 },
  hard: { bidThreshold: 0.4, challengeThreshold: 0.45, bluffChance: 0.3 },
};

export function makeAIDecision(
  gameState: GameState,
  aiPlayerId: string,
  difficulty: 'easy' | 'normal' | 'hard'
): AIDecision {
  const aiPlayer = gameState.players.find(p => p.id === aiPlayerId);
  if (!aiPlayer) return { action: 'challenge' };

  const currentBid = gameState.currentBid;
  const config = DifficultyConfig[difficulty];
  const totalDice = gameState.players.length * 5;

  // 没有当前叫点，必须叫
  if (!currentBid) {
    return { action: 'bid', bid: generateInitialBid(aiPlayer, gameState.players.length, difficulty) };
  }

  // 计算当前叫点的可信度
  const believability = calculateBelievability(currentBid, aiPlayer, totalDice);

  // 根据可信度和难度决定是否开盅
  if (believability < config.challengeThreshold) {
    // 叫点不可信，倾向开盅
    const challengeChance = 1 - believability / config.challengeThreshold;
    if (Math.random() < challengeChance) {
      return { action: 'challenge' };
    }
  }

  // 尝试生成新叫点
  const newBid = generateNextBid(currentBid, aiPlayer, gameState.players.length, difficulty);
  if (newBid) {
    return { action: 'bid', bid: newBid };
  }

  // 无法生成有效叫点，开盅
  return { action: 'challenge' };
}

// 计算叫点可信度（0-1，越高越可信）
function calculateBelievability(bid: Bid, aiPlayer: Player, totalDice: number): number {
  const counts = countMyDice(aiPlayer.dice);
  const mySupport = counts[bid.value] + (bid.value !== 1 ? counts[1] : 0);

  // 期望值：假设其他骰子有 1/3 概率是目标点数（含1点万能）
  const otherDice = totalDice - 5;
  const expectedOthers = otherDice / 3;
  const expectedTotal = mySupport + expectedOthers;

  // 可信度 = 期望值 / 叫的数量
  return Math.min(1, expectedTotal / bid.count);
}

function generateInitialBid(player: Player, playerCount: number, difficulty: 'easy' | 'normal' | 'hard'): Bid {
  const counts = countMyDice(player.dice);
  const bestValue = findBestValue(counts);
  const myCount = counts[bestValue] + (bestValue !== 1 ? counts[1] : 0);
  const config = DifficultyConfig[difficulty];

  // 根据难度调整初始叫点的保守程度
  const baseCount = Math.ceil(playerCount * 5 * 0.2);
  const conservativeCount = Math.max(myCount, baseCount);

  // 困难 AI 可能会虚张声势，叫更高
  const bluffBonus = Math.random() < config.bluffChance ? 1 : 0;

  return {
    count: conservativeCount + bluffBonus,
    value: bestValue === 1 ? 2 : bestValue,
    playerId: player.id
  };
}

function generateNextBid(
  currentBid: Bid,
  player: Player,
  playerCount: number,
  difficulty: 'easy' | 'normal' | 'hard'
): Bid | null {
  const totalDice = playerCount * 5;
  const counts = countMyDice(player.dice);
  const config = DifficultyConfig[difficulty];

  // 策略1：尝试加数量（保持点数不变）
  const newCount = currentBid.count + 1;
  if (newCount <= totalDice * 0.6) {
    const mySupport = counts[currentBid.value] + (currentBid.value !== 1 ? counts[1] : 0);
    const otherDice = totalDice - 5;
    const expectedTotal = mySupport + otherDice / 3;

    if (expectedTotal / newCount >= config.bidThreshold) {
      return { count: newCount, value: currentBid.value, playerId: player.id };
    }
  }

  // 策略2：尝试换到自己更有优势的点数
  const bestValue = findBestValue(counts);
  if (bestValue > currentBid.value) {
    const mySupport = counts[bestValue] + counts[1];
    if (mySupport >= 2 || Math.random() < config.bluffChance) {
      return { count: currentBid.count, value: bestValue, playerId: player.id };
    }
  }

  // 策略3：尝试加点数
  if (currentBid.value < 6) {
    const newValue = currentBid.value + 1;
    const mySupport = counts[newValue] + counts[1];
    if (mySupport >= 1) {
      return { count: currentBid.count, value: newValue, playerId: player.id };
    }
  }

  // 策略4：困难 AI 可能虚张声势
  if (Math.random() < config.bluffChance && newCount <= totalDice * 0.5) {
    return { count: newCount, value: currentBid.value, playerId: player.id };
  }

  return null;
}

function countMyDice(dice: number[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) counts[d]++;
  return counts;
}

function findBestValue(counts: Record<number, number>): number {
  let best = 2, max = 0;
  for (let v = 2; v <= 6; v++) {
    const total = counts[v] + counts[1];
    if (total > max) { max = total; best = v; }
  }
  return best;
}
