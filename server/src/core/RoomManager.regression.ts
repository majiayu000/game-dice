import assert from 'node:assert/strict';
import { RoomManager } from './RoomManager.js';
import { GameEngine } from './GameEngine.js';

// Use only synthetic human players with timeouts disabled. Importing the core
// classes does not start the HTTP/Socket.IO server or schedule AI actions.
const rooms = new RoomManager();
const games = new GameEngine();
const hostId = 'test-host';
const guestId = 'test-guest';
const room = rooms.createRoom(hostId, 'Host', {
  maxPlayers: 2,
  turnTimeLimit: 0,
  aiDifficulty: 'normal',
});

// Exercise the same core start sequence used by the valid room host's handler.
function startAsHost(): boolean {
  const currentRoom = rooms.getPlayerRoom(hostId);
  assert.ok(currentRoom);
  assert.equal(currentRoom.host, hostId);
  if (!rooms.canStart(currentRoom.id)) return false;
  assert.equal(rooms.startGame(currentRoom.id), true);
  games.setRoom(currentRoom);
  games.initGame(currentRoom);
  return true;
}

function assertStartPreservesGame(stage: string) {
  const before = games.getState(room.id);
  assert.ok(before);
  const snapshot = structuredClone(before);
  const dice = before.players.map(player => player.dice);

  assert.equal(startAsHost(), false, `${stage}: repeated host start must fail`);
  assert.equal(rooms.canStart(room.id), false, `${stage}: room is not waiting`);
  assert.equal(rooms.startGame(room.id), false, `${stage}: direct start must fail too`);
  assert.equal(room.status, 'playing');
  assert.equal(games.getState(room.id), before, `${stage}: keep the game object`);
  assert.deepEqual(before, snapshot, `${stage}: keep round, bid, turn and results`);
  before.players.forEach((player, index) => {
    assert.equal(player.dice, dice[index], `${stage}: do not reroll dice`);
  });
}

try {
  assert.equal(rooms.canStart('missing-room'), false);
  assert.equal(rooms.startGame('missing-room'), false);
  assert.equal(startAsHost(), false, 'one player cannot start');
  assert.equal(rooms.startGame(room.id), false);

  assert.ok(rooms.joinRoom(guestId, 'Guest', room.code));
  assert.equal(startAsHost(), false, 'an unready guest cannot start');
  assert.equal(rooms.startGame(room.id), false);
  rooms.setReady(guestId, true);
  rooms.setReady(hostId, false);
  assert.equal(startAsHost(), false, 'the host must also be ready');
  assert.equal(room.status, 'waiting');
  assert.equal(games.getState(room.id), null);

  rooms.setReady(hostId, true);
  assert.equal(startAsHost(), true, 'a ready waiting room can start');
  const state = games.getState(room.id);
  assert.ok(state);
  assert.equal(state.phase, 'bidding');
  assert.equal(state.round, 1);
  assertStartPreservesGame('immediately after start');

  assert.ok(games.makeBid(room.id, hostId, { count: 1, value: 2, playerId: hostId }));
  assert.equal(state.currentPlayerIndex, 1);
  assertStartPreservesGame('after a bid');
  assert.equal(games.nextRound(room.id), null, 'nextRound still requires a result');

  assert.ok(games.challenge(room.id, guestId));
  assert.equal(state.phase, 'result');
  assertStartPreservesGame('while showing the result');

  const firstRoundDice = state.players.map(player => player.dice);
  const loser = state.loser;
  assert.equal(games.nextRound(room.id), state, 'the normal next round still works');
  assert.equal(state.phase, 'bidding');
  assert.equal(state.round, 2);
  assert.equal(state.currentBid, null);
  assert.equal(state.winner, null);
  assert.equal(state.loser, null);
  assert.equal(state.players[state.currentPlayerIndex].id, loser);
  state.players.forEach((player, index) => {
    assert.notEqual(player.dice, firstRoundDice[index], 'nextRound still rerolls');
    assert.equal(player.dice.length, 5);
  });
  assertStartPreservesGame('in the next round');

  const actor = state.players[state.currentPlayerIndex].id;
  assert.ok(games.makeBid(room.id, actor, { count: 1, value: 2, playerId: actor }));
  assertStartPreservesGame('after a second-round bid');

  // finished is a reserved room status; it must explicitly return to waiting
  // before a fresh start rather than silently reopening through room:start.
  room.status = 'finished';
  assert.equal(rooms.canStart(room.id), false);
  assert.equal(rooms.startGame(room.id), false);
  assert.equal(room.status, 'finished');

  console.log('RoomManager start regression: ok');
} finally {
  games.cleanupGame(room.id);
}
