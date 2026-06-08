package game

import (
	"math"
	"math/rand"
	"sync"
	"time"

	"go-server/physics"
	"go-server/protocol"
)

type InputEvent struct {
	PlayerID uint16
	Keys     uint8
	Angle    float32
	Upgrade  uint8
	Delete   uint8
}

type LootDrop struct {
	ID            uint16
	ItemID        uint8
	Pos           physics.Vector2D
	Vel           physics.Vector2D
	Radius        float64
	AttractTarget uint16
}

type GameWorld struct {
	Players          map[uint16]*Player
	Mobs             map[uint16]*Mob
	Bullets          map[uint16]*Bullet
	Minions          map[uint16]*Minion
	Fields           map[uint16]*ChronoField
	LootDrops        map[uint16]*LootDrop
	nextID           uint16
	Width            float64
	Height           float64
	mu               sync.RWMutex
	rand             *rand.Rand
	ElapsedTime      float64
	WaveNumber       uint32
	WaveActive       bool
	WavePauseTimer   float64
	WaveMobsLeft     int
	WaveSpawnTimer   float64
	WaveDuration     float64
	WaveTimeLeft     float64
	WaveDifficulty   float64
	Paused           bool
	bulletPool       sync.Pool
	mobPool          sync.Pool
	fieldPool        sync.Pool
	grid             [60][60][]HashItem
	inputChan        chan InputEvent
	RemovedEntityIDs []uint16
}

func NewGameWorld() *GameWorld {
	worldCfg := GetWorldConfig()
	spawnCfg := GetSpawnConfig()
	w := &GameWorld{
		Players:          make(map[uint16]*Player),
		Mobs:             make(map[uint16]*Mob),
		Bullets:          make(map[uint16]*Bullet),
		Minions:          make(map[uint16]*Minion),
		Fields:           make(map[uint16]*ChronoField),
		LootDrops:        make(map[uint16]*LootDrop),
		nextID:           worldCfg.NextIDStart,
		Width:            worldCfg.ArenaWidth,
		Height:           worldCfg.ArenaHeight,
		rand:             rand.New(rand.NewSource(time.Now().UnixNano())),
		WaveNumber:       0,
		WaveActive:       false,
		WavePauseTimer:   spawnCfg.WavePauseTime,
		WaveDuration:     CurrentWaveConfig.BaseDuration,
		WaveTimeLeft:     0.0,
		WaveDifficulty:   1.0,
		inputChan:        make(chan InputEvent, worldCfg.InputBufferSize),
		RemovedEntityIDs: make([]uint16, 0, 128),
	}
	w.bulletPool = sync.Pool{
		New: func() interface{} {
			return &Bullet{}
		},
	}
	w.mobPool = sync.Pool{
		New: func() interface{} {
			return &Mob{}
		},
	}
	w.fieldPool = sync.Pool{
		New: func() interface{} {
			return &ChronoField{}
		},
	}
	gridSize := worldCfg.GridSize
	for r := 0; r < gridSize; r++ {
		for c := 0; c < gridSize; c++ {
			w.grid[r][c] = make([]HashItem, 0, 32)
		}
	}
	return w
}

func (w *GameWorld) GenerateID() uint16 {
	worldCfg := GetWorldConfig()
	w.nextID++
	if w.nextID == 0 {
		w.nextID = worldCfg.NextIDStart
	}
	return w.nextID
}


func (w *GameWorld) Tick(dt float64) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.processInputs()
	hasUpgrades := false
	for _, p := range w.Players {
		if p.Alive && p.UpgradePoints > 0 {
			hasUpgrades = true
			if p.CardChoices[0] == 0 {
				w.rollUpgradeCards(p)
			}
		}
	}
	if w.Paused || hasUpgrades {
		return
	}
	w.ElapsedTime += dt
	w.updateWaveSystem(dt)
	w.updatePlayers(dt)
	w.updateFields(dt)
	w.updateMobs(dt)
	w.updateBullets(dt)
	w.updateMinions(dt)
	w.updateLootDrops(dt)
	w.rebuildSpatialGrid()
	w.resolveCollisionsOptimized()
}


func (w *GameWorld) ExportState() []protocol.EntityState {
	w.mu.RLock()
	defer w.mu.RUnlock()
	var states []protocol.EntityState
	states = w.appendPlayerStates(states)
	states = w.appendMobStates(states)
	states = w.appendBulletStates(states)
	states = w.appendMinionStates(states)
	states = w.appendFieldStates(states)
	states = w.appendLootDropStates(states)
	return states
}

func (w *GameWorld) appendPlayerStates(states []protocol.EntityState) []protocol.EntityState {
	for _, p := range w.Players {
		if !p.Alive {
			continue
		}
		states = append(states, protocol.EntityState{
			ID:         p.ID,
			Type:       0,
			Subtype:    p.ClassID,
			X:          float32(p.Pos.X),
			Y:          float32(p.Pos.Y),
			Angle:      float32(p.MouseAngle),
			Health:     uint16(math.Max(0, p.Health)),
			MaxHealth:  uint16(p.MaxHealth),
			Radius:     uint16(p.Radius),
			StateFlags: p.StateFlags,
		})
	}
	return states
}

