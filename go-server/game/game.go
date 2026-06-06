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
	ID             uint16
	Username       string
	Pos            physics.Vector2D
	Vel            physics.Vector2D
	Radius         float64
	Health         float64
	MaxHealth      float64
	XP             uint32
	MaxXP          uint32
	Level          uint16
	Score          uint32
	MouseAngle     float64
	ShootCooldown  float64
	Keys           uint8
	UpgradeSelect  uint8
	MinionIDs      []uint16
	ClassType      uint8
	PendingUpgrade bool
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
	Players     map[uint16]*Player
	Mobs        map[uint16]*Mob
	Bullets     map[uint16]*Bullet
	Orbs        map[uint16]*ExpOrb
	Minions     map[uint16]*Minion
	nextID      uint16
	Width       float64
	Height      float64
	mu          sync.RWMutex
	rand        *rand.Rand
	SpawnTimer  float64
	ElapsedTime float64
	WaveNumber  uint32
	bulletPool  sync.Pool
	mobPool     sync.Pool
	orbPool     sync.Pool
	grid        [20][20][]HashItem
	inputChan   chan InputEvent
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
		WaveNumber: 1,
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
	}
	w.Players[id] = p
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

func (w *GameWorld) applyUpgrade(p *Player, choice uint8) {
	p.ClassType = choice
	p.PendingUpgrade = false
}

