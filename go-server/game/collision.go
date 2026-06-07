package game

import (
	"go-server/physics"
)

type HashItem struct {
	ID        uint16
	Type      uint8
	Pos       physics.Vector2D
	Radius    float64
	Damage    float64
	OwnerID   uint16
	OwnerType uint8
}

func (w *GameWorld) rebuildSpatialGrid() {
	for r := 0; r < 60; r++ {
		for c := 0; c < 60; c++ {
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
	} else if col >= 60 {
		col = 59
	}
	if row < 0 {
		row = 0
	} else if row >= 60 {
		row = 59
	}
	w.grid[row][col] = append(w.grid[row][col], item)
}

func (w *GameWorld) resolveCollisionsOptimized() {
	for r := 0; r < 60; r++ {
		for c := 0; c < 60; c++ {
			items := w.grid[r][c]
			if len(items) == 0 {
				continue
			}
			var neighbors []HashItem
			for dr := -1; dr <= 1; dr++ {
				for dc := -1; dc <= 1; dc++ {
					nr, nc := r+dr, c+dc
					if nr >= 0 && nr < 60 && nc >= 0 && nc < 60 {
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
				dmgKinetic := kineticEnergy * 0.005
				dmgMelee := p.Radius * 0.25
				if m.Modifiers&8 != 0 {
					dmgKinetic *= 0.7
					dmgMelee *= 0.7
				}
				if p.ClassID == 1 && relVelStart > 100.0 {
					m.Health -= dmgKinetic
				}
				p.Health -= m.Damage * 0.12
				m.Health -= dmgMelee
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
				dmg := bullet.Damage
				if m.Modifiers&8 != 0 {
					dmg *= 0.7
				}
				m.Health -= dmg
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
				dmg := minion.Damage
				if m.Modifiers&8 != 0 {
					dmg *= 0.7
				}
				m.Health -= dmg
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
			if !(p.Level >= 10 && p.ClassID == 0) {
				p.XP += o.XPValue
				p.Score += uint32(o.XPValue)
				for p.XP >= p.MaxXP {
					p.XP -= p.MaxXP
					p.Level++
					p.MaxXP = uint32(float64(p.MaxXP) * 1.3)
					p.Health = p.MaxHealth
					p.UpgradePoints++
				}
			}
			p.FlashTimer = 0.12
			p.StateFlags |= 2

			w.orbPool.Put(o)
			delete(w.Orbs, b.ID)
		}
		return
	}
}
