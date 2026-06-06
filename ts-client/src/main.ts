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

  socket.onmessage = (event) => {
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
  };

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
      if (keys.w) mask |= 0x01;
      if (keys.a) mask |= 0x02;
      if (keys.s) mask |= 0x04;
      if (keys.d) mask |= 0x08;
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
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  const gridSize = 40;
  const startX = Math.floor((cx - canvas.width / 2) / gridSize) * gridSize;
  const endX = cx + canvas.width / 2;
  const startY = Math.floor((cy - canvas.height / 2) / gridSize) * gridSize;
  const endY = cy + canvas.height / 2;

  for (let x = startX; x < endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x - cx + canvas.width / 2, 0);
    ctx.lineTo(x - cx + canvas.width / 2, canvas.height);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvas.height / 2);
    ctx.lineTo(canvas.width, y - cy + canvas.height / 2);
    ctx.stroke();
  }
}

function drawStatBar(label: string, level: number, x: number, y: number, color: string, hotkey: string) {
  const barW = 140;
  const barH = 16;
  const maxLvl = 7;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(label, x - 6, y + 12);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, barW, barH);

  const fillW = (level / maxLvl) * barW;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, fillW, barH);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  for (let i = 1; i < maxLvl; i++) {
    const sx = x + (i / maxLvl) * barW;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx, y + barH);
    ctx.stroke();
  }

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, barW, barH);

  if (upgradePoints > 0 && level < maxLvl) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("+" + hotkey, x + barW + 4, y + 13);
  }
}

function drawUpgradePanel() {
  const panelX = 12;
  const panelY = 100;
  const rowH = 24;
  const labelW = 90;

  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.fillRect(panelX - 4, panelY - 30, labelW + 160, rowH * 8 + 50);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX - 4, panelY - 30, labelW + 160, rowH * 8 + 50);

  if (upgradePoints > 0) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`POINTS: ${upgradePoints}`, panelX, panelY - 12);
  } else {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("STATS", panelX, panelY - 12);
  }

  const barX = panelX + labelW;

  const stats: [string, number, string, string][] = [
    ["Regen", statRegen, "#10b981", "1"],
    ["Max HP", statMaxHP, "#22c55e", "2"],
    ["Speed", statSpeed, "#3b82f6", "3"],
    ["M.Damage", statMinionDmg, "#ef4444", "4"],
    ["M.Speed", statMinionSpeed, "#f97316", "5"],
    ["M.Health", statMinionHP, "#06b6d4", "6"],
    ["M.Pierce", statMinionPierce, "#8b5cf6", "7"],
    ["M.Regen", statMinionRegen, "#a3e635", "8"],
  ];

  for (let i = 0; i < stats.length; i++) {
    drawStatBar(stats[i][0], stats[i][1], barX, panelY + i * rowH, stats[i][2], stats[i][3]);
  }
}

