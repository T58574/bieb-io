import { deserializeMessage, serializeInput, serializeJoin } from "./protocol";

interface RenderEntity {
  id: number;
  type: number;
  subtype: number;
  x: number;
  y: number;
  angle: number;
  targetX: number;
  targetY: number;
  targetAngle: number;
  health: number;
  maxHealth: number;
  radius: number;
  stateFlags: number;
}

type GameState = "menu" | "playing" | "gameover";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

let gameState: GameState = "menu";
let playerId: number | null = null;
let arenaWidth = 2000;
let arenaHeight = 2000;
const renderEntities = new Map<number, RenderEntity>();

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}
const particles: Particle[] = [];

function spawnDeathExplosion(x: number, y: number, radius: number) {
  const count = Math.min(15, Math.floor(radius * 0.8));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 3.5;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      color: "#ff2a5f",
      alpha: 1.0,
      life: 0,
      maxLife: 20 + Math.floor(Math.random() * 20)
    });
  }
}

let currentXP = 0;
let maxXP = 100;
let currentLevel = 1;
let currentScore = 0;
let playerHealth = 100;
let playerMaxHealth = 100;
let upgradePoints = 0;
let waveNumber = 0;
let selectedUpgradeChoice = 0;

let statRegen = 0;
let statMaxHP = 0;
let statSpeed = 0;
let statMinionDmg = 0;
let statMinionSpeed = 0;
let statMinionHP = 0;
let statMinionPierce = 0;
let statMinionRegen = 0;

let gameOverScore = 0;
let gameOverWave = 0;

let socket: WebSocket | null = null;
let inputInterval: number | null = null;

let playerUsername = "Player" + Math.floor(Math.random() * 9000 + 1000);
let usernameInput = playerUsername;
let menuAnimAngle = 0;

const keys = { w: false, a: false, s: false, d: false, space: false, mouseLeft: false };
let mouseAngle = 0;
let mouseX = 0;
let mouseY = 0;

// Shape Cache
const shapeCache = new Map<string, HTMLCanvasElement>();

function getShapeCanvas(key: string, radius: number, drawFn: (ctx: CanvasRenderingContext2D, r: number) => void): HTMLCanvasElement {
  if (shapeCache.has(key)) return shapeCache.get(key)!;
  const c = document.createElement("canvas");
  const padding = 6; // Space for stroke
  c.width = (radius + padding) * 2;
  c.height = (radius + padding) * 2;
  const x = c.getContext("2d");
  if (x) {
    x.translate(radius + padding, radius + padding);
    drawFn(x, radius);
  }
  shapeCache.set(key, c);
  return c;
}

function handleServerMessage(event: MessageEvent) {
  const msg = deserializeMessage(event.data);
  if (!msg) return;
  if (msg.type === "welcome") {
    playerId = msg.playerId;
    arenaWidth = msg.arenaWidth;
    arenaHeight = msg.arenaHeight;
  } else if (msg.type === "worldState") {
    currentXP = msg.xp;
    maxXP = msg.maxXp;
    currentLevel = msg.level;
    currentScore = msg.score;
    playerHealth = msg.health;
    playerMaxHealth = msg.maxHealth;
    upgradePoints = msg.upgradePoints;
    waveNumber = msg.waveNumber;
    statRegen = msg.statRegen;
    statMaxHP = msg.statMaxHP;
    statSpeed = msg.statSpeed;
    statMinionDmg = msg.statMinionDmg;
    statMinionSpeed = msg.statMinionSpeed;
    statMinionHP = msg.statMinionHP;
    statMinionPierce = msg.statMinionPierce;
    statMinionRegen = msg.statMinionRegen;

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
    gameOverScore = msg.score;
    gameOverWave = msg.wave;
    gameState = "gameover";
    if (socket) {
      socket.close();
      socket = null;
    }
    if (inputInterval !== null) {
      clearInterval(inputInterval);
      inputInterval = null;
    }
  }
}

function startInputLoop() {
  if (inputInterval !== null) {
    clearInterval(inputInterval);
  }
  inputInterval = window.setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN && gameState === "playing") {
      let mask = 0;
      const me = playerId !== null ? renderEntities.get(playerId) : null;
      const isUpgrading = me && me.subtype === 0 && currentLevel >= 10;
      if (!isUpgrading) {
        if (keys.w) mask |= 0x01;
        if (keys.a) mask |= 0x02;
        if (keys.s) mask |= 0x04;
        if (keys.d) mask |= 0x08;
      }
      socket.send(serializeInput(mask, mouseAngle, selectedUpgradeChoice));
      if (selectedUpgradeChoice !== 0) {
        selectedUpgradeChoice = 0;
      }
    }
  }, 1000 / 60);
}

