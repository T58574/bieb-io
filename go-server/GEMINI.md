# CONTEXT: Go Server
STATUS: Authoritative Server Engine (60 TPS, Spatial Hashing)

## DIRECTORY MAP
/go-server
├─ main.go                 # Entry point, WS HTTP handler, main tick loop orchestration
├─ game/                   # Core Logic & World State
│  ├─ game.go              # World struct, spatial grid hashing (20x20), main state sync
│  ├─ player.go            # Player states, movement, classes, inventory, abilities
│  ├─ mob.go               # Enemy AI behavior, spawning, wave progression, loot drops
│  ├─ collision.go         # Spatial hash collision detection & combat resolution
│  ├─ items_config.go      # Data-driven item modifier registry & stats
│  ├─ bullet.go            # Projectile movement and lifetime
│  ├─ minion.go            # Mage class drones behavior
│  ├─ orb.go               # Experience orbs logic
│  └─ wave.go              # Wave manager config
├─ physics/                # Custom 2D Vector Engine
│  └─ physics.go           # Basic vector math, elastic collisions, AABB
└─ protocol/               # Network Serialization
   └─ protocol.go          # Custom binary pack/unpack logic for client sync

## RESPONSIBILITIES
- **Server Authority:** All physics, inputs, and damage are resolved here. The client just renders.
- **Performance:** Relies on `sync.Pool` for high-churn structs (bullets, orbs, mobs) and a spatial hash grid for fast nearest-neighbor checks.

## LATEST CRITICAL CHANGES
- **Item System Integration:** Unified `items_config.go` registry dynamically applies modifiers. Player inventory syncs as a fixed `[32]uint8` byte slice via `GetInventoryArray()`.
- **Spatial Grid:** 20x20 cell grid where 1 cell = 100x100 game units, vastly improving collision checks.