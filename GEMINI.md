# CONTEXT: Necro-Geometry (Sci-Fi Rogue-like Bullet-Hell)
STATUS: Completed. Sci-Fi setting (Bio-Shells, AI Architect), 32 slots, auto-pause, Canvas rendering. Protocol upgraded to 25 slots to support all stats. Refactored code quality: modularized rendering (draw_game.ts split into draw_grid.ts and draw_entities.ts), resolved parameter limits via structs (Circle, Box, WorldStateParams), and decoupled collision/spawn methods. Startup via npm start migrated to native go-server run to bypass missing batch files.

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