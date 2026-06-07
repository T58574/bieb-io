package game

import (
	"math"

	"go-server/physics"
)

type HashItem struct {
	ID        uint16
	Type      uint8
	Pos       physics.Vector2D
	PrevPos   physics.Vector2D
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
		w.insertBulletToGrid(b)
	}

	for _, minion := range w.Minions {
		w.insertToGrid(HashItem{ID: minion.ID, Type: 4, Pos: minion.Pos, Radius: minion.Radius, Damage: minion.Damage})
	}
	for _, ld := range w.LootDrops {
		w.insertToGrid(HashItem{ID: ld.ID, Type: 6, Pos: ld.Pos, Radius: ld.Radius})
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

func (w *GameWorld) insertBulletToGrid(b *Bullet) {
	diff := b.Pos.Sub(b.PrevPos)
	dist := diff.Length()
	item := HashItem{
		ID:        b.ID,
		Type:      2,
		Pos:       b.Pos,
		PrevPos:   b.PrevPos,
		Radius:    b.Radius,
		Damage:    b.Damage,
		OwnerID:   b.OwnerID,
		OwnerType: b.OwnerType,
	}
	if dist <= 40.0 {
		w.insertToGrid(item)
		return
	}
	steps := int(math.Ceil(dist / 40.0))
	lastCol, lastRow := -1, -1
	for i := 0; i <= steps; i++ {
		t := float64(i) / float64(steps)
		pt := b.PrevPos.Add(diff.Mul(t))
		col := int(pt.X / 100.0)
		row := int(pt.Y / 100.0)
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
		if col != lastCol || row != lastRow {
			w.grid[row][col] = append(w.grid[row][col], item)
			lastCol, lastRow = col, row
		}
	}
}

func checkCollisionSegmentCircle(s0, s1 physics.Vector2D, rS float64, c physics.Vector2D, rC float64) bool {
	v := s1.Sub(s0)
	w := c.Sub(s0)
	c1 := w.Dot(v)
	var distSq float64
	if c1 <= 0 {
		distSq = w.LengthSq()
	} else {
		c2 := v.Dot(v)
		if c2 <= c1 {
			distSq = c.Sub(s1).LengthSq()
		} else {
			b := c1 / c2
			pb := s0.Add(v.Mul(b))
			distSq = c.Sub(pb).LengthSq()
		}
	}
	minDist := rS + rC
	return distSq < minDist*minDist
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
					collided := false
					if itemA.Type == 2 && itemB.Type != 2 {
						collided = checkCollisionSegmentCircle(itemA.PrevPos, itemA.Pos, itemA.Radius, itemB.Pos, itemB.Radius)
					} else if itemB.Type == 2 && itemA.Type != 2 {
						collided = checkCollisionSegmentCircle(itemB.PrevPos, itemB.Pos, itemB.Radius, itemA.Pos, itemA.Radius)
					} else {
						distSq := itemA.Pos.Sub(itemB.Pos).LengthSq()
						minDist := itemA.Radius + itemB.Radius
						collided = distSq < minDist*minDist
					}
					if !collided {
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
				dmgKinetic := 0.5 * p.Mass * (relVelStart * relVelStart) * 0.005
				dmgMelee := p.Radius * 0.25
				if m.Modifiers&8 != 0 {
					dmgKinetic *= 0.7
					dmgMelee *= 0.7
				}
				m.Health -= dmgMelee
				if m.Health <= 0 {
					m.KillerID = p.ID
					w.triggerOnKillEffects(p.ID, m)
				}
				if m.Type == 2 {
					m.Health = 0
				}
				dmgToPlayer := m.Damage * 0.12 * (1.0 - math.Min(0.5, float64(p.StatCritDefiance)*0.05))
				if len(p.MinionIDs) > 0 {
					droneID := p.MinionIDs[0]
					if drone, okD := w.Minions[droneID]; okD {
						drone.Health -= dmgToPlayer
						dmgToPlayer = 0
					}
				}
				p.Health -= dmgToPlayer
			}
		}
		return
	}
	if a.Type == 2 && b.Type == 1 {
		bullet, ok1 := w.Bullets[a.ID]
		m, ok2 := w.Mobs[b.ID]
		if ok1 && ok2 {
			if bullet.Lifetime <= 0 || bullet.Pierce <= 0 {
				return
			}
			if bullet.OwnerType == 0 || bullet.OwnerType == 2 {
				dmg := bullet.Damage
				if m.Modifiers&8 != 0 {
					dmg *= 0.7
				}
				isCrit := false
				critChance := 0.20
				critMultiplier := 2.0
				if p, okP := w.Players[bullet.OwnerID]; okP && p.Alive {
					critChance += float64(p.StatCritChance) * 0.05
					critMultiplier += float64(p.StatCritDamage) * 0.05
				}

				if bullet.Subtype == 2 && w.rand.Float64() < critChance {
					isCrit = true
					dmg *= critMultiplier
				}
				m.Health -= dmg
				if m.Health <= 0 && bullet.OwnerType == 0 {
					m.KillerID = bullet.OwnerID
					w.triggerOnKillEffects(bullet.OwnerID, m)
				}
				m.Vel = m.Vel.Add(bullet.Vel.Normalize().Mul(1.8))
				if bullet.OwnerType == 0 {
					p, okP := w.Players[bullet.OwnerID]
					if okP && p.Alive {
						vampPercent := p.Vampirism
						if count, ok := p.Inventory[2]; ok {
							vampPercent += 0.05 * float64(count)
						}
						if vampPercent > 0 {
							p.Health = math.Min(p.MaxHealth, p.Health+dmg*vampPercent)
						}
						if bullet.Subtype == 1 {
							p.LaserHitsCount[m.ID]++
							if p.LaserHitsCount[m.ID] >= 3 {
								p.LaserHitsCount[m.ID] = 0
								for _, otherMob := range w.Mobs {
									distSq := otherMob.Pos.Sub(m.Pos).LengthSq()
									if distSq < 120.0*120.0 {
										otherMob.Health -= 25.0
									}
								}
							}
						}
						if isCrit {
							var targets []*Mob
							for _, otherMob := range w.Mobs {
								if otherMob.ID == m.ID {
									continue
								}
								distSq := otherMob.Pos.Sub(m.Pos).LengthSq()
								if distSq < 300.0*300.0 {
									targets = append(targets, otherMob)
								}
							}
							w.rand.Shuffle(len(targets), func(i, j int) {
								targets[i], targets[j] = targets[j], targets[i]
							})
							limit := 3
							if len(targets) < limit {
								limit = len(targets)
							}
							for k := 0; k < limit; k++ {
								targets[k].Health -= 15.0
							}
						}
						if bullet.Subtype == 3 {
							m.Modifiers |= 16
						}
					}
				}
				bullet.Pierce--
				if bullet.Pierce <= 0 {
					bullet.Lifetime = 0
				}
			}
		}
		return
	}
	if a.Type == 2 && b.Type == 0 {
		bullet, ok1 := w.Bullets[a.ID]
		p, ok2 := w.Players[b.ID]
		if ok1 && ok2 && p.Alive {
			if bullet.Lifetime <= 0 || bullet.Pierce <= 0 {
				return
			}
			if bullet.OwnerType == 1 {
				dmgToPlayer := bullet.Damage * (1.0 - math.Min(0.5, float64(p.StatCritDefiance)*0.05))
				if len(p.MinionIDs) > 0 {
					droneID := p.MinionIDs[0]
					if drone, okD := w.Minions[droneID]; okD {
						drone.Health -= dmgToPlayer
						dmgToPlayer = 0
					}
				}
				p.Health -= dmgToPlayer
				p.Vel = p.Vel.Add(bullet.Vel.Normalize().Mul(0.8))
				bullet.Lifetime = 0
			}
		}
		return
	}
	if a.Type == 2 && b.Type == 4 {
		bullet, ok1 := w.Bullets[a.ID]
		minion, ok2 := w.Minions[b.ID]
		if ok1 && ok2 {
			if bullet.Lifetime <= 0 || bullet.Pierce <= 0 {
				return
			}
			if bullet.OwnerType == 1 {
				minion.Health -= bullet.Damage
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

	if a.Type == 0 && b.Type == 6 {
		p, ok1 := w.Players[a.ID]
		ld, ok2 := w.LootDrops[b.ID]
		if ok1 && ok2 && p.Alive {
			p.Inventory[uint16(ld.ItemID)]++
			p.invDirty = true
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, b.ID)
			delete(w.LootDrops, b.ID)
		}
		return
	}
}

func (w *GameWorld) triggerOnKillEffects(killerID uint16, deadMob *Mob) {
	killer, ok := w.Players[killerID]
	if !ok || !killer.Alive {
		return
	}
	for itemID, count := range killer.Inventory {
		if count <= 0 {
			continue
		}
		if mod, ok := GetItemModifier(itemID); ok {
			if mod.OnKillEffectTrigger == TRIGGER_AREA_EXPLOSION {
				for _, otherMob := range w.Mobs {
					if otherMob.ID == deadMob.ID {
						continue
					}
					distSq := otherMob.Pos.Sub(deadMob.Pos).LengthSq()
					if distSq < 140.0*140.0 {
						otherMob.Health -= 35.0 * float64(count)
					}
				}
			}
		}
	}
}