func (w *GameWorld) processInputs() {
	for {
		select {
		case ev := <-w.inputChan:
			p, exists := w.Players[ev.PlayerID]
			if exists {
				p.Keys = ev.Keys
				p.MouseAngle = float64(ev.Angle)
				if ev.Upgrade != 0 && p.PendingUpgrade {
					w.applyUpgrade(p, ev.Upgrade)
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
	w.WaveNumber = uint32(w.ElapsedTime/30.0) + 1

	w.updateSpawning(dt)
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

func (w *GameWorld) updateSpawning(dt float64) {
	w.SpawnTimer += dt
	if w.SpawnTimer >= 1.0 {
		w.SpawnTimer = 0
		maxMobs := int(10 + w.WaveNumber*5)
		if len(w.Mobs) < maxMobs {
			w.spawnMobCluster()
		}
	}
}

func (w *GameWorld) spawnMobCluster() {
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
	if mobType == 3 {
		for i := 0; i < 5; i++ {
			id := w.GenerateID()
			m := w.mobPool.Get().(*Mob)
			*m = Mob{}
			m.ID = id
			m.Type = 3
			m.Pos = physics.Vector2D{X: rx + w.rand.Float64()*40 - 20, Y: ry + w.rand.Float64()*40 - 20}
			m.Radius = 10
			m.Health = 5 * (1.0 + 0.2*float64(w.WaveNumber-1))
			m.MaxHealth = 5 * (1.0 + 0.2*float64(w.WaveNumber-1))
			m.Damage = 4 * (1.0 + 0.15*float64(w.WaveNumber-1))
			m.XPValue = 10
			w.Mobs[id] = m
		}
	} else {
		id := w.GenerateID()
		var hp, rad, dmg float64
		var xpVal uint32
		switch mobType {
		case 0:
			hp = 20 * (1.0 + 0.3*float64(w.WaveNumber-1))
			rad = 16
			dmg = 5 * (1.0 + 0.2*float64(w.WaveNumber-1))
			xpVal = 15
		case 1:
			hp = 40 * (1.0 + 0.3*float64(w.WaveNumber-1))
			rad = 22
			dmg = 8 * (1.0 + 0.2*float64(w.WaveNumber-1))
			xpVal = 35
		case 2:
			hp = 15 * (1.0 + 0.3*float64(w.WaveNumber-1))
			rad = 12
			dmg = 15 * (1.0 + 0.2*float64(w.WaveNumber-1))
			xpVal = 25
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
}

func (w *GameWorld) updatePlayers(dt float64) {
	for _, p := range w.Players {
		var ax, ay float64
		if p.Keys&0x01 != 0 {
			ay -= 0.6
		}
		if p.Keys&0x02 != 0 {
			ax -= 0.6
		}
		if p.Keys&0x04 != 0 {
			ay += 0.6
		}
		if p.Keys&0x08 != 0 {
			ax += 0.6
		}

		p.Vel = p.Vel.Add(physics.Vector2D{X: ax, Y: ay})
		p.Vel = p.Vel.Mul(0.88)
		p.Pos = p.Pos.Add(p.Vel)

		physics.ResolveCircleBox(&p.Pos, p.Radius, &p.Vel, 0, 0, w.Width, w.Height, 0.2)

		if p.ShootCooldown > 0 {
			p.ShootCooldown -= dt
		}

		if p.Keys&0x10 != 0 && p.ShootCooldown <= 0 {
			w.playerShoot(p)
		}
	}
}

func (w *GameWorld) playerShoot(p *Player) {
	p.ShootCooldown = 0.22
	bID := w.GenerateID()
	dir := physics.Vector2D{X: math.Cos(p.MouseAngle), Y: math.Sin(p.MouseAngle)}
	bPos := p.Pos.Add(dir.Mul(p.Radius + 5))

	b := w.bulletPool.Get().(*Bullet)
	*b = Bullet{}
	b.ID = bID
	b.OwnerID = p.ID
	b.OwnerType = 0
	b.Pos = bPos
	b.Vel = dir.Mul(14.0).Add(p.Vel.Mul(0.5))
	b.Radius = 8
	b.Damage = 12
	b.Lifetime = 1.8
	w.Bullets[bID] = b
}

func (w *GameWorld) updateMobs(dt float64) {
	for id, m := range w.Mobs {
		var target *Player
		var minDist float64 = -1
		for _, p := range w.Players {
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
				m.Vel = m.Vel.Add(dir.Mul(0.25)).Normalize().Mul(2.5)
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
					m.ShootCooldown = 1.6
					bID := w.GenerateID()
					b := w.bulletPool.Get().(*Bullet)
					*b = Bullet{}
					b.ID = bID
					b.OwnerID = m.ID
					b.OwnerType = 1
					b.Pos = m.Pos.Add(dir.Mul(m.Radius + 5))
					b.Vel = dir.Mul(8.0)
					b.Radius = 7
					b.Damage = 6
					b.Lifetime = 3.0
					w.Bullets[bID] = b
				}
			} else if m.Type == 2 {
				m.Vel = m.Vel.Add(dir.Mul(0.4)).Normalize().Mul(4.8)
			} else if m.Type == 3 {
				m.Vel = m.Vel.Add(dir.Mul(0.35)).Normalize().Mul(3.8)
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
		if !ok {
			delete(w.Minions, id)
			continue
		}

		m.Angle += dt * 2.5
		totalMinions := playerMinionCounts[m.OwnerID]
		if totalMinions == 0 {
			totalMinions = 1
		}

		var targetPos physics.Vector2D
		if owner.ClassType == 3 {
			var baseAngle float64
			idx := 0
			for i, mID := range owner.MinionIDs {
				if mID == id {
					idx = i
					break
				}
			}
			arcWidth := 1.5
			baseAngle = owner.MouseAngle - arcWidth/2.0 + (float64(idx)/float64(totalMinions))*arcWidth
			orbitRadius := owner.Radius + 30.0
			targetPos = owner.Pos.Add(physics.Vector2D{
				X: math.Cos(baseAngle) * orbitRadius,
				Y: math.Sin(baseAngle) * orbitRadius,
			})
		} else {
			var baseAngle float64
			idx := 0
			for i, mID := range owner.MinionIDs {
				if mID == id {
					idx = i
					break
				}
			}
			baseAngle = (float64(idx) / float64(totalMinions)) * 2.0 * math.Pi
			orbitAngle := m.Angle + baseAngle
			orbitRadius := owner.Radius + 38.0
			targetPos = owner.Pos.Add(physics.Vector2D{
				X: math.Cos(orbitAngle) * orbitRadius,
				Y: math.Sin(orbitAngle) * orbitRadius,
			})
		}

		diff := targetPos.Sub(m.Pos)
		m.Vel = diff.Mul(0.18)
		m.Pos = m.Pos.Add(m.Vel)

		if owner.ClassType == 2 {
			m.ShootCooldown -= dt
			if m.ShootCooldown <= 0 {
				m.ShootCooldown = 1.5
				w.minionShoot(m)
			}
		}

		if m.Health <= 0 {
			w.removeMinionFromPlayer(owner, id)
			delete(w.Minions, id)
		}
	}
}

func (w *GameWorld) minionShoot(m *Minion) {
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
		b.Damage = 6
		b.Lifetime = 1.5
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
	maxLimit := 4
	switch owner.ClassType {
	case 1:
		maxLimit = 8
	case 2:
		maxLimit = 4
	case 3:
		maxLimit = 7
	}
	if len(owner.MinionIDs) >= maxLimit {
		oldID := owner.MinionIDs[0]
		w.removeMinionFromPlayer(owner, oldID)
		delete(w.Minions, oldID)
	}

	mID := w.GenerateID()
	dmg := 10.0
	if owner.ClassType == 1 {
		dmg = 13.0
	}
	minion := &Minion{
		ID:        mID,
		OwnerID:   ownerID,
		Pos:       pos,
		Radius:    12,
		Health:    35,
		MaxHealth: 35,
		Damage:    dmg,
	}
	w.Minions[mID] = minion
	owner.MinionIDs = append(owner.MinionIDs, mID)
}

func (w *GameWorld) updateOrbs(dt float64) {
	for id, o := range w.Orbs {
		if o.AttractTarget != 0 {
			p, ok := w.Players[o.AttractTarget]
			if !ok {
				o.AttractTarget = 0
			} else {
				dir := p.Pos.Sub(o.Pos).Normalize()
				o.Vel = o.Vel.Add(dir.Mul(0.85)).Normalize().Mul(8.5)
				o.Pos = o.Pos.Add(o.Vel)
			}
		} else {
			for _, p := range w.Players {
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
			physics.ResolveCircleCircle(&m1.Pos, &m2.Pos, m1.Radius, m2.Radius, &m1.Vel, &m2.Vel, 0.15)
		}
		return
	}

	if a.Type == 0 && b.Type == 1 {
		p, ok1 := w.Players[a.ID]
		m, ok2 := w.Mobs[b.ID]
		if ok1 && ok2 {
			if physics.ResolveCircleCircle(&p.Pos, &m.Pos, p.Radius, m.Radius, &p.Vel, &m.Vel, 0.3) {
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
				bullet.Lifetime = 0
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
		if ok1 && ok2 {
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
			if physics.ResolveCircleCircle(&minion.Pos, &m.Pos, minion.Radius, m.Radius, &minion.Vel, &m.Vel, 0.25) {
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
		if ok1 && ok2 {
			p.XP += o.XPValue
			p.Score += uint32(o.XPValue)
			for p.XP >= p.MaxXP {
				p.XP -= p.MaxXP
				p.Level++
				p.MaxXP = uint32(float64(p.MaxXP) * 1.3)
				p.Health = p.MaxHealth
				if p.Level == 5 || p.Level == 10 || p.Level == 15 {
					p.PendingUpgrade = true
				}
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
		states = append(states, protocol.EntityState{
			ID:        p.ID,
			Type:      0,
			Subtype:   p.ClassType,
			X:         float32(p.Pos.X),
			Y:         float32(p.Pos.Y),
			Angle:     float32(p.MouseAngle),
			Health:    uint16(math.Max(0, p.Health)),
			MaxHealth: uint16(p.MaxHealth),
			Radius:    uint16(p.Radius),
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
