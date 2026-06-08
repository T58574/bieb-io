import { deserializeMessage, serializeJoin } from "./protocol";
import { state, renderEntities } from "./state";
import { spawnDeathExplosion, spawnFloatingText } from "./particles";

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
  state.activeMutationIndex = 0;
  state.statRegen = 0;
  state.statMaxHP = 0;
  state.statSpeed = 0;
  state.statMinionDmg = 0;
  state.statMinionSpeed = 0;
  state.statMinionHP = 0;
  state.statMinionPierce = 0;
  state.statMinionRegen = 0;

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(wsProtocol + "//" + window.location.host + "/ws");
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    socket!.send(serializeJoin(state.playerUsername, state.selectedClass));
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
    sendClassUpgrade(state.selectedClass);
  } else if (msg.type === "worldState") {
    if (state.playerId !== null) {
      let xpDiff = 0;
      if (msg.level > state.currentLevel && state.currentLevel > 0) {
        xpDiff = (state.maxXP - state.currentXP) + msg.xp;
      } else if (msg.xp > state.currentXP && msg.level === state.currentLevel) {
        xpDiff = msg.xp - state.currentXP;
      }
      if (xpDiff > 0) {
        const me = renderEntities.get(state.playerId);
        if (me) {
          spawnFloatingText(me.x, me.y - 35, `+${xpDiff} XP`, "#fbbf24");
        }
      }
    }
    state.currentXP = msg.xp;
    state.maxXP = msg.maxXp;
    state.currentLevel = msg.level;
    state.currentScore = msg.score;
    state.playerHealth = msg.health;
    state.playerMaxHealth = msg.maxHealth;
    state.upgradePoints = msg.upgradePoints;
    state.isGamePaused = (msg.waveNumber & 0x8000) !== 0;
    state.waveNumber = msg.waveNumber & 0x07FF;
    state.activeMutationIndex = (msg.waveNumber >> 11) & 0x0F;
    state.statSpeed = msg.upgrades[1];
    state.statVampirism = msg.upgrades[2];
    state.statMaxHP = msg.upgrades[3];
    state.statRegen = msg.upgrades[4];
    state.statMinionDmg = msg.upgrades[5];
    state.statMinionSpeed = msg.upgrades[6];
    state.statMinionHP = msg.upgrades[7];
    state.statMinionPierce = msg.upgrades[8];
    state.statMinionRegen = msg.upgrades[9];
    state.statOrbitShield = msg.upgrades[10];
    state.statFlagUnlock = msg.upgrades[11];
    state.statDamageMod = msg.upgrades[12];
    state.statCooldownMod = msg.upgrades[13];
    state.statCritChance = msg.upgrades[14];
    state.statCritDamage = msg.upgrades[15];
    state.statCritDefiance = msg.upgrades[16];
    state.statAddProjectiles = msg.upgrades[17];
    state.statPierceCount = msg.upgrades[18];
    state.statSpread = msg.upgrades[19];
    state.statExpMod = msg.upgrades[20];
    state.statLootQuantity = msg.upgrades[21];
    state.statLootQuality = msg.upgrades[22];
    state.statPickupItemRadius = msg.upgrades[23];
    state.statThorns = msg.upgrades[24];
    state.statPhaseShift = msg.upgrades[25];
    state.statPhotonReactor = msg.upgrades[26];
    state.statGravitationalCapture = msg.upgrades[27];
    state.statRadiationBlast = msg.upgrades[28];
    state.card1 = msg.card1;
    state.card2 = msg.card2;
    state.card3 = msg.card3;
    state.inventory = msg.inventory;
    state.cameraZoom = Math.max(0.5, 1.0 - (state.currentLevel - 1) * 0.01);

    for (const ent of msg.entities) {
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
    for (const id of msg.removedIds) {
      const ent = renderEntities.get(id);
      if (ent && ent.type === 1) {
        spawnDeathExplosion(ent.x, ent.y, ent.radius);
      }
      renderEntities.delete(id);
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
