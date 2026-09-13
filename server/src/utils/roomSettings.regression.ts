import assert from 'node:assert/strict';
import {
  DEFAULT_ROOM_SETTINGS,
  sanitizeRoomSettings,
} from './roomSettings.js';

/** Objects that throw when Number() tries ToPrimitive. */
const hostile = { toString: null, valueOf: null };

assert.doesNotThrow(() =>
  sanitizeRoomSettings({
    maxPlayers: hostile,
    turnTimeLimit: hostile,
    aiDifficulty: hostile,
  })
);

assert.deepEqual(
  sanitizeRoomSettings({
    maxPlayers: hostile,
    turnTimeLimit: hostile,
    aiDifficulty: { not: 'a-difficulty' },
  }),
  DEFAULT_ROOM_SETTINGS
);

assert.deepEqual(
  sanitizeRoomSettings({
    maxPlayers: '6',
    turnTimeLimit: '15',
    aiDifficulty: 'hard',
  }),
  { maxPlayers: 6, turnTimeLimit: 15, aiDifficulty: 'hard' }
);

assert.deepEqual(
  sanitizeRoomSettings({
    maxPlayers: 99,
    turnTimeLimit: 7,
    aiDifficulty: 'nightmare',
  }),
  { maxPlayers: 6, turnTimeLimit: 30, aiDifficulty: 'normal' }
);

console.log('roomSettings regression: ok');
