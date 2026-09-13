import type { RoomSettings } from '../types/index.js';

export const MIN_MAX_PLAYERS = 2;
export const MAX_MAX_PLAYERS = 6;
export const ALLOWED_TURN_TIME_LIMITS = [0, 15, 30, 60] as const;
export const ALLOWED_AI_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 4,
  turnTimeLimit: 30,
  aiDifficulty: 'normal',
};

type AiDifficulty = RoomSettings['aiDifficulty'];

/** Coerce only number/string primitives; reject objects that can throw in Number(). */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clampMaxPlayers(value: unknown): number {
  const n = toFiniteNumber(value);
  if (n === null) return DEFAULT_ROOM_SETTINGS.maxPlayers;
  return Math.min(MAX_MAX_PLAYERS, Math.max(MIN_MAX_PLAYERS, Math.floor(n)));
}

function sanitizeTurnTimeLimit(value: unknown): number {
  const n = toFiniteNumber(value);
  if (n !== null && (ALLOWED_TURN_TIME_LIMITS as readonly number[]).includes(n)) {
    return n;
  }
  return DEFAULT_ROOM_SETTINGS.turnTimeLimit;
}

function sanitizeAiDifficulty(value: unknown): AiDifficulty {
  if (
    typeof value === 'string' &&
    (ALLOWED_AI_DIFFICULTIES as readonly string[]).includes(value)
  ) {
    return value as AiDifficulty;
  }
  return DEFAULT_ROOM_SETTINGS.aiDifficulty;
}

/**
 * Clamp / whitelist client-supplied room settings before createRoom.
 * Prevents DoS via huge rooms / bad timers and AI crashes from unknown difficulty.
 */
export function sanitizeRoomSettings(input: unknown): RoomSettings {
  const raw =
    input && typeof input === 'object'
      ? (input as Partial<RoomSettings>)
      : {};

  return {
    maxPlayers: clampMaxPlayers(raw.maxPlayers),
    turnTimeLimit: sanitizeTurnTimeLimit(raw.turnTimeLimit),
    aiDifficulty: sanitizeAiDifficulty(raw.aiDifficulty),
  };
}
