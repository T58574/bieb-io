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
	ID     uint16
	ItemID uint8
	Pos    physics.Vector2D
	Radius float64
}

type GameWorld struct {
	Players          map[uint16]*Player
	Mobs             map[uint16]*Mob
	Bullets          map[uint16]*Bullet
	Orbs             map[uint16]*ExpOrb
	Minions          map[uint16]*Minion
	Fields           map[uint16]*ChronoField
	LootDrops        map[uint16]*LootDrop
	nextID           uint16
	orbMergeTimer    float64
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
	Paused           bool
	bulletPool       sync.Pool
	mobPool          sync.Pool
	orbPool          sync.Pool
	fieldPool        sync.Pool
	grid             [60][60][]HashItem
	inputChan        chan InputEvent
	RemovedEntityIDs []uint16
}

func NewGameWorld() *GameWorld {
	w := &GameWorld{
		Players:          make(map[uint16]*Player),
		Mobs:             make(map[uint16]*Mob),
		Bullets:          make(map[uint16]*Bullet),
		Orbs:             make(map[uint16]*ExpOrb),
		Minions:          make(map[uint16]*Minion),
		Fields:           make(map[uint16]*ChronoField),
		LootDrops:        make(map[uint16]*LootDrop),
		nextID:           100,
		Width:            6000.0,
		Height:           6000.0,
		rand:             rand.New(rand.NewSource(time.Now().UnixNano())),
		WaveNumber:       0,
		WaveActive:       false,
		WavePauseTimer:   2.0,
		inputChan:        make(chan InputEvent, 4096),
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
	w.orbPool = sync.Pool{
		New: func() interface{} {
			return &ExpOrb{}
		},
	}
	w.fieldPool = sync.Pool{
		New: func() interface{} {
			return &ChronoField{}
		},
	}
	for r := 0; r < 60; r++ {
		for c := 0; c < 60; c++ {
			w.grid[r][c] = make([]HashItem, 0, 32)
		}
	}
	return w
}

func (w *GameWorld) GenerateID() uint16 {
	w.nextID++
	if w.nextID == 0 {
		w.nextID = 100
	}
	return w.nextID
}


func (w *GameWorld) Tick(dt float64) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.processInputs()
	w.orbMergeTimer += dt
	if w.orbMergeTimer >= 1.0 {
		w.orbMergeTimer = 0.0
		w.mergeOrbs()
	}
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
	w.updateOrbs(dt)
	w.rebuildSpatialGrid()
	w.resolveCollisionsOptimized()
}


func (w *GameWorld) ExportState() []protocol.EntityState {
	w.mu.RLock()
	defer w.mu.RUnlock()
	var states []protocol.EntityState
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
	for _, m := range w.Mobs {
		states = append(states, protocol.EntityState{
			ID:        m.ID,
			Type:      1,
			Subtype:   m.Type,
			X:         float32(m.Pos.X),
			Y:         float32(m.Pos.Y),
			Angle:     0,
			Health:    uint16(math.Max(0, m.Health)),
			MaxHealth: uint16(m.MaxHealth),
			Radius:    uint16(m.Radius),
			StateFlags: uint32(m.Rarity) | (uint32(m.Modifiers) << 8),
		})
	}
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
	for _, o := range w.Orbs {
		var subtype uint8 = 1
		if o.XPValue > 500 {
			subtype = 4
		} else if o.XPValue > 100 {
			subtype = 3
		} else if o.XPValue > 20 {
			subtype = 2
		}

		states = append(states, protocol.EntityState{
			ID:        o.ID,
			Type:      3,
			Subtype:   subtype,
			X:         float32(o.Pos.X),
			Y:         float32(o.Pos.Y),
			Angle:     0,
			Health:    1,
			MaxHealth: 1,
			Radius:    uint16(o.Radius),
		})
	}
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

func (w *GameWorld) GetAndClearRemovedIDs() []uint16 {
	w.mu.Lock()
	defer w.mu.Unlock()
	if len(w.RemovedEntityIDs) == 0 {
		return nil
	}
	ids := make([]uint16, len(w.RemovedEntityIDs))
	copy(ids, w.RemovedEntityIDs)
	w.RemovedEntityIDs = w.RemovedEntityIDs[:0]
	return ids
}

func (w *GameWorld) TogglePause() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.Paused = !w.Paused
}
