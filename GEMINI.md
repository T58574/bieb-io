# GEMINI CONTEXT INDEX

## PROJECT STATUS
[Completed] - 2D Rogue-like bullet-hell game Necro-Geometry is fully implemented, optimized, and ready.

## DIRECTORY STRUCTURE & RELATION GRAPH
```
/ (project root)
├── GEMINI.md                  # Global context index
├── package.json               # Root orchestrator build file
├── run.bat                    # Windows launch batch file
├── .ai_docs/                  # AI-driven specifications (strict schemas)
│   ├── network_protocol.yaml  # Custom binary packet contracts
│   └── structures.yaml        # Server/client data structure schemas
├── go-server/                 # Authoritative Go server
│   ├── go.mod                 # Go module file
│   └── main.go                # Server entry & loop definition
└── ts-client/                 # Vanilla TS Canvas client
    ├── package.json           # Client dependency file
    ├── tsconfig.json          # TS config
    ├── index.html             # Client entry page
    └── src/                   # Client sources
```

### File Relations
- `go-server` parses inputs and broadcasts binary states.
- `ts-client` sends player input packets and renders parsed binary states.
- `.ai_docs/` acts as the single source of truth (SSOT) for data layouts.

## ARCHITECTURAL INVARIANTS
1. [Strict Server Authority]: Client only handles input gathering and rendering. Zero physics or health calculations happen on the client.
2. [No External Game Engines]: Pure HTML5 Canvas API, no Phaser, no PixiJS.
3. [Zero Code Comments]: All codebase source files must contain no comments. Self-documenting code only.
4. [Custom Binary Protocol]: Fixed-size headers and raw memory-mapping for high-frequency networking.

## TASK BACKLOG
- [Phase 1]: Arch Design & AI Context
- [Phase 2]: Go Server Core & Physics
- [Phase 3]: Entity System & Canvas Render
- [Phase 4]: Rogue-like Wave & AI Logic
- [Phase 5]: Optimization & Stress Test
