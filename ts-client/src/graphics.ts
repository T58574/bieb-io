import { state, renderEntities } from "./state";
import { drawAndUpdateParticles } from "./particles";
import { sendClassUpgrade } from "./network";

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

export function drawStatBar(ctx: CanvasRenderingContext2D, label: string, level: number, x: number, y: number, color: string, hotkey: string) {
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

  if (state.upgradePoints > 0 && level < maxLvl) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("+" + hotkey, x + barW + 6, y + 13);
  }
}

export function drawUpgradeCardsOverlay(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 24px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("ДОСТУПНО ОБНОВЛЕНИЕ ПО", cx, cy - 200);

  const cardW = 200;
  const cardH = 280;
  const gap = 30;
  const startX = cx - 330;
  const startY = cy - 140;

  const cardDetails: Record<number, { title: string; color: string; desc: string; rarity: string }> = {
    1: { title: "ОПТИМИЗАЦИЯ СКОРОСТИ", color: "#10b981", desc: "Увеличение тактовой частоты на +10%", rarity: "Common" },
    2: { title: "СОПРОЦЕССОР", color: "#fbbf24", desc: "Увеличение мощности и +5% вампиризм", rarity: "Rare" },
    3: { title: "СТАБИЛИЗАТОР ЯДРА", color: "#22c55e", desc: "Увеличение стабильности ядра на +25", rarity: "Common" },
    4: { title: "РЕГЕНЕРАЦИЯ", color: "#10b981", desc: "Увеличение регенерации ядра", rarity: "Common" },
    5: { title: "ДРОНЫ: ВЫЧИСЛЕНИЯ", color: "#06b6d4", desc: "Увеличение урона дронов на +15%", rarity: "Common" },
    6: { title: "ДРОНЫ: ЧАСТОТА", color: "#8b5cf6", desc: "Увеличение скорости дронов на +15%", rarity: "Common" },
    7: { title: "ДРОНЫ: СТАБИЛЬНОСТЬ", color: "#3b82f6", desc: "Увеличение макс. ХП дронов на +15%", rarity: "Common" },
    8: { title: "ДРОНЫ: ПРОБИТИЕ", color: "#ef4444", desc: "Дроны пробивают на +1 цель больше", rarity: "Common" },
    9: { title: "ДРОНЫ: РЕГЕНЕРАЦИЯ", color: "#a3e635", desc: "Увеличение регенерации дронов на +15%", rarity: "Common" },
    10: { title: "МИКРО-ЩИТЫ", color: "#00f0ff", desc: "Запуск защитного орбитального щита (макс 4)", rarity: "Rare" },
    11: { title: "ЯДРО НЕКРОЗА", color: "#d946ef", desc: "Все ваши снаряды взрывают убитые вирусы", rarity: "Unique" }
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
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(details.rarity.toUpperCase(), x + cardW / 2, y + 30);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    const titleWords = details.title.split(" ");
    let titleY = y + 70;
    for (const w of titleWords) {
      ctx.fillText(w, x + cardW / 2, titleY);
      titleY += 16;
    }

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px 'JetBrains Mono', monospace";
    const descWords = details.desc.split(" ");
    let descLine = "";
    let descY = y + 170;
    for (let n = 0; n < descWords.length; n++) {
      const testLine = descLine + descWords[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardW - 24 && n > 0) {
        ctx.fillText(descLine, x + cardW / 2, descY);
        descLine = descWords[n] + " ";
        descY += 14;
      } else {
        descLine = testLine;
      }
    }
    ctx.fillText(descLine, x + cardW / 2, descY);

    ctx.fillStyle = hovered ? "#00f0ff" : "#64748b";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText(`[НАЖМИТЕ ${i + 1}]`, x + cardW / 2, y + cardH - 25);
  }
}

export function drawUpgradePanel(ctx: CanvasRenderingContext2D) {
  if (state.upgradePoints > 0) {
    return;
  }
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

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText("МЕТРИКИ ЯДРА СИСТЕМЫ", panelX, panelY - 14);

  const barX = panelX + labelW;

  drawStatBar(ctx, "РЕГЕН. ЯДРА", state.statRegen, barX, panelY, "#10b981", "1");
  drawStatBar(ctx, "СТАБИЛЬНОСТЬ", state.statMaxHP, barX, panelY + rowH, "#22c55e", "2");
  drawStatBar(ctx, "ЧАСТОТА", state.statSpeed, barX, panelY + 2 * rowH, "#3b82f6", "3");
  drawStatBar(ctx, "УРОН ДРОНОВ", state.statMinionDmg, barX, panelY + 3 * rowH, "#ef4444", "4");
  drawStatBar(ctx, "СКОР. ДРОНОВ", state.statMinionSpeed, barX, panelY + 4 * rowH, "#f97316", "5");
  drawStatBar(ctx, "ХП ДРОНОВ", state.statMinionHP, barX, panelY + 5 * rowH, "#06b6d4", "6");
  drawStatBar(ctx, "ПРОБИВ. ДР.", state.statMinionPierce, barX, panelY + 6 * rowH, "#8b5cf6", "7");
  drawStatBar(ctx, "РЕГЕН. ДР.", state.statMinionRegen, barX, panelY + 7 * rowH, "#a3e635", "8");
}

