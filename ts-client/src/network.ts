import { deserializeMessage, serializeJoin } from "./protocol";
import { state, renderEntities } from "./state";
import { spawnDeathExplosion } from "./particles";

export let socket: WebSocket | null = null;

export function sendPauseToggle() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);
    view.setUint8(0, 6);
    socket.send(buffer);
  }
}

export function sendClassUpgrade(classId: number) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint8(0, 5);
    view.setUint8(1, classId);
    socket.send(buffer);
  }
}

export function connectToServer() {
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }

  state.playerId = null;
  renderEntities.clear();
  state.currentXP = 0;
  state.maxXP = 100;
  state.currentLevel = 1;
  state.currentScore = 0;
  state.playerHealth = 100;
  state.playerMaxHealth = 100;
  state.upgradePoints = 0;
  state.waveNumber = 0;
  state.statRegen = 0;
  state.statMaxHP = 0;
  state.statSpeed = 0;
  state.statMinionDmg = 0;
  state.statMinionSpeed = 0;
  state.statMinionHP = 0;
  state.statMinionPierce = 0;
  state.statMinionRegen = 0;

  socket = new WebSocket("ws://" + window.location.hostname + ":8080/ws");
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    socket!.send(serializeJoin(state.playerUsername));
    state.gameState = "playing";
  };

  socket.onmessage = handleServerMessage;

  socket.onclose = () => {
    if (state.gameState === "playing") {
      state.gameState = "gameover";
      state.gameOverScore = state.currentScore;
      state.gameOverWave = state.waveNumber;
    }
  };
}

function handleServerMessage(event: MessageEvent) {
  const msg = deserializeMessage(event.data);
  if (!msg) return;
  if (msg.type === "welcome") {
    state.playerId = msg.playerId;
    state.arenaWidth = msg.arenaWidth;
    state.arenaHeight = msg.arenaHeight;
  } else if (msg.type === "worldState") {
    state.currentXP = msg.xp;
    state.maxXP = msg.maxXp;
    state.currentLevel = msg.level;
    state.currentScore = msg.score;
    state.playerHealth = msg.health;
    state.playerMaxHealth = msg.maxHealth;
    state.upgradePoints = msg.upgradePoints;
    state.isGamePaused = (msg.waveNumber & 0x8000) !== 0;
    state.waveNumber = msg.waveNumber & 0x7FFF;
    state.statRegen = msg.statRegen;
    state.statMaxHP = msg.statMaxHP;
    state.statSpeed = msg.statSpeed;
    state.statMinionDmg = msg.statMinionDmg;
    state.statMinionSpeed = msg.statMinionSpeed;
    state.statMinionHP = msg.statMinionHP;
    state.statMinionPierce = msg.statMinionPierce;
    state.statMinionRegen = msg.statMinionRegen;
    state.card1 = msg.card1;
    state.card2 = msg.card2;
    state.card3 = msg.card3;
    state.inventory = msg.inventory;
    state.cameraZoom = Math.max(0.5, 1.0 - (state.currentLevel - 1) * 0.01);

    const receivedIds = new Set<number>();
    for (const ent of msg.entities) {
      receivedIds.add(ent.id);
      const existing = renderEntities.get(ent.id);
      if (existing) {
        existing.subtype = ent.subtype;
        existing.targetX = ent.x;
        existing.targetY = ent.y;
        existing.targetAngle = ent.angle;
        existing.health = ent.health;
        existing.maxHealth = ent.maxHealth;
        existing.radius = ent.radius;
        existing.stateFlags = ent.stateFlags;
      } else {
        renderEntities.set(ent.id, {
          id: ent.id,
          type: ent.type,
          subtype: ent.subtype,
          x: ent.x,
          y: ent.y,
          angle: ent.angle,
          targetX: ent.x,
          targetY: ent.y,
          targetAngle: ent.angle,
          health: ent.health,
          maxHealth: ent.maxHealth,
          radius: ent.radius,
          stateFlags: ent.stateFlags,
        });
      }
    }
    for (const id of renderEntities.keys()) {
      if (!receivedIds.has(id)) {
        const ent = renderEntities.get(id);
        if (ent && ent.type === 1) {
          spawnDeathExplosion(ent.x, ent.y, ent.radius);
        }
        renderEntities.delete(id);
      }
    }
  } else if (msg.type === "gameOver") {
    state.gameOverScore = msg.score;
    state.gameOverWave = msg.wave;
    state.gameState = "gameover";
    if (socket) {
      socket.close();
      socket = null;
    }
  }
}
