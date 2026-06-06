# GEMINI CONTEXT INDEX

## PROJECT STATUS
[Completed] - 2D Rogue-like bullet-hell game Necro-Geometry is fully implemented, optimized, and ready.

## DIRECTORY STRUCTURE & RELATION GRAPH
```
/ (project root)
├── GEMINI.md                  # Global context index for AI agents
├── README.md                  # Developer-facing readme and setup guide
├── package.json               # Root orchestrator build file
├── package-lock.json          # Root lockfile
├── run.bat                    # Windows launch batch file
├── start-server.bat           # Server build & run script
├── tasks.md                   # Chronological project task tracker
├── .ai_docs/                  # AI-driven specifications (strict schemas)
│   ├── class_system.json      # Class tree & modifiers configuration
│   ├── network_protocol.yaml  # Custom binary packet layouts
│   └── structures.yaml        # Server/client data structures
├── go-server/                 # Authoritative Go server
│   ├── go.mod                 # Go module definition
│   ├── go.sum                 # Go dependencies checksum
│   ├── main.go                # HTTP handlers & loop orchestration
│   ├── main_test.go           # Server infrastructure testing
│   ├── game/                  # Game loop, entity updates, collision resolution
│   │   ├── game.go            # Primary world update and physics loops
│   │   └── game_test.go       # World lifecycle testing
│   ├── physics/               # Custom math and geometric collision handlers
│   │   ├── physics.go         # Elastic collision resolution math
│   │   └── physics_test.go    # Collision calculation verification
│   └── protocol/              # Raw packet parsing and encoding
│       ├── protocol.go        # Binary packers and unpackers
│       └── protocol_test.go   # Serialization assertions
└── ts-client/                 # Vanilla TS Canvas client
    ├── package.json           # Client dependency manager
    ├── tsconfig.json          # TypeScript compilation configuration
    ├── index.html             # Client entry web page
    └── src/                   # Client source files
        ├── main.ts            # Input handlers, canvas renderer, shape cache
        ├── protocol.ts        # Client binary protocol implementation
        └── protocol.test.ts   # Serialization test suite
```

### File Relations
- `go-server` processes player input packets and broadcasts game states at 60 TPS.
- `ts-client` sends input bitmasks and interpolates received entity states.
- `.ai_docs/` represents the Single Source of Truth (SSOT) for data layouts.

## ARCHITECTURAL INVARIANTS
1. [Strict Server Authority]: Client only captures inputs and draws sprites. Zero physics, cooldowns, or collision resolving are performed by the client.
2. [No External Game Engines]: Pure HTML5 Canvas API, no rendering abstractions. Shape caching is implemented to optimize performance.
3. [Zero Code Comments]: All codebase source files must contain zero comments. Self-documenting code only.
4. [Custom Binary Protocol]: Fixed-size headers and raw buffer manipulation. No JSON overhead.
5. [Optimized State Updates]: Spatial hashing partitions the game world. sync.Pool reuse prevents heap allocations.

## TASK BACKLOG
- [x] [Phase 1]: Arch Design & AI Context
- [x] [Phase 2]: Go Server Core & Physics
- [x] [Phase 3]: Entity System & Canvas Render
- [x] [Phase 4]: Fantasy Class System (Warrior, Archer, Rogue, Mage) & Mechanics
- [x] [Phase 5]: Rogue-like Wave & AI Logic
- [x] [Phase 6]: Optimization & Stress Test