func (w *GameWorld) appendMobStates(states []protocol.EntityState) []protocol.EntityState {
	for _, m := range w.Mobs {
		states = append(states, protocol.EntityState{
			ID:         m.ID,
			Type:       1,
			Subtype:    m.Type,
			X:          float32(m.Pos.X),
			Y:          float32(m.Pos.Y),
			Angle:      0,
			Health:     uint16(math.Max(0, m.Health)),
			MaxHealth:  uint16(m.MaxHealth),
			Radius:     uint16(m.Radius),
			StateFlags: uint32(m.Rarity) | (uint32(m.Modifiers) << 8),
		})
	}
	return states
}

func (w *GameWorld) appendBulletStates(states []protocol.EntityState) []protocol.EntityState {
	for _, b := range w.Bullets {
		states = append(states, protocol.EntityState{
			ID:        b.ID,
			Type:      2,
			Subtype:   b.Subtype,
			X:         float32(b.Pos.X),
			Y:         float32(b.Pos.Y),
			Angle:     float32(math.Atan2(b.Vel.Y, b.Vel.X)),
			Health:    1,
			MaxHealth: 1,
			Radius:    uint16(b.Radius),
		})
	}
	return states
}

func (w *GameWorld) appendMinionStates(states []protocol.EntityState) []protocol.EntityState {
	for _, minion := range w.Minions {
		states = append(states, protocol.EntityState{
			ID:        minion.ID,
			Type:      4,
			Subtype:   0,
			X:         float32(minion.Pos.X),
			Y:         float32(minion.Pos.Y),
			Angle:     float32(minion.Angle),
			Health:    uint16(math.Max(0, minion.Health)),
			MaxHealth: uint16(minion.MaxHealth),
			Radius:    uint16(minion.Radius),
		})
	}
	return states
}

func (w *GameWorld) appendFieldStates(states []protocol.EntityState) []protocol.EntityState {
	for _, f := range w.Fields {
		states = append(states, protocol.EntityState{
			ID:        f.ID,
			Type:      5,
			Subtype:   0,
			X:         float32(f.Pos.X),
			Y:         float32(f.Pos.Y),
			Angle:     0,
			Health:    1,
			MaxHealth: 1,
			Radius:    uint16(f.Radius),
		})
	}
	return states
}

func (w *GameWorld) appendLootDropStates(states []protocol.EntityState) []protocol.EntityState {
	for _, ld := range w.LootDrops {
		states = append(states, protocol.EntityState{
			ID:        ld.ID,
			Type:      6,
			Subtype:   ld.ItemID,
			X:         float32(ld.Pos.X),
			Y:         float32(ld.Pos.Y),
			Angle:     0,
			Health:    1,
			MaxHealth: 1,
			Radius:    uint16(ld.Radius),
		})
	}
	return states
}

func (w *GameWorld) GetRemovedIDs() []uint16 {
	w.mu.RLock()
	defer w.mu.RUnlock()
	if len(w.RemovedEntityIDs) == 0 {
		return nil
	}
	ids := make([]uint16, len(w.RemovedEntityIDs))
	copy(ids, w.RemovedEntityIDs)
	return ids
}

func (w *GameWorld) ClearRemovedIDs() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.RemovedEntityIDs = w.RemovedEntityIDs[:0]
}

func (w *GameWorld) TogglePause() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.Paused = !w.Paused
}

func (w *GameWorld) updateLootDrops(dt float64) {
	for id, ld := range w.LootDrops {
		if ld.AttractTarget != 0 {
			p, ok := w.Players[ld.AttractTarget]
			if !ok || !p.Alive {
				ld.AttractTarget = 0
			} else {
				dir := p.Pos.Sub(ld.Pos).Normalize()
				ld.Vel = ld.Vel.Add(dir.Mul(0.85)).Normalize().Mul(8.5)
				ld.Pos = ld.Pos.Add(ld.Vel)
			}
		} else {
			var target *Player
			var minDistSq float64 = -1
			for _, p := range w.Players {
				if !p.Alive {
					continue
				}
				distSq := p.Pos.Sub(ld.Pos).LengthSq()

				var itemRadius float64
				for itemID, count := range p.Inventory {
					if count > 0 {
						if mod, ok := GetItemModifier(itemID); ok {
							itemRadius += mod.StatModifiers.PickupRadius * float64(count)
						}
					}
				}

				attractRadius := 150.0 + itemRadius // Base radius is 150.0
				if distSq < attractRadius*attractRadius {
					if minDistSq < 0 || distSq < minDistSq {
						minDistSq = distSq
						target = p
					}
				}
			}
			if target != nil {
				attractRadius := 100.0 + float64(target.StatPickupItemRadius)*200.0
				if minDistSq < attractRadius*attractRadius {
					ld.AttractTarget = target.ID
				}
			}
		}
		if ld.Pos.X < 0 || ld.Pos.X > w.Width || ld.Pos.Y < 0 || ld.Pos.Y > w.Height {
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.LootDrops, id)
		}
	}
}