function connectToServer() {
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }

  playerId = null;
  renderEntities.clear();
  currentXP = 0;
  maxXP = 100;
  currentLevel = 1;
  currentScore = 0;
  playerHealth = 100;
  playerMaxHealth = 100;
  upgradePoints = 0;
  waveNumber = 0;
  statRegen = 0;
  statMaxHP = 0;
  statSpeed = 0;
  statMinionDmg = 0;
  statMinionSpeed = 0;
  statMinionHP = 0;
  statMinionPierce = 0;
  statMinionRegen = 0;

  socket = new WebSocket("ws://" + window.location.hostname + ":8080/ws");
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    socket!.send(serializeJoin(playerUsername));
    gameState = "playing";
  };

  socket.onmessage = handleServerMessage;

  socket.onclose = () => {
    if (gameState === "playing") {
      gameState = "gameover";
      gameOverScore = currentScore;
      gameOverWave = waveNumber;
    }
  };

  if (inputInterval !== null) {
    clearInterval(inputInterval);
  }
  inputInterval = window.setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN && gameState === "playing") {
      let mask = 0;
      const me = playerId !== null ? renderEntities.get(playerId) : null;
      const isUpgrading = me && me.subtype === 0 && currentLevel >= 10;
      if (!isUpgrading) {
        if (keys.w) mask |= 0x01;
        if (keys.a) mask |= 0x02;
        if (keys.s) mask |= 0x04;
        if (keys.d) mask |= 0x08;
        if (keys.space) mask |= 0x10;
        if (keys.mouseLeft) mask |= 0x20;
      }
      socket.send(serializeInput(mask, mouseAngle, selectedUpgradeChoice));
      if (selectedUpgradeChoice !== 0) {
        selectedUpgradeChoice = 0;
      }
    }
  }, 1000 / 60);
}

window.addEventListener("keydown", (e) => {
  if (gameState === "menu") {
    if (e.key === "Backspace") {
      usernameInput = usernameInput.slice(0, -1);
    } else if (e.key === "Enter") {
      if (usernameInput.length > 0) {
        playerUsername = usernameInput;
        connectToServer();
      }
    } else if (e.key.length === 1 && usernameInput.length < 16) {
      usernameInput += e.key;
    }
    return;
  }

  if (gameState === "gameover") {
    if (e.key === "Enter") {
      gameState = "menu";
    }
    return;
  }

  if (e.key === "w" || e.key === "W") keys.w = true;
  if (e.key === "a" || e.key === "A") keys.a = true;
  if (e.key === "s" || e.key === "S") keys.s = true;
  if (e.key === "d" || e.key === "D") keys.d = true;
  if (e.key === " ") keys.space = true;

  if (upgradePoints > 0) {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 8) {
      selectedUpgradeChoice = num;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "W") keys.w = false;
  if (e.key === "a" || e.key === "A") keys.a = false;
  if (e.key === "s" || e.key === "S") keys.s = false;
  if (e.key === "d" || e.key === "D") keys.d = false;
  if (e.key === " ") keys.space = false;
});

window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (gameState === "playing") {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    mouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
  }
});

window.addEventListener("mousedown", (e) => {
  if (gameState === "menu") {
    const cx = canvas.width / 2;
    const btnW = 260;
    const btnH = 56;
    const btnX = cx - btnW / 2;
    const btnY = canvas.height / 2 + 80;
    if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
      if (usernameInput.length > 0) {
        playerUsername = usernameInput;
        connectToServer();
      }
    }
    return;
  }

  if (gameState === "gameover") {
    const cx = canvas.width / 2;
    const btnW = 260;
    const btnH = 56;
    const btnX = cx - btnW / 2;
    const btnY = canvas.height / 2 + 100;
    if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
      gameState = "menu";
    }
    return;
  }

  if (gameState === "playing") {
    if (playerId !== null) {
      const me = renderEntities.get(playerId);
      if (me && me.subtype === 0 && currentLevel >= 10) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const cardW = 180;
        const cardH = 240;
        const gap = 20;
        const startX = cx - 390;
        const startY = cy - 120;
        for (let i = 0; i < 4; i++) {
          const x = startX + i * (cardW + gap);
          if (e.clientX >= x && e.clientX <= x + cardW && e.clientY >= startY && e.clientY <= startY + cardH) {
            sendClassUpgrade(i + 1);
            return;
          }
        }
        return;
      }
    }
    if (e.button === 0) keys.mouseLeft = true;
  }
});

