import { state } from "./state";
import { TextRenderer } from "./text";
import { MENU_LAYOUT } from "./graphics_config";
import { drawMenuShape } from "./draw_helpers";

export function renderMenu(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const uiScale = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  ctx.fillStyle = MENU_LAYOUT.bgColor;
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

  TextRenderer.draw(ctx, "NECRO-GEOMETRY", cx, cy - 220 * uiScale, MENU_LAYOUT.titleColor, { fontSize: 44, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, "[СИНХРОНИЗАЦИЯ КОГНИТИВНОГО ЯДРА // АКТИВНО]", cx, cy - 185 * uiScale, MENU_LAYOUT.subtitleColor, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  const inputW = 320;
  const inputH = 44;
  const inputX = cx - inputW / 2;
  const inputY = cy - 80 * uiScale;

  ctx.fillStyle = MENU_LAYOUT.inputBg;
  ctx.beginPath();
  ctx.roundRect(inputX, inputY, inputW, inputH, 8);
  ctx.fill();
  ctx.strokeStyle = MENU_LAYOUT.inputBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const displayText = state.usernameInput.length > 0 ? `>> ID: ${state.usernameInput}` : ">> ВВЕДИТЕ ИДЕНТИФИКАТОР...";
  const blink = Math.floor(Date.now() / 500) % 2 === 0 && state.usernameInput.length > 0 ? "|" : "";
  TextRenderer.draw(ctx, displayText + blink, cx, inputY + 27, state.usernameInput.length > 0 ? MENU_LAYOUT.inputTextActive : MENU_LAYOUT.inputTextPlaceholder, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  // Draw Class Selection
  const classNames = ["BASE", "RANGER", "TECHNOMAGE", "NECROMANCER", "BIO-TANK"];
  const classW = 80;
  const classH = 40;
  const classGap = 10;
  const totalClassesW = 5 * classW + 4 * classGap;
  const startX = cx - totalClassesW / 2;
  const classY = cy - 10 * uiScale;

  for (let i = 0; i < 5; i++) {
    const clsX = startX + i * (classW + classGap);
    const isSelected = state.selectedClass === i;
    const isHovered = state.mouseX >= clsX && state.mouseX <= clsX + classW && state.mouseY >= classY && state.mouseY <= classY + classH;

    ctx.fillStyle = isSelected ? "rgba(0, 240, 255, 0.3)" : (isHovered ? "rgba(255, 255, 255, 0.1)" : "rgba(10, 30, 43, 0.8)");
    ctx.beginPath();
    ctx.roundRect(clsX, classY, classW, classH, 5);
    ctx.fill();
    ctx.strokeStyle = isSelected ? "#00f0ff" : "rgba(0, 240, 255, 0.4)";
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    TextRenderer.draw(ctx, classNames[i], clsX + classW / 2, classY + 25, isSelected ? "#ffffff" : "#00f0ff", { fontSize: 10, align: "center", bold: true }, canvasWidth, canvasHeight);
  }

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 60 * uiScale;

  const hovered = state.mouseX >= btnX && state.mouseX <= btnX + btnW && state.mouseY >= btnY && state.mouseY <= btnY + btnH;

  ctx.fillStyle = hovered ? MENU_LAYOUT.btnBgHovered : MENU_LAYOUT.btnBgDefault;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? MENU_LAYOUT.btnBorderHovered : MENU_LAYOUT.btnBorderDefault;
  ctx.lineWidth = 2;
  ctx.stroke();

  TextRenderer.draw(ctx, "[ЗАПУСТИТЬ ЯДРО]", cx, btnY + 32, hovered ? MENU_LAYOUT.btnTextHovered : MENU_LAYOUT.btnTextDefault, { fontSize: 15, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, "WASD/ДВИЖЕНИЕ | МЫШЬ/ПРИЦЕЛ | ЛКМ/СТРЕЛЬБА | ПРОБЕЛ/ПРИЗЫВ", cx, canvasHeight - 40 * uiScale, MENU_LAYOUT.footerColor, { fontSize: 11, align: "center", bold: true }, canvasWidth, canvasHeight);
}
