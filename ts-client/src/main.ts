import { state } from "./state";
import { setupInputListeners } from "./input";
import { renderMenu, renderGame, renderGameOver } from "./graphics";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let dpr = window.devicePixelRatio || 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
window.addEventListener("resize", resize);
resize();

setupInputListeners(canvas);

function render() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.save();
  ctx.scale(dpr, dpr);
  if (state.gameState === "menu") {
    renderMenu(ctx, w, h);
  } else if (state.gameState === "playing") {
    renderGame(ctx, w, h);
  } else if (state.gameState === "gameover") {
    renderGameOver(ctx, w, h);
  }
  ctx.restore();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
