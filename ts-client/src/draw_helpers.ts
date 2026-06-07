export const shapeCache = new Map<string, HTMLCanvasElement>();

export function drawRegularPolygonPath(ctx: CanvasRenderingContext2D, radius: number, sides: number, startAngle: number) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides + startAngle;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
}

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

export function drawMenuShape(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  drawRegularPolygonPath(ctx, radius, sides, -Math.PI / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