window.addEventListener("mouseup", (e) => {
  if (gameState === "playing") {
    if (e.button === 0) keys.mouseLeft = false;
  }
});

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

function drawGrid(cx: number, cy: number) {
  const gridSize = 40;
  const startX = Math.floor((cx - canvas.width / 2) / gridSize) * gridSize;
  const endX = cx + canvas.width / 2;
  const startY = Math.floor((cy - canvas.height / 2) / gridSize) * gridSize;
  const endY = cy + canvas.height / 2;

  ctx.strokeStyle = "rgba(15, 23, 42, 0.15)";
  ctx.lineWidth = 1;
  for (let x = startX; x < endX; x += gridSize) {
    if (x % 200 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(x - cx + canvas.width / 2, 0);
    ctx.lineTo(x - cx + canvas.width / 2, canvas.height);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += gridSize) {
    if (y % 200 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvas.height / 2);
    ctx.lineTo(canvas.width, y - cy + canvas.height / 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(30, 41, 59, 0.35)";
  ctx.lineWidth = 1.5;
  for (let x = Math.floor(startX / 200) * 200; x < endX; x += 200) {
    ctx.beginPath();
    ctx.moveTo(x - cx + canvas.width / 2, 0);
    ctx.lineTo(x - cx + canvas.width / 2, canvas.height);
    ctx.stroke();
  }
  for (let y = Math.floor(startY / 200) * 200; y < endY; y += 200) {
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvas.height / 2);
    ctx.lineTo(canvas.width, y - cy + canvas.height / 2);
    ctx.stroke();
  }

  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) * 0.8
  );
  grad.addColorStop(0, "rgba(5, 5, 8, 0)");
  grad.addColorStop(1, "rgba(5, 5, 8, 0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawStatBar(label: string, level: number, x: number, y: number, color: string, hotkey: string) {
  const barW = 140;
  const barH = 16;
  const maxLvl = 7;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText(label, x - 8, y + 12);

  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.beginPath();
  ctx.roundRect(x, y, barW, barH, 4);
  ctx.fill();

  const fillW = (level / maxLvl) * barW;
  if (fillW > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, fillW, barH, 4);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < maxLvl; i++) {
    const sx = x + (i / maxLvl) * barW;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx, y + barH);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, barW, barH, 4);
  ctx.stroke();

  if (upgradePoints > 0 && level < maxLvl) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("+" + hotkey, x + barW + 6, y + 13);
  }
}

function drawUpgradePanel() {
  const panelX = 12;
  const panelY = 100;
  const rowH = 24;
  const labelW = 90;

  ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
  ctx.beginPath();
  ctx.roundRect(panelX - 6, panelY - 34, labelW + 160, rowH * 8 + 50, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX - 6, panelY - 34, labelW + 160, rowH * 8 + 50, 10);
  ctx.stroke();

  if (upgradePoints > 0) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`UPGRADE_POINTS: ${upgradePoints}`, panelX, panelY - 14);
  } else {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("SYS_KERNEL_METRICS", panelX, panelY - 14);
  }

  const barX = panelX + labelW;

  drawStatBar("REGEN", statRegen, barX, panelY, "#10b981", "1");
  drawStatBar("CORE_MAX", statMaxHP, barX, panelY + rowH, "#22c55e", "2");
  drawStatBar("VELOCITY", statSpeed, barX, panelY + 2 * rowH, "#3b82f6", "3");
  drawStatBar("DRN_DMG", statMinionDmg, barX, panelY + 3 * rowH, "#ef4444", "4");
  drawStatBar("DRN_VEL", statMinionSpeed, barX, panelY + 4 * rowH, "#f97316", "5");
  drawStatBar("DRN_HP", statMinionHP, barX, panelY + 5 * rowH, "#06b6d4", "6");
  drawStatBar("DRN_PRC", statMinionPierce, barX, panelY + 6 * rowH, "#8b5cf6", "7");
  drawStatBar("DRN_REG", statMinionRegen, barX, panelY + 7 * rowH, "#a3e635", "8");
}

