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
  statRegen: number;
  statMaxHP: number;
  statSpeed: number;
  statMinionDmg: number;
  statMinionSpeed: number;
  statMinionHP: number;
  statMinionPierce: number;
  statMinionRegen: number;
  waveNumber: number;
  card1: number;
  card2: number;
  card3: number;
  slot1: number;
  slot2: number;
  slot3: number;
  slot4: number;
  entities: EntityState[];
}

export interface GameOverMessage {
  type: "gameOver";
  score: number;
  wave: number;
}

export type GameMessage = WelcomeMessage | WorldStateMessage | GameOverMessage;

export function serializeJoin(username: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(username);
  const buffer = new ArrayBuffer(2 + nameBytes.length);
  const view = new DataView(buffer);
  view.setUint8(0, 1);
  view.setUint8(1, nameBytes.length);
  const u8Array = new Uint8Array(buffer, 2);
  u8Array.set(nameBytes);
  return buffer;
}

export function serializeInput(keys: number, mouseAngle: number, upgradeSelect: number): ArrayBuffer {
  const buffer = new ArrayBuffer(7);
  const view = new DataView(buffer);
  view.setUint8(0, 2);
  view.setUint8(1, keys);
  view.setFloat32(2, mouseAngle, true);
  view.setUint8(6, upgradeSelect);
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
    if (view.byteLength < 43) return null;
    const tick = view.getUint32(1, true);
    const xp = view.getUint32(5, true);
    const maxXp = view.getUint32(9, true);
    const level = view.getUint16(13, true);
    const score = view.getUint32(15, true);
    const health = view.getUint16(19, true);
    const maxHealth = view.getUint16(21, true);
    const upgradePoints = view.getUint8(23);
    const statsPack1 = view.getUint32(24, true);
    const statsPack2 = view.getUint32(28, true);
    const waveNumber = view.getUint16(32, true);
    const entitiesCount = view.getUint16(34, true);
    const card1 = view.getUint8(36);
    const card2 = view.getUint8(37);
    const card3 = view.getUint8(38);
    const slot1 = view.getUint8(39);
    const slot2 = view.getUint8(40);
    const slot3 = view.getUint8(41);
    const slot4 = view.getUint8(42);

    const statRegen = statsPack1 & 0xFF;
    const statMaxHP = (statsPack1 >> 8) & 0xFF;
    const statSpeed = (statsPack1 >> 16) & 0xFF;
    const statMinionDmg = (statsPack1 >> 24) & 0xFF;
    const statMinionSpeed = statsPack2 & 0xFF;
    const statMinionHP = (statsPack2 >> 8) & 0xFF;
    const statMinionPierce = (statsPack2 >> 16) & 0xFF;
    const statMinionRegen = (statsPack2 >> 24) & 0xFF;

    const entities: EntityState[] = [];
    let offset = 43;
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
      statRegen,
      statMaxHP,
      statSpeed,
      statMinionDmg,
      statMinionSpeed,
      statMinionHP,
      statMinionPierce,
      statMinionRegen,
      waveNumber,
      card1,
      card2,
      card3,
      slot1,
      slot2,
      slot3,
      slot4,
      entities,
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
