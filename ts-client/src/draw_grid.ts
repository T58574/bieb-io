import { GRID_CONFIG } from "./graphics_config";

export function drawGrid(ctx: CanvasRenderingContext2D, cx: number, cy: number, canvasWidth: number, canvasHeight: number) {
  const startX = Math.floor((cx - canvasWidth / 2) / GRID_CONFIG.size) * GRID_CONFIG.size;
  const endX = cx + canvasWidth / 2;
  const startY = Math.floor((cy - canvasHeight / 2) / GRID_CONFIG.size) * GRID_CONFIG.size;
  const endY = cy + canvasHeight / 2;

  ctx.strokeStyle = GRID_CONFIG.minorColor;
  ctx.lineWidth = GRID_CONFIG.minorWidth;
  for (let x = startX; x < endX; x += GRID_CONFIG.size) {
    if (x % GRID_CONFIG.majorStep === 0) continue;
    ctx.beginPath();
    ctx.moveTo(x - cx + canvasWidth / 2, 0);
    ctx.lineTo(x - cx + canvasWidth / 2, canvasHeight);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += GRID_CONFIG.size) {
    if (y % GRID_CONFIG.majorStep === 0) continue;
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvasHeight / 2);
    ctx.lineTo(canvasWidth, y - cy + canvasHeight / 2);
    ctx.stroke();
  }

  ctx.strokeStyle = GRID_CONFIG.majorColor;
  ctx.lineWidth = GRID_CONFIG.majorWidth;
  for (let x = Math.floor(startX / GRID_CONFIG.majorStep) * GRID_CONFIG.majorStep; x < endX; x += GRID_CONFIG.majorStep) {
    ctx.beginPath();
    ctx.moveTo(x - cx + canvasWidth / 2, 0);
    ctx.lineTo(x - cx + canvasWidth / 2, canvasHeight);
    ctx.stroke();
  }
  for (let y = Math.floor(startY / GRID_CONFIG.majorStep) * GRID_CONFIG.majorStep; y < endY; y += GRID_CONFIG.majorStep) {
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvasHeight / 2);
    ctx.lineTo(canvasWidth, y - cy + canvasHeight / 2);
    ctx.stroke();
  }
}
