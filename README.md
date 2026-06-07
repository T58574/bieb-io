# Necro-Geometry

Necro-Geometry is a high-performance multiplayer 2D rogue-like bullet-hell game using an authoritative Go server and a vanilla TypeScript HTML5 Canvas client.

## Features

- [Strict Server Authority]: All physics, collisions, AI, and game state calculations run on the server.
- [Custom Binary Protocol]: Fixed-size packet headers with optimized binary serialization for high-frequency networking.
- [Fantasy Class System]: Players choose from four unique geometric classes:
  - (Warrior) [Hexagon]: High mass, dash ability, deals collision damage based on kinetic energy.
  - (Archer) [Triangle]: High range, charge-shot ability scaling bullet damage, speed, and pierce.
  - (Rogue) [Diamond]: Invisibility ability for stealth frames.
  - (Mage) [Octagon]: Drone control, summons orbiting and auto-shooting minions on mob kill.
- [Rogue-like Wave Manager]: Progressive waves of chasers, shooters, kamikazes, and swarms.
- [Optimizations]:
  - Spatial Hashing grid collision detection (efficiently supports 5000+ entities).
  - Object pooling via (sync.Pool) for bullets, mobs, and experience orbs.
  - Shape caching on the client canvas to avoid redundant rendering paths.
  - Client-side linear interpolation for rendering.

## Directory Structure

```
/ (project root)
├── GEMINI.md                  # Global AI context index
├── README.md                  # Project overview
├── package.json               # Orchestration scripts
├── run.bat                    # Start client & server
├── start-server.bat           # Run Go server
├── tasks.md                   # Project checklist
├── .ai_docs/                  # AI specifications
│   ├── class_system.json      # Class hierarchy config
│   ├── network_protocol.yaml  # Binary network contract
│   └── structures.yaml        # Server/client data structure schemas
├── go-server/                 # Authoritative Go server
│   ├── game/                  # Core game logic and world management
│   ├── physics/               # Custom 2D vector physics engine
│   ├── protocol/              # Binary protocol encoders/decoders
│   └── main.go                # WS server & game tick loop (60 TPS)
└── ts-client/                 # Vanilla TS Canvas client
    ├── src/
    │   ├── main.ts            # Input handlers, interpolation, canvas render
    │   └── protocol.ts        # Client binary serialization helpers
    └── index.html             # Client entry web page
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   npm run dev --prefix ts-client
   ```
2. Build and run the server:
   ```bash
   cd go-server
   go build -o go-server.exe main.go
   cd ..
   ```
3. Run the orchestration script:
   ```bash
   npm start
   ```

## Development & Testing

Run Go server unit tests:
```bash
cd go-server
go test -v ./...
```

Run client unit tests:
```bash
cd ts-client
npm run test
```

## Configuring and Adding Custom Items

To add or modify active Nano-Modules:

### 1. Server-Side Behavior & Drops
- **Drops Configuration**: In [mob.go](file:///c:/Users/user/Documents/projects/freeproject_4/go-server/game/mob.go), locate the `dropLoot` function. Here you configure the drop probability and specify which `ItemID` gets spawned on the ground.
- **Speed Multiplier**: In [player.go](file:///c:/Users/user/Documents/projects/freeproject_4/go-server/game/player.go), search for `speedMul` calculation. Add item ID conditions to grant custom movement speed buffs.
- **Damage Multiplier**: In [player.go](file:///c:/Users/user/Documents/projects/freeproject_4/go-server/game/player.go), search for `dmgMul` calculation. Add item ID conditions to grant custom projectile damage buffs.
- **On-Kill Passives**: In [collision.go](file:///c:/Users/user/Documents/projects/freeproject_4/go-server/game/collision.go), inside the combat resolution loops (e.g. mob death), add handlers for items like `Necrose Core` (ID 3) that trigger area-of-effect explosions.

### 2. Client-Side HUD & Tooltips
- **Module Names & Details**: In [graphics.ts](file:///c:/Users/user/Documents/projects/freeproject_4/ts-client/src/graphics.ts), inside the `drawInventoryHUD` function, locate `itemDetails`. Map your new `ItemID` to its localized name, border color, tooltip description, and abbreviation text.
- **Rarity Colors**: The loot drop colors on the ground are mapped dynamically in [graphics.ts](file:///c:/Users/user/Documents/projects/freeproject_4/ts-client/src/graphics.ts) inside the `ent.type === 6` renderer block.

