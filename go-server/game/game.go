package game

import (
	"math"
	"math/rand"
	"sync"
	"time"

	"go-server/physics"
	"go-server/protocol"
)

type Player struct {
	ID               uint16
	Username         string
	Pos              physics.Vector2D
	Vel              physics.Vector2D
	Radius           float64
	Health           float64
	MaxHealth        float64
	XP               uint32
	MaxXP            uint32
	Level            uint16
	Score            uint32
	MouseAngle       float64
	Keys             uint8
	UpgradeSelect    uint8
	MinionIDs        []uint16
	Alive            bool
	UpgradePoints    uint8
	StatRegen        uint8
	StatMaxHP        uint8
	StatSpeed        uint8
	StatMinionDmg    uint8
	StatMinionSpeed  uint8
	StatMinionHP     uint8
	StatMinionPierce uint8
	StatMinionRegen  uint8
	RegenAccum       float64
	ClassID          uint8
	Mass             float64
	StateFlags       uint32
	ChargeLevel      float64
}

type Mob struct {
	ID            uint16
	Type          uint8
	Subtype       uint8
	Pos           physics.Vector2D
	Vel           physics.Vector2D
	Radius        float64
	Health        float64
	MaxHealth     float64
	Damage        float64
	XPValue       uint32
	ShootCooldown float64
}

type Bullet struct {
	ID        uint16
	OwnerID   uint16
	OwnerType uint8
	Pos       physics.Vector2D
	Vel       physics.Vector2D
	Radius    float64
	Damage    float64
	Lifetime  float64
	Pierce    int
}

type ExpOrb struct {
	ID            uint16
	Pos           physics.Vector2D
	Vel           physics.Vector2D
	Radius        float64
	XPValue       uint32
	AttractTarget uint16
}

type Minion struct {
	ID            uint16
	OwnerID       uint16
	Pos           physics.Vector2D
	Vel           physics.Vector2D
	Radius        float64
	Health        float64
	MaxHealth     float64
	Damage        float64
	Angle         float64
	ShootCooldown float64
	RegenAccum    float64
}

type HashItem struct {
	ID        uint16
	Type      uint8
	Pos       physics.Vector2D
	Radius    float64
	Damage    float64
	OwnerID   uint16
	OwnerType uint8
}

type InputEvent struct {
	PlayerID uint16
	Keys     uint8
	Angle    float32
	Upgrade  uint8
}

type GameWorld struct {
	Players        map[uint16]*Player
	Mobs           map[uint16]*Mob
	Bullets        map[uint16]*Bullet
	Orbs           map[uint16]*ExpOrb
	Minions        map[uint16]*Minion
	nextID         uint16
	Width          float64
	Height         float64
	mu             sync.RWMutex
	rand           *rand.Rand
	ElapsedTime    float64
	WaveNumber     uint32
	WaveActive     bool
	WavePauseTimer float64
	WaveMobsLeft   int
	WaveSpawnTimer float64
	bulletPool     sync.Pool
	mobPool        sync.Pool
	orbPool        sync.Pool
	grid           [20][20][]HashItem
	inputChan      chan InputEvent
}

