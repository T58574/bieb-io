import { state } from "./state";
import { setupInputListeners } from "./input";
import { renderMenu, renderGame, renderGameOver } from "./graphics";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

setupInputListeners(canvas);

function render() {
  if (state.gameState === "menu") {
    renderMenu(ctx, canvas.width, canvas.height);
  } else if (state.gameState === "playing") {
    renderGame(ctx, canvas.width, canvas.height);
  } else if (state.gameState === "gameover") {
    renderGameOver(ctx, canvas.width, canvas.height);
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