function drawHUD() {
  const barWidth = 350;
  const barHeight = 16;
  const centerX = canvas.width / 2;
  const bottomY = canvas.height - 30;

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(centerX - barWidth / 2, bottomY, barWidth, barHeight);
  const xpPct = Math.min(1.0, currentXP / Math.max(1, maxXP));
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(centerX - barWidth / 2, bottomY, barWidth * xpPct, barHeight);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - barWidth / 2, bottomY, barWidth, barHeight);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(centerX - barWidth / 2, bottomY - 24, barWidth, barHeight);
  const hpPct = Math.min(1.0, playerHealth / Math.max(1, playerMaxHealth));
  ctx.fillStyle = "#10b981";
  ctx.fillRect(centerX - barWidth / 2, bottomY - 24, barWidth * hpPct, barHeight);
  ctx.strokeRect(centerX - barWidth / 2, bottomY - 24, barWidth, barHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`LVL ${currentLevel}`, centerX, bottomY - 28);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${currentScore}`, 20, canvas.height - 25);

  let activeMinions = 0;
  for (const ent of renderEntities.values()) {
    if (ent.type === 4) activeMinions++;
  }
  ctx.textAlign = "right";
  ctx.fillText(`MINIONS: ${activeMinions}`, canvas.width - 20, 35);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`WAVE ${waveNumber}`, centerX, bottomY - 54);
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
  ctx.fillStyle = "#0f172a";
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
    const colors = ["#f43f5e33", "#a855f733", "#0ea5e933", "#fbbf2433"];
    drawMenuShape(sx, sy, 20 + (i % 3) * 8, sides, menuAnimAngle * (i % 2 === 0 ? 1 : -1), colors[i % 4]);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NECRO-GEOMETRY", cx, cy - 120);

  ctx.fillStyle = "#64748b";
  ctx.font = "18px sans-serif";
  ctx.fillText("Summoner Rogue-like Bullet Hell", cx, cy - 80);

  const inputW = 280;
  const inputH = 44;
  const inputX = cx - inputW / 2;
  const inputY = cy - 10;

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(inputX, inputY, inputW, inputH);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(inputX, inputY, inputW, inputH);

  ctx.fillStyle = usernameInput.length > 0 ? "#ffffff" : "#64748b";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  const displayText = usernameInput.length > 0 ? usernameInput : "Enter your name...";
  const blink = Math.floor(Date.now() / 500) % 2 === 0 && usernameInput.length > 0 ? "|" : "";
  ctx.fillText(displayText + blink, cx, inputY + 28);

  const btnW = 260;
  const btnH = 56;
  const btnX = cx - btnW / 2;
  const btnY = cy + 80;

  const hovered = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;

  const gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
  gradient.addColorStop(0, hovered ? "#0ea5e9" : "#0284c7");
  gradient.addColorStop(1, hovered ? "#06b6d4" : "#0369a1");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PLAY", cx, btnY + 36);

  ctx.fillStyle = "#475569";
  ctx.font = "13px sans-serif";
  ctx.fillText("WASD to move | Summon minions to fight", cx, canvas.height - 40);
}

function renderGameOver() {
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", cx, cy - 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`SCORE: ${gameOverScore}`, cx, cy - 30);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "22px sans-serif";
  ctx.fillText(`Wave Reached: ${gameOverWave}`, cx, cy + 20);

  const btnW = 260;
  const btnH = 56;
  const btnX = cx - btnW / 2;
  const btnY = cy + 100;

  const hovered = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;

  const gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
  gradient.addColorStop(0, hovered ? "#0ea5e9" : "#0284c7");
  gradient.addColorStop(1, hovered ? "#06b6d4" : "#0369a1");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("PLAY AGAIN", cx, btnY + 36);

  ctx.fillStyle = "#475569";
  ctx.font = "14px sans-serif";
  ctx.fillText("Press ENTER to return to menu", cx, canvas.height - 40);
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

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(ent.angle);

    if (ent.type === 0) {
      if (ent.subtype === 3 && (ent.stateFlags & 1) !== 0) {
        ctx.globalAlpha = 0.3; // Rogue stealth
      }

      ctx.fillStyle = "#0284c7";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;

      if (ent.subtype === 1) { // Warrior (Hexagon)
        const cacheKey = `p_warrior_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0284c7";
          c.strokeStyle = "#0f172a";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 2) { // Archer (Triangle)
        const cacheKey = `p_archer_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0284c7";
          c.strokeStyle = "#0f172a";
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
      } else if (ent.subtype === 3) { // Rogue (Diamond)
        const cacheKey = `p_rogue_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0284c7";
          c.strokeStyle = "#0f172a";
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
      } else if (ent.subtype === 4) { // Mage (Octagon)
        const cacheKey = `p_mage_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0284c7";
          c.strokeStyle = "#0f172a";
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
      } else { // Default Tank (Circle)
        const cacheKey = `p_default_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0284c7";
          c.strokeStyle = "#0f172a";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      }

      ctx.globalAlpha = 1.0;

      if (ent.health < ent.maxHealth) {
        ctx.rotate(-ent.angle);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-ent.radius, -ent.radius - 12, ent.radius * 2, 5);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-ent.radius, -ent.radius - 12, ent.radius * 2 * (ent.health / ent.maxHealth), 5);
      }
    } else if (ent.type === 1) {
      if (ent.subtype === 1) {
        const cacheKey = `m_1_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#f43f5e";
          c.strokeStyle = "#0f172a";
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
          c.fillStyle = "#f43f5e";
          c.strokeStyle = "#0f172a";
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
          c.fillStyle = "#f43f5e";
          c.strokeStyle = "#0f172a";
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
          c.fillStyle = "#f43f5e";
          c.strokeStyle = "#0f172a";
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
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-ent.radius, -ent.radius - 10, ent.radius * 2, 4);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-ent.radius, -ent.radius - 10, ent.radius * 2 * (ent.health / ent.maxHealth), 4);
      }
    } else if (ent.type === 2) {
      if (ent.subtype === 1) {
        ctx.fillStyle = "#f43f5e";
      } else if (ent.subtype === 2) {
        ctx.fillStyle = "#a855f7";
      } else {
        ctx.fillStyle = "#38bdf8";
      }
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (ent.type === 3) {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (ent.type === 4) {
      ctx.fillStyle = "#a855f7";
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (ent.health < ent.maxHealth) {
        ctx.rotate(-ent.angle);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-ent.radius, -ent.radius - 8, ent.radius * 2, 3);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-ent.radius, -ent.radius - 8, ent.radius * 2 * (ent.health / ent.maxHealth), 3);
      }
    }
    ctx.restore();
  }

  drawHUD();
  drawUpgradePanel();
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
