# CONTEXT: TS Client
STATUS: Vanilla HTML5 Canvas Renderer

## DIRECTORY MAP
/ts-client
├─ index.html              # HTML shell & UI Overlays (menus, HUD DOM elements)
├─ package.json            # Vite build scripts & dependencies
└─ src/
   ├─ main.ts              # Entry point, boots logic, hooks DOM overlay listeners
   ├─ graphics.ts          # Canvas rendering loop, camera lerping, shape caching, HUD drawing
   ├─ input.ts             # Keyboard/Mouse listeners, bitmask packager for server
   ├─ network.ts           # WebSocket connection manager, payload dispatching
   ├─ protocol.ts          # Binary payload unpacking (matches Go Server structs)
   ├─ state.ts             # Client-side mirror of game state for rendering
   └─ particles.ts         # Client-side only visual particle effects

## RESPONSIBILITIES
- **Dumb Renderer:** The client does NOT simulate physics or collisions. It only interpolates positions from the server.
- **Input Sync:** Packages player keys/mouse angles into a fixed byte format and streams them to the server.
- **UI Scaling:** All drawing operations use a global scaling factor to adapt to any window resolution relative to a 1920x1080 baseline.

## LATEST CRITICAL CHANGES
- **Binary Protocols:** Fully synced with Go backend fixed-size arrays (e.g. 32-element inventory array).
- **Interpolation & Caching:** Shapes are pre-rendered to offscreen canvases in `graphics.ts` to reduce `fill()` calls.
- **Localization Prep:** Item dictionaries and HUD elements are isolated to scale dynamically based on the Canvas size.