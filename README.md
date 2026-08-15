# 👾 Necro-Geometry (bieb-io) — Authoritative Real-Time Multiplayer Bullet-Hell

<div align="center">

[![Go](https://img.shields.io/badge/Go-1.21%2B-00ADD8?style=flat-square&logo=go&logoColor=white)](https://golang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![HTML5 Canvas](https://img.shields.io/badge/Graphics-HTML5_Canvas-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![WebSocket](https://img.shields.io/badge/Networking-Binary_WebSockets-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Status: Paused](https://img.shields.io/badge/Status-Paused%20%2F%20Archived-lightgrey?style=flat-square)](#-project-status)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**An ultra-fast 60 TPS authoritative multiplayer roguelike bullet-hell and 2D arena game engine built on pure Go, binary WebSocket protocols, spatial hash grids, and Path of Exile inspired character build mechanics.**

[Project Status](#-project-status) • [Features](#-key-features) • [Architecture](#-architecture) • [Networking](#-binary-network-protocol) • [Quick Start](#-quick-start) • [License](#-license)

</div>

---

## ⏸️ Project Status

> [!NOTE]
> **DEVELOPMENT STATUS: PAUSED / ARCHIVED**
> Active development on this project is currently on hold. The codebase is fully preserved in a working, completed state as an architectural reference and portfolio showcase for high-performance authoritative Go game servers, zero-allocation memory pooling (`sync.Pool`), binary network serialization, and client-side interpolation.

---

## 📖 Overview

**Necro-Geometry (`bieb-io`)** is a real-time multiplayer IO bullet-hell roguelike. Players pilot customizable geometric bio-shells in an endless arena, battling waves of mutating enemy swarms, collecting rare loot, leveling up deep passive trees, and fighting massive survival-gated bosses.

The architecture emphasizes **server-authoritative execution**: client inputs are compressed into bitmasks, processed on a rigid 60 TPS fixed-tick game loop in Go with zero client trust, and broadcast back to connected clients using an ultra-dense binary state protocol.

---

## ✨ Key Features

- ⚡ **Authoritative 60 TPS Go Game Server**
  - Rigid tick loop with spatial hash grid partitioning ($O(1)$ collision lookups), 2D elastic physics, and extensive `sync.Pool` memory allocation reuse eliminating runtime GC pauses.
- 📡 **Ultra-Dense Binary WebSocket Protocol**
  - Custom byte-level pack/unpack serializers transmitting entity states, delta movements, input bitmasks, and active skills with minimal network payload (<5 KB/s per player).
- 🏹 **Path of Exile Inspired Deep Progression**
  - 32 character stat slots, active class skills (Dash, Overdrive, Chrono Slow, Drone Burst), item rarity tiers, block chance (capped at 75%), double damage chance, thorns, and defiance mechanics.
- 🧬 **Dynamic Wave Mutations & Boss Survival Gates**
  - Deterministic wave mutation engine with 6 distinct combat modifiers (Hyper Speed, Savage, Armored, Rapid Fire, Regenerative, Quantum Shift) scaling difficulty dynamically.
- 🎨 **Modular Canvas Render Engine**
  - Pure TypeScript client featuring shape caching, dynamic coordinate interpolation, particle burst systems, and viewport screen shake.
- 🖥️ **Standalone Desktop Distribution**
  - Native Windows executable packaging powered by pure Go WebView2 (`go:embed` asset bundling and dynamic fallback port allocation).

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    TypeScript Canvas Client                      │
│      (Input Bitmask Packaging + Entity Interpolation + HUD)      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Binary WebSockets (ws://)
┌─────────────────────────────────▼────────────────────────────────┐
│                   Authoritative Go Game Server                   │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐  │
│  │ 60 TPS Fixed Tick Loop │  │ Spatial Hash Grid Partitioning │  │
│  └────────────────────────┘  └────────────────────────────────┘  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Binary Protocol Pack   │  │ 2D Elastic Collision Engine    │  │
│  └────────────────────────┘  └────────────────────────────────┘  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐  │
│  │ PoE Stat Calculations  │  │ Wave Mutation State Machine    │  │
│  └────────────────────────┘  └────────────────────────────────┘  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Pure Go WebView2 Binding
┌─────────────────────────────────▼────────────────────────────────┐
│               Standalone Desktop Binary (Windows EXE)            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📡 Binary Network Protocol

Client-server communication utilizes custom binary layouts defined in `.ai_docs/network_protocol.yaml`:

```
Input Frame (Client -> Server):
[0x01: OpCode (1B)] [Tick: uint32 (4B)] [Bitmask: uint16 (2B)] [AimAngle: float32 (4B)]

Entity Delta Frame (Server -> Client):
[0x02: OpCode (1B)] [Tick: uint32 (4B)] [EntityCount: uint16 (2B)]
  └─ For each entity: [ID (2B)] [Type (1B)] [X (4B)] [Y (4B)] [Angle (2B)] [Flags (1B)]
```

---

## 🛠 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Game Server** | Go 1.21+, WebSockets (`gorilla/websocket`) | 60 TPS authoritative loop, spatial hash grid, binary serialization |
| **Physics & Math** | Pure Go Math | 2D elastic circle/box collisions, vector trigonometry, raycasts |
| **Frontend Client** | TypeScript 5.0, HTML5 Canvas | Zero-dependency high-FPS rendering, shape caching, client interpolation |
| **Desktop Shell** | WebView2 (`github.com/jchv/go-webview2`) | Zero-overhead native Windows desktop wrapper with `go:embed` |

---

## 🚀 Quick Start

### 1. Run the Game Server
```bash
cd go-server
go run main.go
```
The authoritative server will initialize at `http://localhost:8080`.

### 2. Run the Web Client
Open `ts-client/index.html` in any modern web browser or serve it via Vite:
```bash
cd ts-client
npm install
npm run dev
```

### 3. Build Standalone Windows Executable
```powershell
powershell -ExecutionPolicy Bypass -File ./build_desktop.ps1
```

---

## 📁 Project Structure

```
bieb-io/
├── .ai_docs/                # Binary protocol and architecture blueprints
│   ├── network_protocol.yaml# Binary WebSocket packet layouts
│   └── class_system.json    # Stat tree modifiers & item definitions
├── go-server/               # Authoritative Go Server Core
│   ├── game/                # World state, tick loops, boss spawners
│   ├── physics/             # Spatial hash grid & 2D elastic collisions
│   ├── protocol/            # Binary serialization & compression
│   └── main.go              # WebSocket dispatcher & HTTP server
├── ts-client/               # Canvas Client Engine
│   ├── src/
│   │   ├── draw_entities.ts # Particle systems, shape renderers
│   │   ├── draw_grid.ts     # World background grid renderer
│   │   ├── protocol.ts      # Binary unpacker & input bitmasker
│   │   └── main.ts          # Client game loop & HUD overlay
│   └── index.html           # Viewport entry point
├── build_desktop.ps1        # Desktop EXE compiler pipeline
└── LICENSE                  # MIT License
```

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
