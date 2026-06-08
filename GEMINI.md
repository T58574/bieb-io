# CONTEXT: Necro-Geometry (Sci-Fi Rogue-like Bullet-Hell)
STATUS: Completed. Sci-Fi setting (Bio-Shells, AI Architect), 32 slots, auto-pause, Canvas rendering. Protocol upgraded to 25 slots to support all stats. Refactored code quality: modularized rendering (draw_game.ts split into draw_grid.ts and draw_entities.ts), resolved parameter limits via structs (Circle, Box, WorldStateParams), and decoupled collision/spawn methods. Startup via npm start migrated to native go-server run to bypass missing batch files.

UPGRADES:
1. Wave Reset Logic: Added auto-reset mechanism when all players die and a new session starts. Clears waves, mobs, bullets, fields, loot, spatial grid, and inputs.
2. Standalone EXE Compilation: Implemented WebView2 wrapper via pure Go (github.com/jchv/go-webview2). Supports go:embed packaging for configs/assets, dynamic port allocation (fallback to free random port if 8080 is busy), and server-only mode via `--server`. Fully automated via build_desktop.ps1.
3. Active Skills & Item Variety Upgrade: Added Space key active skills (Dash, Overdrive, Chrono Field slow, Drone Burst, Shield Overload) with HUD visualizers (remaining cooldown, active state outline, radial overlay). Expanded items config with 10 new advanced items (21 to 30) with unique modifiers (Heavy Catalyst, Photon Discharger, Chrono Controller with cooldown reduction, Quantum Splitter, Nano Amplifier, Acid Processor, Warp Crystal, Overcharged Battery, Nanite Repair Drone, Antigravity Core) and integrated them into the drop tables. Added 4 active skill modification upgrade cards: Phase Shift (leaves slow trails), Photon Reactor (bullets pierce), Gravitational Capture (pulls enemies), and Radiation Blast (spawns damage field). Added custom minion subtypes to support Nanite Repair Healer drone logic. Implemented non-stacking unique legendary item effects: Warp Crystal (mouse direction blink on skill active), Aegis (2-sec cheat-death gold shield when HP drops below 30%), and Quantum Core (12-bullet radial burst on skill active).

Tree:
.ai_docs/             # SSOT Specifications
class_system.json  # Tree & modifiers config
network_protocol.yaml # Binary layouts
structures.yaml    # Shared structures
go-server/            # Authoritative Go Server (60 TPS, Spatial hashing, sync.Pool)
main[_test].go     # Handlers, loop orchestration
game/game[_test].go # Physics/world loops
physics/physics[_test].go # Elastic collisions
protocol/protocol[_test].go # Binary pack/unpack
ts-client/            # Vanilla TS Canvas Client (Input bitmasks, Interpolation, Shape cache)
index.html
src/
main.ts         # Input, Canvas render
protocol.ts     # Client binary sync