export function drawInventoryHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const startY = 120;
  const slotW = 44;
  const slotH = 44;
  const gap = 6;
  const rightX = canvasWidth - 210;

  const itemDetails: Record<number, { name: string; color: string; desc: string; abbrev: string }> = {
    1: { name: "КОНДЕНСАТОР", color: "#10b981", desc: "+10% Частота", abbrev: "Opt\nCap" },
    2: { name: "СОПРОЦЕССОР", color: "#fbbf24", desc: "+15% Вычисления\n+5% Вамп", abbrev: "Over\nProc" },
    3: { name: "ЯДРО НЕКРОЗА", color: "#d946ef", desc: "Взрывы на\nубийстве", abbrev: "Necr\nCore" }
  };

  ctx.fillStyle = "rgba(5, 5, 8, 0.65)";
  ctx.beginPath();
  ctx.roundRect(rightX - 10, startY - 30, 214, 439, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("МОДУЛИ", rightX + 97, startY - 10);

  for (let i = 0; i < 32; i++) {
    const itemID = state.inventory[i] || 0;
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = rightX + c * (slotW + gap);
    const y = startY + r * (slotH + gap);

    const hovered = state.mouseX >= x && state.mouseX <= x + slotW && state.mouseY >= y && state.mouseY <= y + slotH;

    ctx.fillStyle = hovered ? "rgba(30, 41, 59, 0.75)" : "rgba(10, 15, 26, 0.75)";
    ctx.strokeStyle = itemID !== 0 ? (itemDetails[itemID]?.color || "rgba(255, 255, 255, 0.15)") : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = itemID !== 0 && hovered ? 2.5 : 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 6);
    ctx.fill();
    ctx.stroke();

    if (itemID !== 0) {
      const details = itemDetails[itemID];
      if (details) {
        ctx.fillStyle = details.color;
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        const lines = details.abbrev.split("\n");
        ctx.fillText(lines[0], x + slotW / 2, y + 18);
        ctx.fillText(lines[1], x + slotW / 2, y + 28);

        if (hovered) {
          ctx.save();
          ctx.fillStyle = "rgba(5, 5, 8, 0.95)";
          ctx.strokeStyle = details.color;
          ctx.lineWidth = 1.5;
          const popW = 180;
          const popH = 80;
          const popX = rightX - popW - 15;
          const popY = y - 5;
          ctx.beginPath();
          ctx.roundRect(popX, popY, popW, popH, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px 'JetBrains Mono', monospace";
          ctx.textAlign = "left";
          ctx.fillText(details.name, popX + 10, popY + 18);

          ctx.fillStyle = "#94a3b8";
          ctx.font = "9px 'JetBrains Mono', monospace";
          const descLines = details.desc.split("\n");
          ctx.fillText(descLines[0], popX + 10, popY + 34);
          if (descLines[1]) {
            ctx.fillText(descLines[1], popX + 10, popY + 46);
          }

          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.fillText("[НАЖМИТЕ X ДЛЯ УДАЛЕНИЯ]", popX + 10, popY + popH - 12);
          ctx.restore();
        }
      }
    } else {
      ctx.fillStyle = "#334155";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("-", x + slotW / 2, y + 26);
    }
  }
}

export function drawHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const barWidth = 350;
  const barHeight = 16;
  const centerX = canvasWidth / 2;
  const bottomY = canvasHeight - 30;

  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY - 24, barWidth, barHeight, 6);
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
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`ПРОШИВКА ЯДРА: v${state.currentLevel}`, centerX, bottomY - 28);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`ПАКЕТОВ ДАННЫХ: ${state.currentScore}`, 20, canvasHeight - 25);

  let activeMinions = 0;
  for (const ent of renderEntities.values()) {
    if (ent.type === 4) activeMinions++;
  }
  ctx.textAlign = "right";
  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.fillText(`АКТИВНЫЕ ДРОНЫ: ${activeMinions}`, canvasWidth - 20, 35);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`СЕКТОР ЧИПА: ${state.waveNumber}`, centerX, bottomY - 54);

  drawInventoryHUD(ctx, canvasWidth, canvasHeight);
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
  ctx.moveTo(cx - 250, cy - 160);
  ctx.lineTo(cx + 250, cy - 160);
  ctx.stroke();

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 44px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("NECRO-GEOMETRY", cx, cy - 120);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("[СИНХРОНИЗАЦИЯ КОГНИТИВНОГО ЯДРА // АКТИВНО]", cx, cy - 85);

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

  ctx.fillStyle = state.usernameInput.length > 0 ? "#ffffff" : "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  const displayText = state.usernameInput.length > 0 ? `>> ID: ${state.usernameInput}` : ">> ВВЕДИТЕ ИДЕНТИФИКАТОР...";
  const blink = Math.floor(Date.now() / 500) % 2 === 0 && state.usernameInput.length > 0 ? "|" : "";
  ctx.fillText(displayText + blink, cx, inputY + 27);

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 80;

  const hovered = state.mouseX >= btnX && state.mouseX <= btnX + btnW && state.mouseY >= btnY && state.mouseY <= btnY + btnH;

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
  ctx.fillText("[ЗАПУСТИТЬ ЯДРО]", cx, btnY + 32);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("WASD/ДВИЖЕНИЕ | МЫШЬ/ПРИЦЕЛ | ЛКМ/СТРЕЛЬБА | ПРОБЕЛ/ПРИЗЫВ", cx, canvasHeight - 40);
}

