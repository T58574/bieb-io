import { state } from "./state";

export interface Particle {
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

export const particles: Particle[] = [];

export function spawnDeathExplosion(x: number, y: number, radius: number) {
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

export function drawAndUpdateParticles(ctx: CanvasRenderingContext2D, px: number, py: number, canvasWidth: number, canvasHeight: number) {
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
    const rx = p.x - px + canvasWidth / 2;
    const ry = p.y - py + canvasHeight / 2;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(rx, ry, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