function drawHUD() {
  const barWidth = 350;
  const barHeight = 16;
  const centerX = canvas.width / 2;
  const bottomY = canvas.height - 30;

  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY - 24, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const hpPct = Math.min(1.0, playerHealth / Math.max(1, playerMaxHealth));
  if (hpPct > 0) {
    const hpGrad = ctx.createLinearGradient(centerX - barWidth / 2, 0, centerX + barWidth / 2, 0);
    hpGrad.addColorStop(0, "#00f0ff");
    hpGrad.addColorStop(1, "#6366f1");
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, bottomY - 24, barWidth * hpPct, barHeight, 6);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const xpPct = Math.min(1.0, currentXP / Math.max(1, maxXP));
  if (xpPct > 0) {
    const xpGrad = ctx.createLinearGradient(centerX - barWidth / 2, 0, centerX + barWidth / 2, 0);
    xpGrad.addColorStop(0, "#fbbf24");
    xpGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = xpGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, bottomY, barWidth * xpPct, barHeight, 6);
    ctx.fill();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`CORE_REV: ${currentLevel}`, centerX, bottomY - 28);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`DATA_HARVESTED: ${currentScore}`, 20, canvas.height - 25);

  let activeMinions = 0;
  for (const ent of renderEntities.values()) {
    if (ent.type === 4) activeMinions++;
  }
  ctx.textAlign = "right";
  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.fillText(`THREAD_SLOTS: ${activeMinions}`, canvas.width - 20, 35);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`SECTOR: ${waveNumber}`, centerX, bottomY - 54);
}

