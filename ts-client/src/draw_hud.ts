import { state, renderEntities } from "./state";
import { TextRenderer } from "./text";
import localizationData from "./items_localization.json";
import { UPGRADE_DETAILS, UPGRADE_STATE_KEYS } from "./upgrades_config";
import {
  CARD_LAYOUT,
  UPGRADE_PANEL_LAYOUT,
  INVENTORY_HUD_LAYOUT,
  ITEM_RARITY_BORDER_COLORS,
  HUD_LAYOUT,
  PAUSE_LAYOUT
} from "./graphics_config";

export function drawUpgradeCardsOverlay(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  ctx.fillStyle = CARD_LAYOUT.overlayBg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  TextRenderer.draw(ctx, "ДОСТУПНО ОБНОВЛЕНИЕ ПО", cx, cy - 200 * uiScale, CARD_LAYOUT.titleColor, { fontSize: 24, align: "center", bold: true }, canvasWidth, canvasHeight);

  const cardW = CARD_LAYOUT.cardWidth * uiScale;
  const cardH = CARD_LAYOUT.cardHeight * uiScale;
  const gap = CARD_LAYOUT.gap * uiScale;
  const startX = cx + CARD_LAYOUT.startXOffset * uiScale;
  const startY = cy + CARD_LAYOUT.startYOffset * uiScale;

  const cards = [state.card1, state.card2, state.card3];

  for (let i = 0; i < 3; i++) {
    const cardId = cards[i];
    const details = UPGRADE_DETAILS[cardId] || { title: "UNKNOWN", color: "#64748b", desc: "Unknown mod", rarity: "Common", abbrev: "???" };
    const x = startX + i * (cardW + gap);
    const y = startY;

    const hovered = state.mouseX >= x && state.mouseX <= x + cardW && state.mouseY >= y && state.mouseY <= y + cardH;

    ctx.fillStyle = hovered ? CARD_LAYOUT.bgHovered : CARD_LAYOUT.bgDefault;
    ctx.strokeStyle = hovered ? details.color : CARD_LAYOUT.borderDefault;
    ctx.lineWidth = hovered ? 3 : 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    TextRenderer.draw(ctx, details.rarity.toUpperCase(), x + cardW / 2, y + 30 * uiScale, details.color, { fontSize: 10, align: "center", bold: true }, canvasWidth, canvasHeight);

    const titleWords = details.title.split(" ");
    let titleY = y + 70 * uiScale;
    for (const w of titleWords) {
      TextRenderer.draw(ctx, w, x + cardW / 2, titleY, "#ffffff", { fontSize: 12, align: "center", bold: true }, canvasWidth, canvasHeight);
      titleY += 16 * uiScale;
    }

    const descWords = details.desc.split(" ");
    let descLine = "";
    let descY = y + 170 * uiScale;
    ctx.font = `${Math.max(6, 10 * uiScale)}px 'JetBrains Mono', monospace`;
    for (let n = 0; n < descWords.length; n++) {
      const testLine = descLine + descWords[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardW - 24 * uiScale && n > 0) {
        TextRenderer.draw(ctx, descLine, x + cardW / 2, descY, CARD_LAYOUT.textMuted, { fontSize: 10, align: "center" }, canvasWidth, canvasHeight);
        descLine = descWords[n] + " ";
        descY += 14 * uiScale;
      } else {
        descLine = testLine;
      }
    }
    TextRenderer.draw(ctx, descLine, x + cardW / 2, descY, CARD_LAYOUT.textMuted, { fontSize: 10, align: "center" }, canvasWidth, canvasHeight);

    TextRenderer.draw(ctx, `[НАЖМИТЕ ${i + 1}]`, x + cardW / 2, y + cardH - 25 * uiScale, hovered ? CARD_LAYOUT.interactiveColor : CARD_LAYOUT.nonInteractiveColor, { fontSize: 11, align: "center", bold: true }, canvasWidth, canvasHeight);
  }
}

