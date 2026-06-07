import { state, renderEntities } from "./state";
import { drawAndUpdateParticles } from "./particles";
import { sendClassUpgrade } from "./network";
import localizationData from "./items_localization.json";

export const shapeCache = new Map<string, HTMLCanvasElement>();

export function getShapeCanvas(key: string, radius: number, drawFn: (ctx: CanvasRenderingContext2D, r: number) => void): HTMLCanvasElement {
  if (shapeCache.has(key)) return shapeCache.get(key)!;
  const c = document.createElement("canvas");
  const padding = 6;
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

export function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

export function drawGrid(ctx: CanvasRenderingContext2D, cx: number, cy: number, canvasWidth: number, canvasHeight: number) {
  const gridSize = 40;
  const startX = Math.floor((cx - canvasWidth / 2) / gridSize) * gridSize;
  const endX = cx + canvasWidth / 2;
  const startY = Math.floor((cy - canvasHeight / 2) / gridSize) * gridSize;
  const endY = cy + canvasHeight / 2;

  ctx.strokeStyle = "rgba(15, 23, 42, 0.15)";
  ctx.lineWidth = 1;
  for (let x = startX; x < endX; x += gridSize) {
    if (x % 200 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(x - cx + canvasWidth / 2, 0);
    ctx.lineTo(x - cx + canvasWidth / 2, canvasHeight);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += gridSize) {
    if (y % 200 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvasHeight / 2);
    ctx.lineTo(canvasWidth, y - cy + canvasHeight / 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(30, 41, 59, 0.35)";
  ctx.lineWidth = 1.5;
  for (let x = Math.floor(startX / 200) * 200; x < endX; x += 200) {
    ctx.beginPath();
    ctx.moveTo(x - cx + canvasWidth / 2, 0);
    ctx.lineTo(x - cx + canvasWidth / 2, canvasHeight);
    ctx.stroke();
  }
  for (let y = Math.floor(startY / 200) * 200; y < endY; y += 200) {
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvasHeight / 2);
    ctx.lineTo(canvasWidth, y - cy + canvasHeight / 2);
    ctx.stroke();
  }
}



export function drawUpgradeCardsOverlay(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  ctx.fillStyle = "#00f0ff";
  ctx.font = `bold ${24 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("ДОСТУПНО ОБНОВЛЕНИЕ ПО", cx, cy - 200 * uiScale);

  const cardW = 200 * uiScale;
  const cardH = 280 * uiScale;
  const gap = 30 * uiScale;
  const startX = cx - 330 * uiScale;
  const startY = cy - 140 * uiScale;

  const cardDetails: Record<number, { title: string; color: string; desc: string; rarity: string }> = {
    1: { title: "ОПТИМИЗАЦИЯ СКОРОСТИ", color: "#10b981", desc: "Увеличение скорости на +10%", rarity: "Common" },
    2: { title: "СОПРОЦЕССОР", color: "#fbbf24", desc: "Увеличение мощности и +5% вампиризм", rarity: "Rare" },
    3: { title: "СТАБИЛИЗАТОР ЯДРА", color: "#22c55e", desc: "Увеличение макс здоровья на +25", rarity: "Common" },
    4: { title: "РЕГЕНЕРАЦИЯ", color: "#10b981", desc: "Увеличение регенерации здоровья", rarity: "Common" },
    5: { title: "ДРОНЫ: ВЫЧИСЛЕНИЯ", color: "#06b6d4", desc: "Увеличение урона дронов на +15%", rarity: "Common" },
    6: { title: "ДРОНЫ: ЧАСТОТА", color: "#8b5cf6", desc: "Увеличение скорости дронов на +15%", rarity: "Common" },
    7: { title: "ДРОНЫ: СТАБИЛЬНОСТЬ", color: "#3b82f6", desc: "Увеличение макс. ХП дронов на +15%", rarity: "Common" },
    8: { title: "ДРОНЫ: ПРОБИТИЕ", color: "#ef4444", desc: "Дроны пробивают на +1 цель больше", rarity: "Common" },
    9: { title: "ДРОНЫ: РЕГЕНЕРАЦИЯ", color: "#a3e635", desc: "Увеличение регенерации дронов на +15%", rarity: "Common" },
    10: { title: "МИКРО-ЩИТЫ", color: "#00f0ff", desc: "Запуск защитного орбитального щита (макс 4)", rarity: "Rare" },
    11: { title: "ЯДРО НЕКРОЗА", color: "#d946ef", desc: "Все ваши снаряды взрывают убитые вирусы", rarity: "Unique" },
    12: { title: "УСИЛИТЕЛЬ УРОНА", color: "#ef4444", desc: "Увеличение урона снарядов на +5%", rarity: "Common" },
    13: { title: "РАЗГОН ОРУЖИЯ", color: "#f97316", desc: "Снижение задержки выстрела на 1%", rarity: "Common" },
    14: { title: "ВЕРОЯТНОСТЬ КРИТА", color: "#f59e0b", desc: "Шанс крит. урона +5%", rarity: "Common" },
    15: { title: "СИЛА КРИТА", color: "#eab308", desc: "Множитель крит. урона +5%", rarity: "Common" },
    16: { title: "КИНЕТИЧЕСКИЙ БАРЬЕР", color: "#84cc16", desc: "Снижение получаемого урона на 5%", rarity: "Common" },
    17: { title: "МНОЖИТЕЛЬ СНАРЯДОВ", color: "#22c55e", desc: "+1 доп. снаряд", rarity: "Rare" },
    18: { title: "БРОНЕБОЙНОСТЬ", color: "#10b981", desc: "+1 пробитие снарядов", rarity: "Rare" },
    19: { title: "УГОЛ АТАКИ", color: "#14b8a6", desc: "Увеличение разброса на +5%", rarity: "Common" },
    20: { title: "ОБУЧЕНИЕ НЕЙРОСЕТИ", color: "#0ea5e9", desc: "Получаемый опыт +1%", rarity: "Common" },
    21: { title: "КВАНТОВЫЙ АНАЛИЗАТОР", color: "#6366f1", desc: "Шанс дропа предметов +5%", rarity: "Common" }
  };

  const cards = [state.card1, state.card2, state.card3];

  for (let i = 0; i < 3; i++) {
    const cardId = cards[i];
    const details = cardDetails[cardId] || { title: "UNKNOWN", color: "#64748b", desc: "Unknown mod", rarity: "Common" };
    const x = startX + i * (cardW + gap);
    const y = startY;

    const hovered = state.mouseX >= x && state.mouseX <= x + cardW && state.mouseY >= y && state.mouseY <= y + cardH;

    ctx.fillStyle = hovered ? "rgba(30, 41, 59, 0.65)" : "rgba(15, 23, 42, 0.45)";
    ctx.strokeStyle = hovered ? details.color : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = hovered ? 3 : 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = details.color;
    ctx.font = `bold ${10 * uiScale}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(details.rarity.toUpperCase(), x + cardW / 2, y + 30 * uiScale);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${12 * uiScale}px 'JetBrains Mono', monospace`;
    const titleWords = details.title.split(" ");
    let titleY = y + 70 * uiScale;
    for (const w of titleWords) {
      ctx.fillText(w, x + cardW / 2, titleY);
      titleY += 16 * uiScale;
    }

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px 'JetBrains Mono', monospace";
    const descWords = details.desc.split(" ");
    let descLine = "";
    let descY = y + 170 * uiScale;
    for (let n = 0; n < descWords.length; n++) {
      const testLine = descLine + descWords[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardW - 24 * uiScale && n > 0) {
        ctx.fillText(descLine, x + cardW / 2, descY);
        descLine = descWords[n] + " ";
        descY += 14 * uiScale;
      } else {
        descLine = testLine;
      }
    }
    ctx.fillText(descLine, x + cardW / 2, descY);

    ctx.fillStyle = hovered ? "#00f0ff" : "#64748b";
    ctx.font = `bold ${11 * uiScale}px 'JetBrains Mono', monospace`;
    ctx.fillText(`[НАЖМИТЕ ${i + 1}]`, x + cardW / 2, y + cardH - 25 * uiScale);
  }
}

export function drawUpgradePanel(ctx: CanvasRenderingContext2D, uiScale: number) {
  interface UpgradeDetail {
    id: string;
    name: string;
    count: number;
    color: string;
    abbrev: string;
    desc: string;
  }

  const activeUpgrades: UpgradeDetail[] = [];
  if (state.statRegen > 0) activeUpgrades.push({ id: "regen", name: "РЕГЕНЕРАЦИЯ", count: state.statRegen, color: "#10b981", abbrev: "HP\nReg", desc: "Автоматическое восстановление здоровья." });
  if (state.statMaxHP > 0) activeUpgrades.push({ id: "hp", name: "МАКС. ЗДОРОВЬЕ", count: state.statMaxHP, color: "#22c55e", abbrev: "Max\nHP", desc: "Увеличение максимального здоровья." });
  if (state.statSpeed > 0) activeUpgrades.push({ id: "speed", name: "СКОРОСТЬ ДВИЖЕНИЯ", count: state.statSpeed, color: "#3b82f6", abbrev: "Move\nSpd", desc: "Повышение скорости перемещения." });
  if (state.statMinionDmg > 0) activeUpgrades.push({ id: "minion_dmg", name: "УРОН ДРОНОВ", count: state.statMinionDmg, color: "#ef4444", abbrev: "Drn\nDmg", desc: "Увеличение урона дронов." });
  if (state.statMinionSpeed > 0) activeUpgrades.push({ id: "minion_speed", name: "СКОРОСТЬ ДРОНОВ", count: state.statMinionSpeed, color: "#f97316", abbrev: "Drn\nSpd", desc: "Повышение скорости дронов." });
  if (state.statMinionHP > 0) activeUpgrades.push({ id: "minion_hp", name: "ЗДОРОВЬЕ ДРОНОВ", count: state.statMinionHP, color: "#06b6d4", abbrev: "Drn\nHP", desc: "Увеличение прочности дронов." });
  if (state.statMinionPierce > 0) activeUpgrades.push({ id: "minion_pierce", name: "ПРОБИВАЕМОСТЬ ДРОНОВ", count: state.statMinionPierce, color: "#8b5cf6", abbrev: "Drn\nPrc", desc: "Количество пробиваемых врагов." });
  if (state.statMinionRegen > 0) activeUpgrades.push({ id: "minion_regen", name: "РЕГЕНЕРАЦИЯ ДРОНОВ", count: state.statMinionRegen, color: "#a3e635", abbrev: "Drn\nReg", desc: "Восстановление прочности дронов." });

  if (activeUpgrades.length === 0) {
    return;
  }

  const startY = 120 * uiScale;
  const slotW = 44 * uiScale;
  const slotH = 44 * uiScale;
  const gap = 6 * uiScale;
  const leftX = 22 * uiScale;

  const rows = Math.max(1, Math.ceil(activeUpgrades.length / 4));
  const height = rows * (slotH + gap) + 50 * uiScale;

  ctx.fillStyle = "rgba(5, 5, 8, 0.65)";
  ctx.beginPath();
  ctx.roundRect(leftX - 10 * uiScale, startY - 30 * uiScale, 214 * uiScale, height, 10 * uiScale);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5 * uiScale;
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = `bold ${10 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("УСИЛЕНИЯ ПЕРСОНАЖА", leftX + 97 * uiScale, startY - 10 * uiScale);

  for (let i = 0; i < activeUpgrades.length; i++) {
    const upg = activeUpgrades[i];
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = leftX + c * (slotW + gap);
    const y = startY + r * (slotH + gap);

    const hovered = state.mouseX >= x && state.mouseX <= x + slotW && state.mouseY >= y && state.mouseY <= y + slotH;

    ctx.fillStyle = hovered ? "rgba(30, 41, 59, 0.75)" : "rgba(10, 15, 26, 0.75)";
    ctx.strokeStyle = upg.color;
    ctx.lineWidth = hovered ? 2.5 * uiScale : 1.5 * uiScale;

    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 6 * uiScale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = upg.color;
    ctx.font = `bold ${8 * uiScale}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    const lines = upg.abbrev.split("\n");
    ctx.fillText(lines[0], x + slotW / 2, y + 18 * uiScale);
    if (lines[1]) {
      ctx.fillText(lines[1], x + slotW / 2, y + 28 * uiScale);
    }

    if (upg.count > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${11 * uiScale}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "right";
      ctx.fillText(`v${upg.count}`, x + slotW - 4 * uiScale, y + slotH - 4 * uiScale);
    }

    if (hovered) {
      ctx.save();
      ctx.fillStyle = "rgba(5, 5, 8, 0.95)";
      ctx.strokeStyle = upg.color;
      ctx.lineWidth = 1.5 * uiScale;
      const popW = 180 * uiScale;
      const popH = 64 * uiScale;
      const popX = leftX + 214 * uiScale + 10 * uiScale;
      const popY = y - 5 * uiScale;
      ctx.beginPath();
      ctx.roundRect(popX, popY, popW, popH, 8 * uiScale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${11 * uiScale}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "left";
      ctx.fillText(upg.name, popX + 10 * uiScale, popY + 18 * uiScale);

      ctx.fillStyle = "#94a3b8";
      ctx.font = `${9 * uiScale}px 'JetBrains Mono', monospace`;
      const descLines = upg.desc.split("\n");
      ctx.fillText(descLines[0], popX + 10 * uiScale, popY + 34 * uiScale);
      if (descLines[1]) {
        ctx.fillText(descLines[1], popX + 10 * uiScale, popY + 46 * uiScale);
      }
      ctx.restore();
    }
  }
}

export function drawInventoryHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  const startY = 120 * uiScale;
  const slotW = 44 * uiScale;
  const slotH = 44 * uiScale;
  const gap = 6 * uiScale;
  const rightX = canvasWidth - 210 * uiScale;

  const itemDetails: Record<string, { name: string; color: string; desc: string; abbrev: string; rarity: string }> = localizationData.items;

  const itemCounts = new Map<number, number>();
  for (let i = 0; i < 100; i++) {
    const itemID = state.inventory[2 * i];
    const count = state.inventory[2 * i + 1];
    if (itemID && itemID !== 0 && count > 0) {
      itemCounts.set(itemID, count);
    }
  }

  const uniqueItems = Array.from(itemCounts.keys());
  const rows = Math.max(1, Math.ceil(uniqueItems.length / 4));
  const height = rows * (slotH + gap) + 50 * uiScale;

  ctx.fillStyle = "rgba(5, 5, 8, 0.65)";
  ctx.beginPath();
  ctx.roundRect(rightX - 10 * uiScale, startY - 30 * uiScale, 214 * uiScale, height, 10 * uiScale);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5 * uiScale;
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = `bold ${10 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText(localizationData.ui.module_title, rightX + 97 * uiScale, startY - 10 * uiScale);

  for (let i = 0; i < uniqueItems.length; i++) {
    const itemID = uniqueItems[i];
    const count = itemCounts.get(itemID) || 1;
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = rightX + c * (slotW + gap);
    const y = startY + r * (slotH + gap);

    const hovered = state.mouseX >= x && state.mouseX <= x + slotW && state.mouseY >= y && state.mouseY <= y + slotH;

    let borderColor = "rgba(255, 255, 255, 0.15)";
    const details = itemDetails[itemID];
    if (details) {
      if (details.rarity === "Common") borderColor = "#10b981";
      else if (details.rarity === "Rare") borderColor = "#3b82f6";
      else if (details.rarity === "Unique") borderColor = "#f97316";
    }

    ctx.fillStyle = hovered ? "rgba(30, 41, 59, 0.75)" : "rgba(10, 15, 26, 0.75)";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = hovered ? 2.5 * uiScale : 1.5 * uiScale;

    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 6 * uiScale);
    ctx.fill();
    ctx.stroke();

    if (details) {
      ctx.fillStyle = details.color;
      ctx.font = `bold ${8 * uiScale}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      const lines = details.abbrev.split("\n");
      ctx.fillText(lines[0], x + slotW / 2, y + 18 * uiScale);
      if (lines[1]) {
        ctx.fillText(lines[1], x + slotW / 2, y + 28 * uiScale);
      }

      if (count > 1) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${11 * uiScale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "right";
        ctx.fillText(`x${count}`, x + slotW - 4 * uiScale, y + slotH - 4 * uiScale);
      }

      if (hovered) {
        ctx.save();
        ctx.fillStyle = "rgba(5, 5, 8, 0.95)";
        ctx.strokeStyle = details.color;
        ctx.lineWidth = 1.5 * uiScale;
        const popW = 180 * uiScale;
        const popH = 80 * uiScale;
        const popX = rightX - popW - 15 * uiScale;
        const popY = y - 5 * uiScale;
        ctx.beginPath();
        ctx.roundRect(popX, popY, popW, popH, 8 * uiScale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${11 * uiScale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "left";
        ctx.fillText(details.name, popX + 10 * uiScale, popY + 18 * uiScale);

        ctx.fillStyle = "#94a3b8";
        ctx.font = `${9 * uiScale}px 'JetBrains Mono', monospace`;
        const descLines = details.desc.split("\n");
        ctx.fillText(descLines[0], popX + 10 * uiScale, popY + 34 * uiScale);
        if (descLines[1]) {
          ctx.fillText(descLines[1], popX + 10 * uiScale, popY + 46 * uiScale);
        }

        ctx.fillStyle = "#ef4444";
        ctx.font = `bold ${9 * uiScale}px 'JetBrains Mono', monospace`;
        ctx.fillText("[НАЖМИТЕ X ДЛЯ УДАЛЕНИЯ]", popX + 10 * uiScale, popY + popH - 12 * uiScale);
        ctx.restore();
      }
    }
  }
}

export function drawHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  const barWidth = 350 * uiScale;
  const barHeight = 16 * uiScale;
  const centerX = canvasWidth / 2;
  const bottomY = canvasHeight - 30 * uiScale;

  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY - 24 * uiScale, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const hpPct = Math.min(1.0, state.playerHealth / Math.max(1, state.playerMaxHealth));
  if (hpPct > 0) {
    const hpGrad = ctx.createLinearGradient(centerX - barWidth / 2, 0, centerX + barWidth / 2, 0);
    hpGrad.addColorStop(0, "#00f0ff");
    hpGrad.addColorStop(1, "#6366f1");
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, bottomY - 24 * uiScale, barWidth * hpPct, barHeight, 6);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const xpPct = Math.min(1.0, state.currentXP / Math.max(1, state.maxXP));
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
  ctx.font = `bold ${13 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`ПРОШИВКА ЯДРА: v${state.currentLevel}`, centerX, bottomY - 28 * uiScale);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `bold ${16 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "left";
  ctx.fillText(`ПАКЕТОВ ДАННЫХ: ${state.currentScore}`, 20 * uiScale, canvasHeight - 25 * uiScale);

  let activeMinions = 0;
  for (const ent of renderEntities.values()) {
    if (ent.type === 4) activeMinions++;
  }
  ctx.textAlign = "right";
  ctx.font = `bold ${16 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.fillText(`АКТИВНЫЕ ДРОНЫ: ${activeMinions}`, canvasWidth - 20 * uiScale, 35 * uiScale);

  ctx.fillStyle = "#64748b";
  ctx.font = `bold ${13 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`${localizationData.ui.sector_prefix}${state.waveNumber}`, centerX, bottomY - 54 * uiScale);

  drawInventoryHUD(ctx, canvasWidth, canvasHeight, uiScale);
}

export function drawMenuShape(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, angle: number, color: string) {
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

export function renderMenu(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const uiScale = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  state.menuAnimAngle += 0.008;
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  for (let i = 0; i < 12; i++) {
    const a = state.menuAnimAngle + (i / 12) * Math.PI * 2;
    const r = 280 + Math.sin(state.menuAnimAngle * 2 + i) * 40;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r;
    const sides = [3, 4, 5, 6][i % 4];
    const colors = ["rgba(255, 42, 95, 0.12)", "rgba(168, 85, 247, 0.12)", "rgba(0, 240, 255, 0.12)", "rgba(250, 204, 21, 0.12)"];
    drawMenuShape(ctx, sx, sy, 20 + (i % 3) * 8, sides, state.menuAnimAngle * (i % 2 === 0 ? 1 : -1), colors[i % 4]);
  }

  ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 250, cy - 260);
  ctx.lineTo(cx + 250, cy - 260);
  ctx.stroke();

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 44px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("NECRO-GEOMETRY", cx, cy - 220);

  ctx.fillStyle = "#64748b";
  ctx.font = `bold ${13 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.fillText("[СИНХРОНИЗАЦИЯ КОГНИТИВНОГО ЯДРА // АКТИВНО]", cx, cy - 185);

  const inputW = 320;
  const inputH = 44;
  const inputX = cx - inputW / 2;
  const inputY = cy - 30 * uiScale;

  ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
  ctx.beginPath();
  ctx.roundRect(inputX, inputY, inputW, inputH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = state.usernameInput.length > 0 ? "#ffffff" : "#64748b";
  ctx.font = `bold ${13 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  const displayText = state.usernameInput.length > 0 ? `>> ID: ${state.usernameInput}` : ">> ВВЕДИТЕ ИДЕНТИФИКАТОР...";
  const blink = Math.floor(Date.now() / 500) % 2 === 0 && state.usernameInput.length > 0 ? "|" : "";
  ctx.fillText(displayText + blink, cx, inputY + 27);

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 50 * uiScale;

  const hovered = state.mouseX >= btnX && state.mouseX <= btnX + btnW && state.mouseY >= btnY && state.mouseY <= btnY + btnH;

  ctx.fillStyle = hovered ? "rgba(0, 240, 255, 0.15)" : "rgba(0, 240, 255, 0.05)";
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? "#00f0ff" : "rgba(0, 240, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hovered ? "#00f0ff" : "#ffffff";
  ctx.font = `bold ${15 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("[ЗАПУСТИТЬ ЯДРО]", cx, btnY + 32);

  ctx.fillStyle = "#475569";
  ctx.font = `bold ${11 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.fillText("WASD/ДВИЖЕНИЕ | МЫШЬ/ПРИЦЕЛ | ЛКМ/СТРЕЛЬБА | ПРОБЕЛ/ПРИЗЫВ", cx, canvasHeight - 40);
}

export function renderGameOver(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const uiScale = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  ctx.fillStyle = "rgba(5, 5, 8, 0.95)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  ctx.fillStyle = "#ff2a5f";
  ctx.font = "bold 40px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("КРИТИЧЕСКИЙ СБОЙ ЯДРА", cx, cy - 100);

  ctx.fillStyle = "#64748b";
  ctx.font = `bold ${13 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.fillText("ОТЧЕТ МЕТРИК СЕКТОРА // АВАРИЙНЫЙ КОЛЛАПС", cx, cy - 65);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px 'JetBrains Mono', monospace";
  ctx.fillText(`СОБРАНО ДАННЫХ: ${state.gameOverScore}`, cx, cy - 10);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillText(`СТАБИЛЬНЫХ ЦИКЛОВ: ${state.gameOverWave}`, cx, cy + 25);

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 90;

  const hovered = state.mouseX >= btnX && state.mouseX <= btnX + btnW && state.mouseY >= btnY && state.mouseY <= btnY + btnH;

  ctx.fillStyle = hovered ? "rgba(0, 240, 255, 0.15)" : "rgba(0, 240, 255, 0.05)";
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? "#00f0ff" : "rgba(0, 240, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hovered ? "#00f0ff" : "#ffffff";
  ctx.font = `bold ${15 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.fillText("[ПЕРЕЗАПУСК ЯДРА]", cx, btnY + 32);

  ctx.fillStyle = "#475569";
  ctx.font = `bold ${11 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.fillText(localizationData.ui.restart_prompt, cx, canvasHeight - 40);
}



export function drawPauseUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  ctx.fillStyle = "rgba(5, 5, 8, 0.65)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  ctx.fillStyle = "#00f0ff";
  ctx.font = `bold ${28 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("СИСТЕМА НА ПАУЗЕ", cx, cy - 20 * uiScale);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `bold ${13 * uiScale}px 'JetBrains Mono', monospace`;
  ctx.fillText("[НАЖМИТЕ ESC ДЛЯ ПРОДОЛЖЕНИЯ]", cx, cy + 20 * uiScale);
}

export function renderGame(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  let px = state.arenaWidth / 2;
  let py = state.arenaHeight / 2;

  if (state.playerId !== null) {
    const me = renderEntities.get(state.playerId);
    if (me) {
      me.x = lerp(me.x, me.targetX, 0.2);
      me.y = lerp(me.y, me.targetY, 0.2);
      me.angle = lerpAngle(me.angle, me.targetAngle, 0.2);
      px = me.x;
      py = me.y;
    }
  }

  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(state.cameraZoom, state.cameraZoom);
  ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

  drawGrid(ctx, px, py, canvasWidth, canvasHeight);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.strokeRect(canvasWidth / 2 - px, canvasHeight / 2 - py, state.arenaWidth, state.arenaHeight);

  for (const ent of renderEntities.values()) {
    if (ent.id !== state.playerId) {
      ent.x = lerp(ent.x, ent.targetX, 0.2);
      ent.y = lerp(ent.y, ent.targetY, 0.2);
      ent.angle = lerpAngle(ent.angle, ent.targetAngle, 0.2);
    }

    const rx = ent.x - px + canvasWidth / 2;
    const ry = ent.y - py + canvasHeight / 2;

    if (rx < -50 || rx > canvasWidth + 50 || ry < -50 || ry > canvasHeight + 50) {
      continue;
    }

    if (ent.type === 4) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2, canvasHeight / 2);
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

      const isFlashing = (ent.stateFlags & 2) !== 0;

      if (ent.subtype === 1) {
        const cacheKey = `p_ranger_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#0a1e2b";
          c.strokeStyle = isFlashing ? "#ffffff" : "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
          c.fillStyle = isFlashing ? "#ffffff" : "#00f0ff";
          c.beginPath();
          c.arc(0, 0, 4, 0, Math.PI * 2);
          c.fill();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 2) {
        const cacheKey = `p_technomage_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#1e1e0a";
          c.strokeStyle = isFlashing ? "#ffffff" : "#fbbf24";
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
      } else if (ent.subtype === 3) {
        const cacheKey = `p_necromancer_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#1e0a2b";
          c.strokeStyle = isFlashing ? "#ffffff" : "#a855f7";
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
        const cacheKey = `p_default_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#0a1e2b";
          c.strokeStyle = isFlashing ? "#ffffff" : "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      }

      const numShields = (ent.stateFlags >> 4) & 0xF;
      if (numShields > 0) {
        for (let i = 0; i < numShields; i++) {
          const orbitAngle = (Date.now() / 350) + (i / numShields) * Math.PI * 2;
          const sx = Math.cos(orbitAngle) * 55;
          const sy = Math.sin(orbitAngle) * 55;
          ctx.fillStyle = "#00f0ff";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
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
      const rarity = ent.stateFlags & 0xFF;
      const modifiers = (ent.stateFlags >> 8) & 0xFF;
      let fillColor = "#990022";
      let strokeColor = "#ff2a5f";
      if (rarity === 1) {
        fillColor = "#1e3a8a";
        strokeColor = "#3b82f6";
      } else if (rarity === 2) {
        fillColor = "#78350f";
        strokeColor = "#fbbf24";
      } else if (rarity === 3) {
        fillColor = "#581c87";
        strokeColor = "#d946ef";
      }

      if ((modifiers & 4) !== 0) {
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(34, 197, 94, 0.5)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if ((modifiers & 8) !== 0) {
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.save();
      if (ent.subtype === 10 || ent.subtype === 11 || ent.subtype === 12) {
        ctx.rotate(Date.now() / 600);
      }

      if (ent.subtype === 1) {
        const cacheKey = `m_1_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
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
        const cacheKey = `m_2_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
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
        const cacheKey = `m_3_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
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
      } else if (ent.subtype === 10) {
        const cacheKey = `m_boss_10_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 4;
          c.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (i * 2 * Math.PI) / 10;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
          c.strokeStyle = "#ffffff";
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(0, 0, r * 0.4, 0, Math.PI * 2);
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 11) {
        const cacheKey = `m_boss_11_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 4;
          c.beginPath();
          for (let i = 0; i < 16; i++) {
            const a = (i * 2 * Math.PI) / 16;
            const curR = i % 2 === 0 ? r : r * 0.65;
            c.lineTo(Math.cos(a) * curR, Math.sin(a) * curR);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 12) {
        const cacheKey = `m_boss_12_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 4;
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * 2 * Math.PI) / 8;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          c.stroke();
          c.strokeStyle = "#ffffff";
          c.lineWidth = 2;
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * 2 * Math.PI) / 8 + Math.PI / 8;
            c.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
          }
          c.closePath();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else {
        const cacheKey = `m_0_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      }
      ctx.restore();

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
        ctx.save();
        ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
        ctx.lineWidth = ent.radius * 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-ent.radius * 3, 0);
        ctx.lineTo(ent.radius * 2, 0);
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = ent.radius * 0.8;
        ctx.beginPath();
        ctx.moveTo(-ent.radius * 3, 0);
        ctx.lineTo(ent.radius * 2, 0);
        ctx.stroke();
        ctx.restore();
      } else if (ent.subtype === 2) {
        ctx.save();
        const grad = ctx.createRadialGradient(-ent.radius * 0.2, -ent.radius * 0.2, ent.radius * 0.1, 0, 0, ent.radius);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, "#00f0ff");
        grad.addColorStop(0.8, "rgba(0, 240, 255, 0.3)");
        grad.addColorStop(1, "rgba(0, 240, 255, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(-ent.radius * 0.1, -ent.radius * 0.1, ent.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (ent.subtype === 3) {
        ctx.save();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(-ent.radius, 0, ent.radius * 2, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-ent.radius, 0, ent.radius * 2, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

    } else if (ent.type === 4) {
      ctx.save();
      ctx.fillStyle = "#1e0a2b";
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const numTriangles = 3;
      const orbitRadius = ent.radius * 1.4;
      const orbitAngle = Date.now() / 400;
      ctx.fillStyle = "#c084fc";
      for (let j = 0; j < numTriangles; j++) {
        const a = orbitAngle + (j * Math.PI * 2) / numTriangles;
        const tx = Math.cos(a) * orbitRadius;
        const ty = Math.sin(a) * orbitRadius;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(3.5, 3);
        ctx.lineTo(-3.5, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      if (ent.health < ent.maxHealth) {
        ctx.save();
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
        ctx.restore();
      }
    } else if (ent.type === 5) {
      ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(139, 92, 246, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (ent.type === 6) {
      ctx.save();
      ctx.rotate(Date.now() / 1000);
      const itemKey = String(ent.subtype);
      const itemInfo = (localizationData.items as any)[itemKey];
      const color = itemInfo ? itemInfo.color : "#10b981";
      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-ent.radius, -ent.radius, ent.radius * 2, ent.radius * 2, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-ent.radius + 2, -ent.radius + 2);
      ctx.lineTo(ent.radius - 2, -ent.radius + 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawAndUpdateParticles(ctx, px, py, canvasWidth, canvasHeight);
  ctx.restore();

  const grad = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    0,
    canvasWidth / 2,
    canvasHeight / 2,
    Math.max(canvasWidth, canvasHeight) * 0.8
  );
  grad.addColorStop(0, "rgba(5, 5, 8, 0)");
  grad.addColorStop(1, "rgba(5, 5, 8, 0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const uiScale = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  drawHUD(ctx, canvasWidth, canvasHeight, uiScale);
  drawUpgradePanel(ctx, uiScale);



  if (state.upgradePoints > 0) {
    drawUpgradeCardsOverlay(ctx, canvasWidth, canvasHeight, uiScale);
  }

  if (state.isGamePaused && state.upgradePoints === 0) {
    drawPauseUI(ctx, canvasWidth, canvasHeight, uiScale);
  }
}
