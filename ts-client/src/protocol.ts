export interface WelcomeMessage {
  type: "welcome";
  playerId: number;
  arenaWidth: number;
  arenaHeight: number;
}

export interface EntityState {
  id: number;
  type: number;
  subtype: number;
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  radius: number;
  stateFlags: number;
}

export interface WorldStateMessage {
  type: "worldState";
  tick: number;
  xp: number;
  maxXp: number;
  level: number;
  score: number;
  health: number;
  maxHealth: number;
  upgradePoints: number;
  upgrades: number[];
  waveNumber: number;
  card1: number;
  card2: number;
  card3: number;
  inventory: number[];
  entities: EntityState[];
  removedIds: number[];
}

export interface GameOverMessage {
  type: "gameOver";
  score: number;
  wave: number;
}

export type GameMessage = WelcomeMessage | WorldStateMessage | GameOverMessage;

export function serializeJoin(username: string, classId: number): ArrayBuffer {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(username);
  const buffer = new ArrayBuffer(3 + nameBytes.length);
  const view = new DataView(buffer);
  view.setUint8(0, 1);
  view.setUint8(1, nameBytes.length);
  const u8Array = new Uint8Array(buffer, 2);
  u8Array.set(nameBytes);
  view.setUint8(2 + nameBytes.length, classId);
  return buffer;
}

export function serializeInput(keys: number, mouseAngle: number, upgradeSelect: number, deleteSlotSelect: number): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint8(0, 2);
  view.setUint8(1, keys);
  view.setFloat32(2, mouseAngle, true);
  view.setUint8(6, upgradeSelect);
  view.setUint8(7, deleteSlotSelect);
  return buffer;
}

export function deserializeMessage(buffer: ArrayBuffer): GameMessage | null {
  const view = new DataView(buffer);
  if (view.byteLength < 1) return null;
  const opcode = view.getUint8(0);
  if (opcode === 1) {
    if (view.byteLength < 11) return null;
    return {
      type: "welcome",
      playerId: view.getUint16(1, true),
      arenaWidth: view.getFloat32(3, true),
      arenaHeight: view.getFloat32(7, true),
    };
  } else if (opcode === 2) {
    if (view.byteLength < 262) return null;
    const tick = view.getUint32(1, true);
    const xp = view.getUint32(5, true);
    const maxXp = view.getUint32(9, true);
    const level = view.getUint16(13, true);
    const score = view.getUint32(15, true);
    const health = view.getUint16(19, true);
    const maxHealth = view.getUint16(21, true);
    const upgradePoints = view.getUint8(23);
    const upgrades: number[] = [];
    for (let i = 0; i < 29; i++) {
      upgrades.push(view.getUint8(24 + i));
    }
    const waveNumber = view.getUint16(53, true);
    const entitiesCount = view.getUint16(55, true);
    const card1 = view.getUint8(57);
    const card2 = view.getUint8(58);
    const card3 = view.getUint8(59);
    const inventory: number[] = [];
    for (let i = 0; i < 200; i++) {
      inventory.push(view.getUint8(60 + i));
    }
    const removedCount = view.getUint16(260, true);

    const entities: EntityState[] = [];
    let offset = 262;
    for (let i = 0; i < entitiesCount; i++) {
      if (offset + 26 > view.byteLength) break;
      entities.push({
        id: view.getUint16(offset, true),
        type: view.getUint8(offset + 2),
        subtype: view.getUint8(offset + 3),
        x: view.getFloat32(offset + 4, true),
        y: view.getFloat32(offset + 8, true),
        angle: view.getFloat32(offset + 12, true),
        health: view.getUint16(offset + 16, true),
        maxHealth: view.getUint16(offset + 18, true),
        radius: view.getUint16(offset + 20, true),
        stateFlags: view.getUint32(offset + 22, true),
      });
      offset += 26;
    }

    const removedIds: number[] = [];
    for (let i = 0; i < removedCount; i++) {
      if (offset + 2 > view.byteLength) break;
      removedIds.push(view.getUint16(offset, true));
      offset += 2;
    }

    return {
      type: "worldState",
      tick,
      xp,
      maxXp,
      level,
      score,
      health,
      maxHealth,
      upgradePoints,
      upgrades,
      waveNumber,
      card1,
      card2,
      card3,
      inventory,
      entities,
      removedIds,
    };
  } else if (opcode === 4) {
    if (view.byteLength < 9) return null;
    return {
      type: "gameOver",
      score: view.getUint32(1, true),
      wave: view.getUint32(5, true),
    };
  }
  return null;
}