export function drawUpgradePanel(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  interface UpgradeDetail {
    id: string;
    name: string;
    count: number;
    color: string;
    abbrev: string;
    desc: string;
  }

  const activeUpgrades: UpgradeDetail[] = [];

  for (const [idStr, stateKey] of Object.entries(UPGRADE_STATE_KEYS)) {
    const id = Number(idStr);
    const details = UPGRADE_DETAILS[id];
    if (details) {
      const count = state[stateKey] as number;
      activeUpgrades.push({
        id: String(id),
        name: details.title,
        count: count,
        color: details.color,
        abbrev: details.abbrev,
        desc: details.desc
      });
    }
  }

  if (activeUpgrades.length === 0) {
    return;
  }

  const startY = UPGRADE_PANEL_LAYOUT.startY * uiScale;
  const slotW = UPGRADE_PANEL_LAYOUT.slotWidth * uiScale;
  const slotH = UPGRADE_PANEL_LAYOUT.slotHeight * uiScale;
  const gap = UPGRADE_PANEL_LAYOUT.gap * uiScale;
  const leftX = UPGRADE_PANEL_LAYOUT.leftX * uiScale;

  const rows = Math.max(1, Math.ceil(activeUpgrades.length / 4));
  const height = rows * (slotH + gap) + 50 * uiScale;

  ctx.fillStyle = UPGRADE_PANEL_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(leftX - 10 * uiScale, startY - 30 * uiScale, UPGRADE_PANEL_LAYOUT.width * uiScale, height, 10 * uiScale);
  ctx.fill();
  ctx.strokeStyle = UPGRADE_PANEL_LAYOUT.border;
  ctx.lineWidth = 1.5 * uiScale;
  ctx.stroke();

  TextRenderer.draw(ctx, "УСИЛЕНИЯ ПЕРСОНАЖА", leftX + 97 * uiScale, startY - 10 * uiScale, UPGRADE_PANEL_LAYOUT.titleColor, { fontSize: 10, align: "center", bold: true }, canvasWidth, canvasHeight);

  for (let i = 0; i < activeUpgrades.length; i++) {
    const upg = activeUpgrades[i];
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = leftX + c * (slotW + gap);
    const y = startY + r * (slotH + gap);

    const hovered = state.mouseX >= x && state.mouseX <= x + slotW && state.mouseY >= y && state.mouseY <= y + slotH;

    ctx.fillStyle = hovered ? UPGRADE_PANEL_LAYOUT.slotBgHovered : UPGRADE_PANEL_LAYOUT.slotBgDefault;
    ctx.strokeStyle = upg.color;
    ctx.lineWidth = hovered ? 2.5 * uiScale : 1.5 * uiScale;

    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 6 * uiScale);
    ctx.fill();
    ctx.stroke();

    const lines = upg.abbrev.split("\n");
    TextRenderer.draw(ctx, lines[0], x + slotW / 2, y + 18 * uiScale, upg.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
    if (lines[1]) {
      TextRenderer.draw(ctx, lines[1], x + slotW / 2, y + 28 * uiScale, upg.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
    }

    TextRenderer.draw(ctx, `v${upg.count}`, x + slotW - 4 * uiScale, y + slotH - 4 * uiScale, upg.count > 0 ? UPGRADE_PANEL_LAYOUT.textWhite : UPGRADE_PANEL_LAYOUT.textMuted, { fontSize: 11, align: "right", bold: true }, canvasWidth, canvasHeight);

    if (hovered) {
      ctx.save();
      ctx.fillStyle = UPGRADE_PANEL_LAYOUT.tooltipBg;
      ctx.strokeStyle = upg.color;
      ctx.lineWidth = 1.5 * uiScale;
      const popW = 180 * uiScale;
      const popH = 64 * uiScale;
      const popX = leftX + UPGRADE_PANEL_LAYOUT.width * uiScale + 10 * uiScale;
      const popY = y - 5 * uiScale;
      ctx.beginPath();
      ctx.roundRect(popX, popY, popW, popH, 8 * uiScale);
      ctx.fill();
      ctx.stroke();

      TextRenderer.draw(ctx, upg.name, popX + 10 * uiScale, popY + 18 * uiScale, UPGRADE_PANEL_LAYOUT.textWhite, { fontSize: 11, align: "left", bold: true }, canvasWidth, canvasHeight);

      const descLines = upg.desc.split("\n");
      TextRenderer.draw(ctx, descLines[0], popX + 10 * uiScale, popY + 34 * uiScale, UPGRADE_PANEL_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
      if (descLines[1]) {
        TextRenderer.draw(ctx, descLines[1], popX + 10 * uiScale, popY + 46 * uiScale, UPGRADE_PANEL_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
      }
      ctx.restore();
    }
  }
}

export function drawInventoryHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  const startY = INVENTORY_HUD_LAYOUT.startY * uiScale;
  const slotW = INVENTORY_HUD_LAYOUT.slotWidth * uiScale;
  const slotH = INVENTORY_HUD_LAYOUT.slotHeight * uiScale;
  const gap = INVENTORY_HUD_LAYOUT.gap * uiScale;
  const rightX = canvasWidth + INVENTORY_HUD_LAYOUT.rightXOffset * uiScale;

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

  ctx.fillStyle = INVENTORY_HUD_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(rightX - 10 * uiScale, startY - 30 * uiScale, 214 * uiScale, height, 10 * uiScale);
  ctx.fill();
  ctx.strokeStyle = INVENTORY_HUD_LAYOUT.border;
  ctx.lineWidth = 1.5 * uiScale;
  ctx.stroke();

  TextRenderer.draw(ctx, localizationData.ui.module_title, rightX + 97 * uiScale, startY - 10 * uiScale, INVENTORY_HUD_LAYOUT.titleColor, { fontSize: 10, align: "center", bold: true }, canvasWidth, canvasHeight);

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
      borderColor = ITEM_RARITY_BORDER_COLORS[details.rarity] || borderColor;
    }

    ctx.fillStyle = hovered ? INVENTORY_HUD_LAYOUT.slotBgHovered : INVENTORY_HUD_LAYOUT.slotBgDefault;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = hovered ? 2.5 * uiScale : 1.5 * uiScale;

    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 6 * uiScale);
    ctx.fill();
    ctx.stroke();

    if (details) {
      const lines = details.abbrev.split("\n");
      TextRenderer.draw(ctx, lines[0], x + slotW / 2, y + 18 * uiScale, details.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
      if (lines[1]) {
        TextRenderer.draw(ctx, lines[1], x + slotW / 2, y + 28 * uiScale, details.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
      }

      if (count > 1) {
        TextRenderer.draw(ctx, `x${count}`, x + slotW - 4 * uiScale, y + slotH - 4 * uiScale, INVENTORY_HUD_LAYOUT.textWhite, { fontSize: 11, align: "right", bold: true }, canvasWidth, canvasHeight);
      }

      if (hovered) {
        ctx.save();
        ctx.fillStyle = INVENTORY_HUD_LAYOUT.tooltipBg;
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

        TextRenderer.draw(ctx, details.name, popX + 10 * uiScale, popY + 18 * uiScale, INVENTORY_HUD_LAYOUT.textWhite, { fontSize: 11, align: "left", bold: true }, canvasWidth, canvasHeight);

        const descLines = details.desc.split("\n");
        TextRenderer.draw(ctx, descLines[0], popX + 10 * uiScale, popY + 34 * uiScale, INVENTORY_HUD_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
        if (descLines[1]) {
          TextRenderer.draw(ctx, descLines[1], popX + 10 * uiScale, popY + 46 * uiScale, INVENTORY_HUD_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
        }

        TextRenderer.draw(ctx, "[НАЖМИТЕ X ДЛЯ УДАЛЕНИЯ]", popX + 10 * uiScale, popY + popH - 12 * uiScale, INVENTORY_HUD_LAYOUT.deleteTextColors, { fontSize: 9, align: "left", bold: true }, canvasWidth, canvasHeight);
        ctx.restore();
      }
    }
  }
}

export function drawHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  const barWidth = HUD_LAYOUT.barWidth * uiScale;
  const barHeight = HUD_LAYOUT.barHeight * uiScale;
  const centerX = canvasWidth / 2;
  const bottomY = canvasHeight + HUD_LAYOUT.bottomYOffset * uiScale;

  ctx.fillStyle = HUD_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY - 24 * uiScale, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = HUD_LAYOUT.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const hpPct = Math.min(1.0, state.playerHealth / Math.max(1, state.playerMaxHealth));
  if (hpPct > 0) {
    const hpGrad = ctx.createLinearGradient(centerX - barWidth / 2, 0, centerX + barWidth / 2, 0);
    hpGrad.addColorStop(0, HUD_LAYOUT.hpGradColors[0]);
    hpGrad.addColorStop(1, HUD_LAYOUT.hpGradColors[1]);
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, bottomY - 24 * uiScale, barWidth * hpPct, barHeight, 6);
    ctx.fill();
  }

  ctx.fillStyle = HUD_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = HUD_LAYOUT.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const xpPct = Math.min(1.0, state.currentXP / Math.max(1, state.maxXP));
  if (xpPct > 0) {
    const xpGrad = ctx.createLinearGradient(centerX - barWidth / 2, 0, centerX + barWidth / 2, 0);
    xpGrad.addColorStop(0, HUD_LAYOUT.xpGradColors[0]);
    xpGrad.addColorStop(1, HUD_LAYOUT.xpGradColors[1]);
    ctx.fillStyle = xpGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, bottomY, barWidth * xpPct, barHeight, 6);
    ctx.fill();
  }

  TextRenderer.draw(ctx, `ПРОШИВКА ЯДРА: v${state.currentLevel}`, centerX, bottomY - 28 * uiScale, HUD_LAYOUT.textWhite, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, `ПАКЕТОВ ДАННЫХ: ${state.currentScore}`, 20 * uiScale, canvasHeight - 25 * uiScale, HUD_LAYOUT.textMuted, { fontSize: 16, align: "left", bold: true }, canvasWidth, canvasHeight);

  let activeMinions = 0;
  for (const ent of renderEntities.values()) {
    if (ent.type === 4) activeMinions++;
  }
  TextRenderer.draw(ctx, `АКТИВНЫЕ ДРОНЫ: ${activeMinions}`, canvasWidth - 20 * uiScale, 35 * uiScale, HUD_LAYOUT.textMuted, { fontSize: 16, align: "right", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, `${localizationData.ui.sector_prefix}${state.waveNumber}`, centerX, bottomY - 54 * uiScale, HUD_LAYOUT.textMuted2, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  drawInventoryHUD(ctx, canvasWidth, canvasHeight, uiScale);
}

export function drawPauseUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  ctx.fillStyle = PAUSE_LAYOUT.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  TextRenderer.draw(ctx, "СИСТЕМА НА ПАУЗЕ", cx, cy - 20 * uiScale, PAUSE_LAYOUT.titleColor, { fontSize: 28, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, "[НАЖМИТЕ ESC ДЛЯ ПРОДОЛЖЕНИЯ]", cx, cy + 20 * uiScale, PAUSE_LAYOUT.subtitleColor, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);
}
