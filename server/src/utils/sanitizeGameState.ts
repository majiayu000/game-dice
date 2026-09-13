import type { GameState, Player } from '../types/index.js';

/**
 * Build a per-recipient GameState view.
 * The recipient keeps their own dice; every other player's faces are stripped.
 * Full reveal must only happen via game:roundResult.allDice.
 */
export function sanitizeGameState(state: GameState, recipientId: string): GameState {
  return {
    ...state,
    players: state.players.map((player) => sanitizePlayer(player, recipientId)),
  };
}

function sanitizePlayer(player: Player, recipientId: string): Player {
  const diceCount = player.diceCount ?? player.dice.length;

  if (player.id === recipientId) {
    return {
      ...player,
      dice: [...player.dice],
      diceCount,
    };
  }

  return {
    ...player,
    dice: [],
    diceCount,
  };
}