export function renderGameOver(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  ctx.fillStyle = "rgba(5, 5, 8, 0.95)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  ctx.fillStyle = "#ff2a5f";
  ctx.font = "bold 40px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("КРИТИЧЕСКИЙ СБОЙ ЯДРА", cx, cy - 100);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
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
  ctx.font = "bold 15px 'JetBrains Mono', monospace";
  ctx.fillText("[ПЕРЕЗАПУСК ЯДРА]", cx, btnY + 32);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("Нажмите ENTER для перезапуска ядра", cx, canvasHeight - 40);
}

export function drawClassSelectionUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  ctx.fillStyle = "rgba(5, 5, 8, 0.85)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("ВЫБЕРИТЕ СПЕЦИФИКАЦИЮ АРХИТЕКТУРЫ", cx, cy - 180);

  const cardW = 200;
  const cardH = 260;
  const gap = 24;
  const startX = cx - 312;
  const startY = cy - 120;

  const classes = [
    { name: "РЕЙНДЖЕР", color: "#00f0ff", desc: "Направленный Лазерный Импульс линейный высокий DPS. Пассивка: Разгон Кэша - взрыв на каждый 3-й хит.", shape: 6 },
    { name: "ТЕХНОМАГ", color: "#fbbf24", desc: "Плазменный Сгусток АоЕ сфера насквозь. Пассивка: Цепной Разряд - молния на критический хит.", shape: 5 },
    { name: "НЕКРОМАНТ", color: "#a855f7", desc: "Энергетический Хлыст маркирует цель. Пассивка: Протокол Реанимации - перепрошивка вирусов в дроны.", shape: 8 }
  ];

  for (let i = 0; i < 3; i++) {
    const cls = classes[i];
    const x = startX + i * (cardW + gap);
    const y = startY;

    const hovered = state.mouseX >= x && state.mouseX <= x + cardW && state.mouseY >= y && state.mouseY <= y + cardH;

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
    ctx.font = "10px 'JetBrains Mono', monospace";

    const words = cls.desc.split(" ");
    let line = "";
    let lineY = y + 165;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardW - 24 && n > 0) {
        ctx.fillText(line, x + cardW / 2, lineY);
        line = words[n] + " ";
        lineY += 15;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x + cardW / 2, lineY);
  }
}

export function drawPauseUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  ctx.fillStyle = "rgba(5, 5, 8, 0.65)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 28px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("СИСТЕМА НА ПАУЗЕ", cx, cy - 20);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("[НАЖМИТЕ ESC ДЛЯ ПРОДОЛЖЕНИЯ]", cx, cy + 20);
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

      ctx.fillStyle = "#0088cc";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3;

      if (ent.subtype === 1) {
        const cacheKey = `p_ranger_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#0a1e2b";
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
        const cacheKey = `p_technomage_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#1e1e0a";
          c.strokeStyle = "#fbbf24";
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
        const cacheKey = `p_necromancer_${ent.radius}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = "#1e0a2b";
          c.strokeStyle = "#a855f7";
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
          c.fillStyle = "#0a1e2b";
          c.strokeStyle = "#00f0ff";
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
      const floatY = Math.sin(Date.now() / 300) * 4;
      ctx.translate(0, floatY);
      ctx.rotate(Date.now() / 1000);
      let color = "#10b981";
      if (ent.subtype === 2) {
        color = "#fbbf24";
      } else if (ent.subtype === 3) {
        color = "#d946ef";
      }
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

  drawHUD(ctx, canvasWidth, canvasHeight);
  drawUpgradePanel(ctx);

  if (state.playerId !== null) {
    const me = renderEntities.get(state.playerId);
    if (me && me.subtype === 0 && state.currentLevel >= 10) {
      drawClassSelectionUI(ctx, canvasWidth, canvasHeight);
    }
  }

  if (state.upgradePoints > 0) {
    drawUpgradeCardsOverlay(ctx, canvasWidth, canvasHeight);
  }

  if (state.isGamePaused && state.upgradePoints === 0) {
    drawPauseUI(ctx, canvasWidth, canvasHeight);
  }
}
