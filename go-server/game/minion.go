package game

import (
	"math"

	"go-server/physics"
)

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
	OrbitIndex    int
	Lifetime      float64
	HasLifetime   bool
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
		if m.HasLifetime {
			m.Lifetime -= dt
			if m.Lifetime <= 0 {
				w.removeMinionFromPlayer(owner, id)
				delete(w.Minions, id)
				continue
			}
		}
		m.Angle += dt * 2.5
		totalMinions := playerMinionCounts[m.OwnerID]
		if totalMinions == 0 {
			totalMinions = 1
		}
		baseAngle := (float64(m.OrbitIndex) / float64(totalMinions)) * 2.0 * math.Pi
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
		b.Subtype = 4
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
			for j := i; j < len(p.MinionIDs); j++ {
				if m, ok := w.Minions[p.MinionIDs[j]]; ok {
					m.OrbitIndex = j
				}
			}
			break
		}
	}
}

func (w *GameWorld) spawnMinion(ownerID uint16, pos physics.Vector2D) {
	owner, ok := w.Players[ownerID]
	if !ok {
		return
	}
	maxLimit := 64
	if len(owner.MinionIDs) >= maxLimit {
		oldID := owner.MinionIDs[0]
		w.removeMinionFromPlayer(owner, oldID)
		delete(w.Minions, oldID)
	}
	mID := w.GenerateID()
	minionMaxHP := 35.0 + float64(owner.StatMinionHP)*10.0
	minion := &Minion{
		ID:         mID,
		OwnerID:    ownerID,
		Pos:        pos,
		Radius:     12,
		Health:     minionMaxHP,
		MaxHealth:  minionMaxHP,
		Damage:     10.0 + float64(owner.StatMinionDmg)*3.0,
		OrbitIndex: len(owner.MinionIDs),
	}
	w.Minions[mID] = minion
	owner.MinionIDs = append(owner.MinionIDs, mID)
}
