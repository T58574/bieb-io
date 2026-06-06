Necro-Geometry Implementation Backlog
[x] Phase 1: Arch Design and AI Context
[x] Create directory structure (go-server, ts-client, .ai_docs)
[x] Write GEMINI.md context index file
[x] Create spec schemas in .ai_docs (structures.yaml, network_protocol.yaml)
[x] Initialize Go module and write base binary encoders
[x] Initialize TS client module and write binary decoders
[x] Verify serialization and communication via test suite
[x] Phase 2: High-Performance Go Server Core
[x] Game loop with fixed Tick Rate (60 TPS)
[x] 2D Physics engine (movement, inertia, friction, RWMutex synchronizer)
[x] Collision detection and response (Circle-Circle, Circle-Box)
[x] Interpolation/extrapolation logic on client
[x] Phase 3: Entity System, Shooting, Procedural Canvas
[x] Server Entity Manager (Player, Mob, Bullet, ExpOrb, Minion)
[x] Weapon and shooting mechanics (bullets spawning, reloading, cooldowns)
[x] Client procedural canvas renderer with smooth rotation
[x] Phase 4: Rogue-like Engine: Progression, Upgrades, AI
[x] Leveling and experience gathering (magnetic attraction)
[x] Tank upgrade tree and multiclassing (Necro-Geometry specifics)
[x] Exponential wave manager
[x] Mob AI (chasers, shooters, kamikaze, swarms)
[/] Phase 5: UI, Balancing, Spatial Partitioning
[/] Canvas HUD and Upgrade UI overlay
[/] Spatial Hashing for grid collision optimization (5000+ entities)
[/] Object pooling via sync.Pool
[/] Project finalization and verification