func NewGameWorld() *GameWorld {
	w := &GameWorld{
		Players:    make(map[uint16]*Player),
		Mobs:       make(map[uint16]*Mob),
		Bullets:    make(map[uint16]*Bullet),
		Orbs:       make(map[uint16]*ExpOrb),
		Minions:    make(map[uint16]*Minion),
		nextID:     100,
		Width:      2000.0,
		Height:     2000.0,
		rand:       rand.New(rand.NewSource(time.Now().UnixNano())),
		WaveNumber: 0,
		WaveActive: false,
		WavePauseTimer: 2.0,
		inputChan:  make(chan InputEvent, 4096),
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

	for r := 0; r < 20; r++ {
		for c := 0; c < 20; c++ {
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

func (w *GameWorld) AddPlayer(id uint16, username string) *Player {
	w.mu.Lock()
	defer w.mu.Unlock()
	p := &Player{
		ID:        id,
		Username:  username,
		Pos:       physics.Vector2D{X: w.Width / 2, Y: w.Height / 2},
		Radius:    24,
		Health:    100,
		MaxHealth: 100,
		XP:        0,
		MaxXP:     60,
		Level:     1,
		Score:     0,
		Alive:     true,
		ClassID:   0,
		Mass:      1.0,
		StateFlags: 0,
		ChargeLevel: 0.0,
	}
	w.Players[id] = p
	w.spawnMinion(id, p.Pos.Add(physics.Vector2D{X: 40, Y: 0}))
	return p
}

func (w *GameWorld) RemovePlayer(id uint16) {
	w.mu.Lock()
	defer w.mu.Unlock()
	p, exists := w.Players[id]
	if !exists {
		return
	}
	for _, mID := range p.MinionIDs {
		delete(w.Minions, mID)
	}
	delete(w.Players, id)
}

func (w *GameWorld) UpdateInput(id uint16, keys uint8, angle float32, upgradeSelect uint8) {
	select {
	case w.inputChan <- InputEvent{PlayerID: id, Keys: keys, Angle: angle, Upgrade: upgradeSelect}:
	default:
	}
}

func (w *GameWorld) applyStatUpgrade(p *Player, statID uint8) {
	if p.UpgradePoints == 0 {
		return
	}
	switch statID {
	case 1:
		if p.StatRegen < 7 {
			p.StatRegen++
			p.UpgradePoints--
		}
	case 2:
		if p.StatMaxHP < 7 {
			p.StatMaxHP++
			p.UpgradePoints--
			p.MaxHealth = 100 + float64(p.StatMaxHP)*25
			if p.Health > p.MaxHealth {
				p.Health = p.MaxHealth
			}
		}
	case 3:
		if p.StatSpeed < 7 {
			p.StatSpeed++
			p.UpgradePoints--
		}
	case 4:
		if p.StatMinionDmg < 7 {
			p.StatMinionDmg++
			p.UpgradePoints--
		}
	case 5:
		if p.StatMinionSpeed < 7 {
			p.StatMinionSpeed++
			p.UpgradePoints--
		}
	case 6:
		if p.StatMinionHP < 7 {
			p.StatMinionHP++
			p.UpgradePoints--
			for _, mID := range p.MinionIDs {
				if m, ok := w.Minions[mID]; ok {
					newMax := 35.0 + float64(p.StatMinionHP)*10.0
					m.MaxHealth = newMax
					if m.Health > m.MaxHealth {
						m.Health = m.MaxHealth
					}
				}
			}
		}
	case 7:
		if p.StatMinionPierce < 7 {
			p.StatMinionPierce++
			p.UpgradePoints--
		}
	case 8:
		if p.StatMinionRegen < 7 {
			p.StatMinionRegen++
			p.UpgradePoints--
		}
	}
}

func (w *GameWorld) processInputs() {
	for {
		select {
		case ev := <-w.inputChan:
			p, exists := w.Players[ev.PlayerID]
			if exists && p.Alive {
				p.Keys = ev.Keys
				p.MouseAngle = float64(ev.Angle)
				if ev.Upgrade != 0 && p.UpgradePoints > 0 {
					w.applyStatUpgrade(p, ev.Upgrade)
				}
			}
		default:
			return
		}
	}
}

func (w *GameWorld) Tick(dt float64) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.processInputs()

	w.ElapsedTime += dt

	w.updateWaveSystem(dt)
	w.updatePlayers(dt)
	w.updateMobs(dt)
	w.updateBullets(dt)
	w.updateMinions(dt)
	w.updateOrbs(dt)

	w.rebuildSpatialGrid()
	w.resolveCollisionsOptimized()
}

func (w *GameWorld) rebuildSpatialGrid() {
	for r := 0; r < 20; r++ {
		for c := 0; c < 20; c++ {
			w.grid[r][c] = w.grid[r][c][:0]
		}
	}

	for _, p := range w.Players {
		if !p.Alive {
			continue
		}
		w.insertToGrid(HashItem{ID: p.ID, Type: 0, Pos: p.Pos, Radius: p.Radius})
	}
	for _, m := range w.Mobs {
		w.insertToGrid(HashItem{ID: m.ID, Type: 1, Pos: m.Pos, Radius: m.Radius, Damage: m.Damage})
	}
	for _, b := range w.Bullets {
		w.insertToGrid(HashItem{ID: b.ID, Type: 2, Pos: b.Pos, Radius: b.Radius, Damage: b.Damage, OwnerID: b.OwnerID, OwnerType: b.OwnerType})
	}
	for _, o := range w.Orbs {
		w.insertToGrid(HashItem{ID: o.ID, Type: 3, Pos: o.Pos, Radius: o.Radius})
	}
	for _, minion := range w.Minions {
		w.insertToGrid(HashItem{ID: minion.ID, Type: 4, Pos: minion.Pos, Radius: minion.Radius, Damage: minion.Damage})
	}
}

func (w *GameWorld) insertToGrid(item HashItem) {
	col := int(item.Pos.X / 100.0)
	row := int(item.Pos.Y / 100.0)
	if col < 0 {
		col = 0
	} else if col >= 20 {
		col = 19
	}
	if row < 0 {
		row = 0
	} else if row >= 20 {
		row = 19
	}
	w.grid[row][col] = append(w.grid[row][col], item)
}

func (w *GameWorld) hasAlivePlayers() bool {
	for _, p := range w.Players {
		if p.Alive {
			return true
		}
	}
	return false
}

func (w *GameWorld) updateWaveSystem(dt float64) {
	if !w.hasAlivePlayers() {
		return
	}

	if !w.WaveActive {
		w.WavePauseTimer -= dt
		if w.WavePauseTimer <= 0 {
			w.WaveNumber++
			w.WaveActive = true
			w.WaveMobsLeft = 3 + int(w.WaveNumber)*2
			w.WaveSpawnTimer = 0
		}
		return
	}

	if w.WaveMobsLeft <= 0 && len(w.Mobs) == 0 {
		w.WaveActive = false
		w.WavePauseTimer = 5.0
		return
	}

	maxAlive := 5 + int(w.WaveNumber)*2
	if maxAlive > 25 {
		maxAlive = 25
	}

	if w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive {
		w.WaveSpawnTimer += dt
		if w.WaveSpawnTimer >= 1.5 {
			w.WaveSpawnTimer = 0
			w.spawnSingleMob()
			w.WaveMobsLeft--
		}
	}
}

func (w *GameWorld) spawnSingleMob() {
	var rx, ry float64
	side := w.rand.Intn(4)
	switch side {
	case 0:
		rx = w.rand.Float64() * w.Width
		ry = -50
	case 1:
		rx = w.rand.Float64() * w.Width
		ry = w.Height + 50
	case 2:
		rx = -50
		ry = w.rand.Float64() * w.Height
	case 3:
		rx = w.Width + 50
		ry = w.rand.Float64() * w.Height
	}

	mobType := uint8(w.rand.Intn(4))
	id := w.GenerateID()
	waveScale := float64(w.WaveNumber - 1)

	var hp, rad, dmg float64
	var xpVal uint32
	switch mobType {
	case 0:
		hp = 20 * (1.0 + 0.15*waveScale)
		rad = 16
		dmg = 5 * (1.0 + 0.1*waveScale)
		xpVal = 15
	case 1:
		hp = 40 * (1.0 + 0.15*waveScale)
		rad = 22
		dmg = 8 * (1.0 + 0.1*waveScale)
		xpVal = 35
	case 2:
		hp = 15 * (1.0 + 0.15*waveScale)
		rad = 12
		dmg = 10 * (1.0 + 0.1*waveScale)
		xpVal = 25
	case 3:
		hp = 5 * (1.0 + 0.15*waveScale)
		rad = 10
		dmg = 2.5 * (1.0 + 0.1*waveScale)
		xpVal = 10
	}

	m := w.mobPool.Get().(*Mob)
	*m = Mob{}
	m.ID = id
	m.Type = mobType
	m.Pos = physics.Vector2D{X: rx, Y: ry}
	m.Radius = rad
	m.Health = hp
	m.MaxHealth = hp
	m.Damage = dmg
	m.XPValue = xpVal
	w.Mobs[id] = m
}

func (w *GameWorld) updatePlayers(dt float64) {
	for _, p := range w.Players {
		if !p.Alive {
			continue
		}

		if p.Health <= 0 {
			p.Alive = false
			for _, mID := range p.MinionIDs {
				delete(w.Minions, mID)
			}
			p.MinionIDs = nil
			continue
		}

		speedMul := 1.0 + float64(p.StatSpeed)*0.08

		var ax, ay float64
		if p.Keys&0x01 != 0 {
			ay -= 0.6 * speedMul
		}
		if p.Keys&0x02 != 0 {
			ax -= 0.6 * speedMul
		}
		if p.Keys&0x04 != 0 {
			ay += 0.6 * speedMul
		}
		if p.Keys&0x08 != 0 {
			ax += 0.6 * speedMul
		}

		p.Vel = p.Vel.Add(physics.Vector2D{X: ax, Y: ay})
		p.Vel = p.Vel.Mul(0.88)
		p.Pos = p.Pos.Add(p.Vel)

		physics.ResolveCircleBox(&p.Pos, p.Radius, &p.Vel, 0, 0, w.Width, w.Height, 0.2)

		if p.StatRegen > 0 && p.Health < p.MaxHealth {
			regenRate := float64(p.StatRegen) * 0.8
			p.RegenAccum += regenRate * dt
			if p.RegenAccum >= 1.0 {
				heal := math.Floor(p.RegenAccum)
				p.Health = math.Min(p.MaxHealth, p.Health+heal)
				p.RegenAccum -= heal
			}
		}
	}
}

func (w *GameWorld) updateMobs(dt float64) {
	for id, m := range w.Mobs {
		var target *Player
		var minDist float64 = -1
		for _, p := range w.Players {
			if !p.Alive {
				continue
			}
			distSq := p.Pos.Sub(m.Pos).LengthSq()
			if minDist < 0 || distSq < minDist {
				minDist = distSq
				target = p
			}
		}

		if target != nil {
			dist := math.Sqrt(minDist)
			dir := target.Pos.Sub(m.Pos).Normalize()

			if m.Type == 0 {
				m.Vel = m.Vel.Add(dir.Mul(0.2)).Normalize().Mul(1.8)
			} else if m.Type == 1 {
				if dist > 260 {
					m.Vel = m.Vel.Add(dir.Mul(0.2)).Normalize().Mul(2.0)
				} else if dist < 180 {
					m.Vel = m.Vel.Add(dir.Mul(-0.25)).Normalize().Mul(2.2)
				} else {
					m.Vel = m.Vel.Mul(0.9)
				}
				m.ShootCooldown -= dt
				if m.ShootCooldown <= 0 && dist < 450 {
					m.ShootCooldown = 3.5
					bID := w.GenerateID()
					b := w.bulletPool.Get().(*Bullet)
					*b = Bullet{}
					b.ID = bID
					b.OwnerID = m.ID
					b.OwnerType = 1
					b.Pos = m.Pos.Add(dir.Mul(m.Radius + 5))
					b.Vel = dir.Mul(7.0)
					b.Radius = 7
					b.Damage = 4
					b.Lifetime = 3.0
					b.Pierce = 1
					w.Bullets[bID] = b
				}
			} else if m.Type == 2 {
				m.Vel = m.Vel.Add(dir.Mul(0.3)).Normalize().Mul(3.2)
			} else if m.Type == 3 {
				m.Vel = m.Vel.Add(dir.Mul(0.25)).Normalize().Mul(2.5)
			}
		}

		m.Pos = m.Pos.Add(m.Vel)
		physics.ResolveCircleBox(&m.Pos, m.Radius, &m.Vel, 0, 0, w.Width, w.Height, 0.2)

		if m.Health <= 0 {
			w.spawnOrb(m.Pos, m.XPValue)
			w.mobPool.Put(m)
			delete(w.Mobs, id)
		}
	}
}

func (w *GameWorld) spawnOrb(pos physics.Vector2D, xp uint32) {
	oID := w.GenerateID()
	o := w.orbPool.Get().(*ExpOrb)
	*o = ExpOrb{}
	o.ID = oID
	o.Pos = pos.Add(physics.Vector2D{X: w.rand.Float64()*12 - 6, Y: w.rand.Float64()*12 - 6})
	o.Radius = 8
	o.XPValue = xp
	o.AttractTarget = 0
	w.Orbs[oID] = o
}

func (w *GameWorld) updateBullets(dt float64) {
	for id, b := range w.Bullets {
		b.Pos = b.Pos.Add(b.Vel)
		b.Lifetime -= dt

		if b.Lifetime <= 0 || b.Pos.X < 0 || b.Pos.X > w.Width || b.Pos.Y < 0 || b.Pos.Y > w.Height {
			w.bulletPool.Put(b)
			delete(w.Bullets, id)
		}
	}
}

func (w *GameWorld) updateMinions(dt float64) {
	playerMinionCounts := make(map[uint16]int)
	for _, m := range w.Minions {
		playerMinionCounts[m.OwnerID]++
	}

	for id, m := range w.Minions {
		owner, ok := w.Players[m.OwnerID]
		if !ok || !owner.Alive {
			delete(w.Minions, id)
			continue
		}

		m.Angle += dt * 2.5
		totalMinions := playerMinionCounts[m.OwnerID]
		if totalMinions == 0 {
			totalMinions = 1
		}

		idx := 0
		for i, mID := range owner.MinionIDs {
			if mID == id {
				idx = i
				break
			}
		}

		baseAngle := (float64(idx) / float64(totalMinions)) * 2.0 * math.Pi
		orbitAngle := m.Angle + baseAngle
		orbitRadius := owner.Radius + 38.0
		targetPos := owner.Pos.Add(physics.Vector2D{
			X: math.Cos(orbitAngle) * orbitRadius,
			Y: math.Sin(orbitAngle) * orbitRadius,
		})

		speedMul := 1.0 + float64(owner.StatMinionSpeed)*0.06
		diff := targetPos.Sub(m.Pos)
		m.Vel = diff.Mul(0.18 * speedMul)
		m.Pos = m.Pos.Add(m.Vel)

		m.Damage = 10.0 + float64(owner.StatMinionDmg)*3.0
		m.MaxHealth = 35.0 + float64(owner.StatMinionHP)*10.0

		m.ShootCooldown -= dt
		if m.ShootCooldown <= 0 {
			m.ShootCooldown = 1.2
			w.minionShoot(m, owner)
		}

		if owner.StatMinionRegen > 0 && m.Health < m.MaxHealth {
			regenRate := float64(owner.StatMinionRegen) * 0.5
			m.RegenAccum += regenRate * dt
			if m.RegenAccum >= 1.0 {
				heal := math.Floor(m.RegenAccum)
				m.Health = math.Min(m.MaxHealth, m.Health+heal)
				m.RegenAccum -= heal
			}
		}

		if m.Health <= 0 {
			w.removeMinionFromPlayer(owner, id)
			delete(w.Minions, id)
		}
	}
}

func (w *GameWorld) minionShoot(m *Minion, owner *Player) {
	var target *Mob
	var minDist float64 = -1
	for _, mob := range w.Mobs {
		distSq := mob.Pos.Sub(m.Pos).LengthSq()
		if minDist < 0 || distSq < minDist {
			minDist = distSq
			target = mob
		}
	}
	if target != nil && minDist < 350*350 {
		dir := target.Pos.Sub(m.Pos).Normalize()
		bID := w.GenerateID()
		b := w.bulletPool.Get().(*Bullet)
		*b = Bullet{}
		b.ID = bID
		b.OwnerID = m.OwnerID
		b.OwnerType = 2
		b.Pos = m.Pos.Add(dir.Mul(m.Radius + 3))
		b.Vel = dir.Mul(12.0)
		b.Radius = 6
		b.Damage = m.Damage
		b.Lifetime = 1.5
		b.Pierce = 1 + int(owner.StatMinionPierce)
		w.Bullets[bID] = b
	}
}

func (w *GameWorld) removeMinionFromPlayer(p *Player, mID uint16) {
	for i, id := range p.MinionIDs {
		if id == mID {
			p.MinionIDs = append(p.MinionIDs[:i], p.MinionIDs[i+1:]...)
			break
		}
	}
}

func (w *GameWorld) spawnMinion(ownerID uint16, pos physics.Vector2D) {
	owner, ok := w.Players[ownerID]
	if !ok {
		return
	}
	maxLimit := 1000
	if len(owner.MinionIDs) >= maxLimit {
		oldID := owner.MinionIDs[0]
		w.removeMinionFromPlayer(owner, oldID)
		delete(w.Minions, oldID)
	}

	mID := w.GenerateID()
	minionMaxHP := 35.0 + float64(owner.StatMinionHP)*10.0
	minion := &Minion{
		ID:        mID,
		OwnerID:   ownerID,
		Pos:       pos,
		Radius:    12,
		Health:    minionMaxHP,
		MaxHealth: minionMaxHP,
		Damage:    10.0 + float64(owner.StatMinionDmg)*3.0,
	}
	w.Minions[mID] = minion
	owner.MinionIDs = append(owner.MinionIDs, mID)
}

func (w *GameWorld) updateOrbs(dt float64) {
	for id, o := range w.Orbs {
		if o.AttractTarget != 0 {
			p, ok := w.Players[o.AttractTarget]
			if !ok || !p.Alive {
				o.AttractTarget = 0
			} else {
				dir := p.Pos.Sub(o.Pos).Normalize()
				o.Vel = o.Vel.Add(dir.Mul(0.85)).Normalize().Mul(8.5)
				o.Pos = o.Pos.Add(o.Vel)
			}
		} else {
			for _, p := range w.Players {
				if !p.Alive {
					continue
				}
				distSq := p.Pos.Sub(o.Pos).LengthSq()
				if distSq < 160*160 {
					o.AttractTarget = p.ID
					break
				}
			}
		}
		if o.Pos.X < 0 || o.Pos.X > w.Width || o.Pos.Y < 0 || o.Pos.Y > w.Height {
			w.orbPool.Put(o)
			delete(w.Orbs, id)
		}
	}
}

func (w *GameWorld) resolveCollisionsOptimized() {
	for r := 0; r < 20; r++ {
		for c := 0; c < 20; c++ {
			items := w.grid[r][c]
			if len(items) == 0 {
				continue
			}

			var neighbors []HashItem
			for dr := -1; dr <= 1; dr++ {
				for dc := -1; dc <= 1; dc++ {
					nr, nc := r+dr, c+dc
					if nr >= 0 && nr < 20 && nc >= 0 && nc < 20 {
						neighbors = append(neighbors, w.grid[nr][nc]...)
					}
				}
			}

			for i := 0; i < len(items); i++ {
				itemA := items[i]

				for j := 0; j < len(neighbors); j++ {
					itemB := neighbors[j]
					if itemA.ID == itemB.ID && itemA.Type == itemB.Type {
						continue
					}

					distSq := itemA.Pos.Sub(itemB.Pos).LengthSq()
					minDist := itemA.Radius + itemB.Radius
					if distSq >= minDist*minDist {
						continue
					}

					w.handleCollisionPair(itemA, itemB)
				}
			}
		}
	}
}

func (w *GameWorld) handleCollisionPair(a, b HashItem) {
	if a.Type == 1 && b.Type == 1 {
		m1, ok1 := w.Mobs[a.ID]
		m2, ok2 := w.Mobs[b.ID]
		if ok1 && ok2 {
			physics.ResolveCircleCircle(&m1.Pos, &m2.Pos, m1.Radius, m2.Radius, &m1.Vel, &m2.Vel, 1.0, 1.0, 0.15)
		}
		return
	}

	if a.Type == 0 && b.Type == 1 {
		p, ok1 := w.Players[a.ID]
		m, ok2 := w.Mobs[b.ID]
		if ok1 && ok2 && p.Alive {
			relVelStart := p.Vel.Sub(m.Vel).Length()
			if physics.ResolveCircleCircle(&p.Pos, &m.Pos, p.Radius, m.Radius, &p.Vel, &m.Vel, p.Mass, 1.0, 0.3) {
				kineticEnergy := 0.5 * p.Mass * (relVelStart * relVelStart)
				if p.ClassID == 1 && relVelStart > 100.0 {
					m.Health -= kineticEnergy * 0.005
				}
				p.Health -= m.Damage * 0.12
				m.Health -= p.Radius * 0.25
				if m.Type == 2 {
					p.Health -= m.Damage * 0.5
					m.Health = 0
				}
			}
		}
		return
	}

	if a.Type == 2 && b.Type == 1 {
		bullet, ok1 := w.Bullets[a.ID]
		m, ok2 := w.Mobs[b.ID]
		if ok1 && ok2 {
			if bullet.OwnerType == 0 || bullet.OwnerType == 2 {
				m.Health -= bullet.Damage
				m.Vel = m.Vel.Add(bullet.Vel.Normalize().Mul(1.8))
				bullet.Pierce--
				if bullet.Pierce <= 0 {
					bullet.Lifetime = 0
				}
				if m.Health <= 0 {
					w.spawnMinion(bullet.OwnerID, m.Pos)
				}
			}
		}
		return
	}

	if a.Type == 2 && b.Type == 0 {
		bullet, ok1 := w.Bullets[a.ID]
		p, ok2 := w.Players[b.ID]
		if ok1 && ok2 && p.Alive {
			if bullet.OwnerType == 1 {
				p.Health -= bullet.Damage
				p.Vel = p.Vel.Add(bullet.Vel.Normalize().Mul(0.8))
				bullet.Lifetime = 0
			}
		}
		return
	}

	if a.Type == 4 && b.Type == 1 {
		minion, ok1 := w.Minions[a.ID]
		m, ok2 := w.Mobs[b.ID]
		if ok1 && ok2 {
			if physics.ResolveCircleCircle(&minion.Pos, &m.Pos, minion.Radius, m.Radius, &minion.Vel, &m.Vel, 1.0, 1.0, 0.25) {
				m.Health -= minion.Damage
				minion.Health -= m.Damage * 0.4
				if m.Type == 2 {
					minion.Health = 0
					m.Health = 0
				}
			}
		}
		return
	}

	if a.Type == 0 && b.Type == 3 {
		p, ok1 := w.Players[a.ID]
		o, ok2 := w.Orbs[b.ID]
		if ok1 && ok2 && p.Alive {
			p.XP += o.XPValue
			p.Score += uint32(o.XPValue)
			for p.XP >= p.MaxXP {
				p.XP -= p.MaxXP
				p.Level++
				p.MaxXP = uint32(float64(p.MaxXP) * 1.3)
				p.Health = p.MaxHealth
				p.UpgradePoints++
			}
			w.orbPool.Put(o)
			delete(w.Orbs, b.ID)
		}
		return
	}
}

func (w *GameWorld) ExportState() []protocol.EntityState {
	var states []protocol.EntityState
	for _, p := range w.Players {
		if !p.Alive {
			continue
		}
		states = append(states, protocol.EntityState{
			ID:        p.ID,
			Type:      0,
			Subtype:   p.ClassID,
			X:         float32(p.Pos.X),
			Y:         float32(p.Pos.Y),
			Angle:     float32(p.MouseAngle),
			Health:    uint16(math.Max(0, p.Health)),
			MaxHealth: uint16(p.MaxHealth),
			Radius:    uint16(p.Radius),
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
		})
	}
	for _, b := range w.Bullets {
		states = append(states, protocol.EntityState{
			ID:        b.ID,
			Type:      2,
			Subtype:   b.OwnerType,
			X:         float32(b.Pos.X),
			Y:         float32(b.Pos.Y),
			Angle:     0,
			Health:    1,
			MaxHealth: 1,
			Radius:    uint16(b.Radius),
		})
	}
	for _, o := range w.Orbs {
		states = append(states, protocol.EntityState{
			ID:        o.ID,
			Type:      3,
			Subtype:   0,
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
	return states
}