function drawMenuShape(x: number, y: number, radius: number, sides: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function renderMenu() {
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  menuAnimAngle += 0.008;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  for (let i = 0; i < 12; i++) {
    const a = menuAnimAngle + (i / 12) * Math.PI * 2;
    const r = 280 + Math.sin(menuAnimAngle * 2 + i) * 40;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r;
    const sides = [3, 4, 5, 6][i % 4];
    const colors = ["rgba(255, 42, 95, 0.12)", "rgba(168, 85, 247, 0.12)", "rgba(0, 240, 255, 0.12)", "rgba(250, 204, 21, 0.12)"];
    drawMenuShape(sx, sy, 20 + (i % 3) * 8, sides, menuAnimAngle * (i % 2 === 0 ? 1 : -1), colors[i % 4]);
  }

  ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 250, cy - 160);
  ctx.lineTo(cx + 250, cy - 160);
  ctx.stroke();

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 44px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("NECRO-GEOMETRY", cx, cy - 120);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("[COGNITIVE CORE SYNC // ACTIVE]", cx, cy - 85);

  const inputW = 320;
  const inputH = 44;
  const inputX = cx - inputW / 2;
  const inputY = cy - 10;

  ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
  ctx.beginPath();
  ctx.roundRect(inputX, inputY, inputW, inputH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = usernameInput.length > 0 ? "#ffffff" : "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  const displayText = usernameInput.length > 0 ? `>> ID: ${usernameInput}` : ">> ENTER_IDENTIFIER...";
  const blink = Math.floor(Date.now() / 500) % 2 === 0 && usernameInput.length > 0 ? "|" : "";
  ctx.fillText(displayText + blink, cx, inputY + 27);

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 80;

  const hovered = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;

  ctx.fillStyle = hovered ? "rgba(0, 240, 255, 0.15)" : "rgba(0, 240, 255, 0.05)";
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? "#00f0ff" : "rgba(0, 240, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hovered ? "#00f0ff" : "#ffffff";
  ctx.font = "bold 15px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("[INITIALIZE_KERNEL]", cx, btnY + 32);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("WASD/MOVE | MOUSE/AIM | CLICK/FIRE | SPACE/SUMMON", cx, canvas.height - 40);
}

function renderGameOver() {
  ctx.fillStyle = "rgba(5, 5, 8, 0.95)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.fillStyle = "#ff2a5f";
  ctx.font = "bold 40px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("CRITICAL CORE FAILURE", cx, cy - 100);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("SECTOR METRICS REPORT // EXCEPTION COLLAPSE", cx, cy - 65);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px 'JetBrains Mono', monospace";
  ctx.fillText(`DATA_HARVESTED: ${gameOverScore}`, cx, cy - 10);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillText(`CYCLES_STABLE: ${gameOverWave}`, cx, cy + 25);

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 90;

  const hovered = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;

  ctx.fillStyle = hovered ? "rgba(0, 240, 255, 0.15)" : "rgba(0, 240, 255, 0.05)";
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? "#00f0ff" : "rgba(0, 240, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hovered ? "#00f0ff" : "#ffffff";
  ctx.font = "bold 15px 'JetBrains Mono', monospace";
  ctx.fillText("[REBOOT_CORE]", cx, btnY + 32);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("Press ENTER to reboot kernel", cx, canvas.height - 40);
}

function renderGame() {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let px = arenaWidth / 2;
  let py = arenaHeight / 2;

  if (playerId !== null) {
    const me = renderEntities.get(playerId);
    if (me) {
      me.x = lerp(me.x, me.targetX, 0.2);
      me.y = lerp(me.y, me.targetY, 0.2);
      me.angle = lerpAngle(me.angle, me.targetAngle, 0.2);
      px = me.x;
      py = me.y;
    }
  }

  drawGrid(px, py);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.strokeRect(canvas.width / 2 - px, canvas.height / 2 - py, arenaWidth, arenaHeight);

  for (const ent of renderEntities.values()) {
    if (ent.id !== playerId) {
      ent.x = lerp(ent.x, ent.targetX, 0.2);
      ent.y = lerp(ent.y, ent.targetY, 0.2);
      ent.angle = lerpAngle(ent.angle, ent.targetAngle, 0.2);
    }

    const rx = ent.x - px + canvas.width / 2;
    const ry = ent.y - py + canvas.height / 2;

    if (rx < -50 || rx > canvas.width + 50 || ry < -50 || ry > canvas.height + 50) {
      continue;
    }

    if (ent.type === 4) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(ent.angle);

    if (ent.type === 0) {
      if (ent.subtype === 3 && (ent.stateFlags & 1) !== 0) {
        ctx.globalAlpha = 0.3;
      }

      ctx.fillStyle = "#0088cc";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3;

      if (ent.subtype === 1) {
        const cacheKey = `p_warrior_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0088cc";
          c.strokeStyle = "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
          c.fillStyle = "#00f0ff";
          c.beginPath();
          c.arc(0, 0, 4, 0, Math.PI * 2);
          c.fill();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 2) {
        const cacheKey = `p_archer_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0088cc";
          c.strokeStyle = "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 3; i++) {
            const a = (i * 2 * Math.PI) / 3;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);

        const chargePct = (ent.stateFlags >> 8) / 100.0;
        if (chargePct > 0) {
          ctx.beginPath();
          ctx.arc(0, 0, ent.radius + 4 + chargePct * 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 240, 255, 0.7)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (ent.subtype === 3) {
        const cacheKey = `p_rogue_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0088cc";
          c.strokeStyle = "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 4) {
        const cacheKey = `p_mage_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0088cc";
          c.strokeStyle = "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else {
        const cacheKey = `p_default_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0088cc";
          c.strokeStyle = "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      }

      if ((ent.stateFlags & 2) !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.fillRect(-ent.radius - 8, -ent.radius - 8, (ent.radius + 8) * 2, (ent.radius + 8) * 2);
        ctx.restore();
      }

      ctx.globalAlpha = 1.0;

      if (ent.health < ent.maxHealth) {
        ctx.rotate(-ent.angle);
        const barW = ent.radius * 2;
        const barH = 4;
        const barY = -ent.radius - 10;
        ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
        ctx.beginPath();
        ctx.roundRect(-ent.radius, barY, barW, barH, 2);
        ctx.fill();

        const pct = Math.min(1, Math.max(0, ent.health / ent.maxHealth));
        if (pct > 0) {
          ctx.fillStyle = "#00f0ff";
          ctx.beginPath();
          ctx.roundRect(-ent.radius, barY, barW * pct, barH, 2);
          ctx.fill();
        }
      }
    } else if (ent.type === 1) {
      if (ent.subtype === 1) {
        const cacheKey = `m_1_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#990022";
          c.strokeStyle = "#ff2a5f";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 2) {
        const cacheKey = `m_2_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#990022";
          c.strokeStyle = "#ff2a5f";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * 2 * Math.PI) / 6;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 3) {
        const cacheKey = `m_3_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#990022";
          c.strokeStyle = "#ff2a5f";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 3; i++) {
            const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else {
        const cacheKey = `m_0_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#990022";
          c.strokeStyle = "#ff2a5f";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      }

      if (ent.health < ent.maxHealth) {
        ctx.rotate(-ent.angle);
        const barW = ent.radius * 2;
        const barH = 4;
        const barY = -ent.radius - 10;
        ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
        ctx.beginPath();
        ctx.roundRect(-ent.radius, barY, barW, barH, 2);
        ctx.fill();

        const pct = Math.min(1, Math.max(0, ent.health / ent.maxHealth));
        if (pct > 0) {
          ctx.fillStyle = "#ff2a5f";
          ctx.beginPath();
          ctx.roundRect(-ent.radius, barY, barW * pct, barH, 2);
          ctx.fill();
        }
      }
    } else if (ent.type === 2) {
      if (ent.subtype === 1) {
        ctx.fillStyle = "#ff2a5f";
      } else if (ent.subtype === 2) {
        ctx.fillStyle = "#a855f7";
      } else {
        ctx.fillStyle = "#00f0ff";
      }
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#050508";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (ent.type === 3) {
      ctx.save();
      ctx.rotate(Date.now() / 350);
      ctx.fillStyle = "#eab308";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -ent.radius);
      ctx.lineTo(ent.radius, 0);
      ctx.lineTo(0, ent.radius);
      ctx.lineTo(-ent.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (ent.type === 4) {
      ctx.fillStyle = "#6366f1";
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (ent.health < ent.maxHealth) {
        ctx.rotate(-ent.angle);
        const barW = ent.radius * 2;
        const barH = 4;
        const barY = -ent.radius - 8;
        ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
        ctx.beginPath();
        ctx.roundRect(-ent.radius, barY, barW, barH, 2);
        ctx.fill();

        const pct = Math.min(1, Math.max(0, ent.health / ent.maxHealth));
        if (pct > 0) {
          ctx.fillStyle = "#a855f7";
          ctx.beginPath();
          ctx.roundRect(-ent.radius, barY, barW * pct, barH, 2);
          ctx.fill();
        }
      }
    } else if (ent.type === 5) {
      ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(139, 92, 246, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life++;
    p.alpha = 1.0 - (p.life / p.maxLife);
    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }
    const rx = p.x - px + canvas.width / 2;
    const ry = p.y - py + canvas.height / 2;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(rx, ry, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawHUD();
  drawUpgradePanel();

  if (playerId !== null) {
    const me = renderEntities.get(playerId);
    if (me && me.subtype === 0 && currentLevel >= 10) {
      drawClassSelectionUI();
    }
  }
}

function render() {
  if (gameState === "menu") {
    renderMenu();
  } else if (gameState === "playing") {
    renderGame();
  } else if (gameState === "gameover") {
    renderGameOver();
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function sendClassUpgrade(classId: number) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint8(0, 5);
    view.setUint8(1, classId);
    socket.send(buffer);
  }
}

function drawClassSelectionUI() {
  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("CHOOSE YOUR EVOLUTION", cx, cy - 180);

  const cardW = 180;
  const cardH = 240;
  const gap = 20;
  const startX = cx - 390;
  const startY = cy - 120;

  const classes = [
    { name: "WARRIOR", color: "#00f0ff", desc: "Kinetic shield & dash", shape: 6 },
    { name: "ARCHER", color: "#fbbf24", desc: "Charged sniper shot", shape: 3 },
    { name: "ROGUE", color: "#ff2a5f", desc: "Stealth & crit attacks", shape: 4 },
    { name: "MAGE", color: "#a855f7", desc: "Chrono-fields slow zone", shape: 8 }
  ];

  for (let i = 0; i < 4; i++) {
    const cls = classes[i];
    const x = startX + i * (cardW + gap);
    const y = startY;

    const hovered = mouseX >= x && mouseX <= x + cardW && mouseY >= y && mouseY <= y + cardH;

    ctx.fillStyle = hovered ? "rgba(30, 41, 59, 0.45)" : "rgba(5, 5, 8, 0.75)";
    ctx.strokeStyle = hovered ? cls.color : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = hovered ? 3 : 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(x + cardW / 2, y + 60);
    ctx.fillStyle = cls.color + "33";
    ctx.strokeStyle = cls.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const sides = cls.shape;
    const r = 28;
    for (let j = 0; j < sides; j++) {
      const a = (j * 2 * Math.PI) / sides - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(cls.name, x + cardW / 2, y + 130);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'JetBrains Mono', monospace";
    
    const words = cls.desc.split(" ");
    let line = "";
    let lineY = y + 165;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardW - 24 && n > 0) {
        ctx.fillText(line, x + cardW / 2, lineY);
        line = words[n] + " ";
        lineY += 16;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x + cardW / 2, lineY);
  }
}
