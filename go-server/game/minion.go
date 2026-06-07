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
	mCfg := GetMinionConfig()
	playerMinionCounts := make(map[uint16]int)
	for _, m := range w.Minions {
		playerMinionCounts[m.OwnerID]++
	}
	for id, m := range w.Minions {
		owner, ok := w.Players[m.OwnerID]
		if !ok || !owner.Alive {
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.Minions, id)
			continue
		}
		if m.HasLifetime {
			m.Lifetime -= dt
			if m.Lifetime <= 0 {
				w.removeMinionFromPlayer(owner, id)
				w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
				delete(w.Minions, id)
				continue
			}
		}
		m.Angle += dt * mCfg.OrbitAngularSpeed
		totalMinions := playerMinionCounts[m.OwnerID]
		if totalMinions == 0 {
			totalMinions = 1
		}
		baseAngle := (float64(m.OrbitIndex) / float64(totalMinions)) * 2.0 * math.Pi
		orbitAngle := m.Angle + baseAngle
		orbitRadius := owner.Radius + mCfg.OrbitOffset
		targetPos := owner.Pos.Add(physics.Vector2D{
			X: math.Cos(orbitAngle) * orbitRadius,
			Y: math.Sin(orbitAngle) * orbitRadius,
		})
		speedMul := 1.0 + float64(owner.StatMinionSpeed)*mCfg.SpeedPerLevel
		diff := targetPos.Sub(m.Pos)
		m.Vel = diff.Mul(mCfg.FollowSpeed * speedMul)
		m.Pos = m.Pos.Add(m.Vel)

		var itemMinionDmg, itemMinionHP float64
		for itemID, count := range owner.Inventory {
			if count > 0 {
				if mod, ok := GetItemModifier(itemID); ok {
					itemMinionDmg += mod.StatModifiers.MinionDamage * float64(count)
					itemMinionHP += mod.StatModifiers.MinionHP * float64(count)
				}
			}
		}

		m.Damage = (mCfg.BaseDamage + float64(owner.StatMinionDmg)*mCfg.DamagePerLevel) * (1.0 + itemMinionDmg)
		m.MaxHealth = (mCfg.BaseHP + float64(owner.StatMinionHP)*mCfg.HPPerLevel) * (1.0 + itemMinionHP)
		m.ShootCooldown -= dt
		if m.ShootCooldown <= 0 {
			m.ShootCooldown = mCfg.ShootCooldown
			w.minionShoot(m, owner)
		}
		if owner.StatMinionRegen > 0 && m.Health < m.MaxHealth {
			regenRate := float64(owner.StatMinionRegen) * mCfg.RegenPerLevel
			m.RegenAccum += regenRate * dt
			if m.RegenAccum >= 1.0 {
				heal := math.Floor(m.RegenAccum)
				m.Health = math.Min(m.MaxHealth, m.Health+heal)
				m.RegenAccum -= heal
			}
		}
		if m.Health <= 0 {
			w.removeMinionFromPlayer(owner, id)
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.Minions, id)
		}
	}
}

func (w *GameWorld) minionShoot(m *Minion, owner *Player) {
	mCfg := GetMinionConfig()
	var target *Mob
	var minDist float64 = -1
	for _, mob := range w.Mobs {
		distSq := mob.Pos.Sub(m.Pos).LengthSq()
		if minDist < 0 || distSq < minDist {
			minDist = distSq
			target = mob
		}
	}
	shootRangeSq := mCfg.ShootRange * mCfg.ShootRange
	if target != nil && minDist < shootRangeSq {
		dir := target.Pos.Sub(m.Pos).Normalize()
		bID := w.GenerateID()
		b := w.bulletPool.Get().(*Bullet)
		*b = Bullet{}
		b.ID = bID
		b.OwnerID = m.OwnerID
		b.OwnerType = 2
		b.Subtype = mCfg.BulletSubtype
		b.Pos = m.Pos.Add(dir.Mul(m.Radius + 3))
		b.PrevPos = b.Pos
		b.Vel = dir.Mul(mCfg.BulletSpeed)
		b.Radius = mCfg.BulletRadius
		b.Damage = m.Damage
		b.Lifetime = mCfg.BulletLifetime
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
	mCfg := GetMinionConfig()
	if len(owner.MinionIDs) >= mCfg.MaxLimit {
		oldID := owner.MinionIDs[0]
		w.removeMinionFromPlayer(owner, oldID)
		w.RemovedEntityIDs = append(w.RemovedEntityIDs, oldID)
		delete(w.Minions, oldID)
	}
	mID := w.GenerateID()
	minionMaxHP := mCfg.BaseHP + float64(owner.StatMinionHP)*mCfg.HPPerLevel
	minion := &Minion{
		ID:         mID,
		OwnerID:    ownerID,
		Pos:        pos,
		Radius:     mCfg.Radius,
		Health:     minionMaxHP,
		MaxHealth:  minionMaxHP,
		Damage:     mCfg.BaseDamage + float64(owner.StatMinionDmg)*mCfg.DamagePerLevel,
		OrbitIndex: len(owner.MinionIDs),
	}
	w.Minions[mID] = minion
	owner.MinionIDs = append(owner.MinionIDs, mID)
}
