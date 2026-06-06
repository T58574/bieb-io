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
}

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

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
let upgradeLevelAvailable = 0;
let selectedUpgradeChoice = 0;

const socket = new WebSocket("ws://" + window.location.hostname + ":8080/ws");
socket.binaryType = "arraybuffer";

socket.onopen = () => {
  socket.send(serializeJoin("Player" + Math.floor(Math.random() * 1000)));
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
    upgradeLevelAvailable = msg.activeUpgradesMask;

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
        });
      }
    }
    for (const id of renderEntities.keys()) {
      if (!receivedIds.has(id)) {
        renderEntities.delete(id);
      }
    }
  }
};

const keys = { w: false, a: false, s: false, d: false, space: false };
let mouseAngle = 0;

window.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "W") keys.w = true;
  if (e.key === "a" || e.key === "A") keys.a = true;
  if (e.key === "s" || e.key === "S") keys.s = true;
  if (e.key === "d" || e.key === "D") keys.d = true;
  if (e.key === " ") keys.space = true;

  if (upgradeLevelAvailable !== 0) {
    if (e.key === "1") selectedUpgradeChoice = 1;
    if (e.key === "2") selectedUpgradeChoice = 2;
    if (e.key === "3") selectedUpgradeChoice = 3;
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
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  mouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
});

window.addEventListener("mousedown", (e) => {
  if (upgradeLevelAvailable !== 0 && e.clientX < 220) {
    const startY = 150;
    const boxHeight = 70;
    const gap = 15;
    for (let i = 0; i < 3; i++) {
      const top = startY + i * (boxHeight + gap);
      if (e.clientY >= top && e.clientY <= top + boxHeight) {
        selectedUpgradeChoice = i + 1;
        break;
      }
    }
  } else {
    keys.space = true;
  }
});

window.addEventListener("mouseup", () => {
  keys.space = false;
});

setInterval(() => {
  if (socket.readyState === WebSocket.OPEN) {
    let mask = 0;
    if (keys.w) mask |= 0x01;
    if (keys.a) mask |= 0x02;
    if (keys.s) mask |= 0x04;
    if (keys.d) mask |= 0x08;
    if (keys.space) mask |= 0x10;
    socket.send(serializeInput(mask, mouseAngle, selectedUpgradeChoice));
    if (selectedUpgradeChoice !== 0) {
      selectedUpgradeChoice = 0;
    }
  }
}, 1000 / 60);

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
}

function drawUpgradeUI() {
  if (upgradeLevelAvailable === 0) return;

  const startY = 150;
  const boxWidth = 200;
  const boxHeight = 70;
  const gap = 15;

  const options = [
    { title: "1. CADET", desc: "Max 8 Minions, +30% Dmg" },
    { title: "2. OVERLORD", desc: "Minions fire guns" },
    { title: "3. BATTERING RAM", desc: "Minions front shield" },
  ];

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(10, startY - 40, boxWidth + 20, 300);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, startY - 40, boxWidth + 20, 300);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("UPGRADE AVAILABLE!", 20, startY - 15);

  for (let i = 0; i < options.length; i++) {
    const top = startY + i * (boxHeight + gap);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(20, top, boxWidth, boxHeight);
    ctx.strokeStyle = "#64748b";
    ctx.strokeRect(20, top, boxWidth, boxHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(options[i].title, 30, top + 25);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.fillText(options[i].desc, 30, top + 48);
  }
}

function render() {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const ent of renderEntities.values()) {
    ent.x = lerp(ent.x, ent.targetX, 0.2);
    ent.y = lerp(ent.y, ent.targetY, 0.2);
    ent.angle = lerpAngle(ent.angle, ent.targetAngle, 0.2);
  }

  let px = arenaWidth / 2;
  let py = arenaHeight / 2;

  if (playerId !== null) {
    const me = renderEntities.get(playerId);
    if (me) {
      px = me.x;
      py = me.y;
    }
  }

  drawGrid(px, py);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.strokeRect(canvas.width / 2 - px, canvas.height / 2 - py, arenaWidth, arenaHeight);

  for (const ent of renderEntities.values()) {
    const rx = ent.x - px + canvas.width / 2;
    const ry = ent.y - py + canvas.height / 2;

    if (rx < -50 || rx > canvas.width + 50 || ry < -50 || ry > canvas.height + 50) {
      continue;
    }

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(ent.angle);

    if (ent.type === 0) {
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, -9, 32, 18);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, -9, 32, 18);

      if (ent.subtype === 1) {
        ctx.fillStyle = "#0ea5e9";
      } else if (ent.subtype === 2) {
        ctx.fillStyle = "#8b5cf6";
      } else if (ent.subtype === 3) {
        ctx.fillStyle = "#ec4899";
      } else {
        ctx.fillStyle = "#0284c7";
      }

      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (ent.health < ent.maxHealth) {
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-ent.radius, -ent.radius - 12, ent.radius * 2, 5);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-ent.radius, -ent.radius - 12, ent.radius * 2 * (ent.health / ent.maxHealth), 5);
      }
    } else if (ent.type === 1) {
      ctx.fillStyle = "#f43f5e";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;

      if (ent.subtype === 1) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * ent.radius, Math.sin(a) * ent.radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (ent.subtype === 2) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * 2 * Math.PI) / 6;
          ctx.lineTo(Math.cos(a) * ent.radius, Math.sin(a) * ent.radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (ent.subtype === 3) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * ent.radius, Math.sin(a) * ent.radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (ent.health < ent.maxHealth) {
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
    }
    ctx.restore();
  }

  drawHUD();
  drawUpgradeUI();

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
