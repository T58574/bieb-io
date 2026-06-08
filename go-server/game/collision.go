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
	worldCfg := GetWorldConfig()
	gridSize := worldCfg.GridSize
	for r := 0; r < gridSize; r++ {
		for c := 0; c < gridSize; c++ {
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
	worldCfg := GetWorldConfig()
	cellSize := worldCfg.CellSize
	gridSize := worldCfg.GridSize
	col := int(item.Pos.X / cellSize)
	row := int(item.Pos.Y / cellSize)
	if col < 0 {
		col = 0
	} else if col >= gridSize {
		col = gridSize - 1
	}
	if row < 0 {
		row = 0
	} else if row >= gridSize {
		row = gridSize - 1
	}
	w.grid[row][col] = append(w.grid[row][col], item)
}

func (w *GameWorld) insertBulletToGrid(b *Bullet) {
	worldCfg := GetWorldConfig()
	cellSize := worldCfg.CellSize
	gridSize := worldCfg.GridSize
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
		col := int(pt.X / cellSize)
		row := int(pt.Y / cellSize)
		if col < 0 {
			col = 0
		} else if col >= gridSize {
			col = gridSize - 1
		}
		if row < 0 {
			row = 0
		} else if row >= gridSize {
			row = gridSize - 1
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
	worldCfg := GetWorldConfig()
	gridSize := worldCfg.GridSize
	for r := 0; r < gridSize; r++ {
		for c := 0; c < gridSize; c++ {
			items := w.grid[r][c]
			if len(items) == 0 {
				continue
			}
			var neighbors []HashItem
			for dr := -1; dr <= 1; dr++ {
				for dc := -1; dc <= 1; dc++ {
					nr, nc := r+dr, c+dc
					if nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize {
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
		w.handleMobMobCollision(a, b)
		return
	}
	if a.Type == 0 && b.Type == 1 {
		w.handlePlayerMobCollision(a, b)
		return
	}
	if a.Type == 2 && b.Type == 1 {
		w.handleBulletMobCollision(a, b)
		return
	}
	if a.Type == 2 && b.Type == 0 {
		w.handleBulletPlayerCollision(a, b)
		return
	}
	if a.Type == 2 && b.Type == 4 {
		w.handleBulletMinionCollision(a, b)
		return
	}
	if a.Type == 4 && b.Type == 1 {
		w.handleMinionMobCollision(a, b)
		return
	}
	if a.Type == 0 && b.Type == 6 {
		w.handlePlayerLootCollision(a, b)
		return
	}
}

func (w *GameWorld) handleMobMobCollision(a, b HashItem) {
	m1, ok1 := w.Mobs[a.ID]
	m2, ok2 := w.Mobs[b.ID]
	if ok1 && ok2 {
		physics.ResolveCircleCircle(
			physics.Circle{Pos: &m1.Pos, Vel: &m1.Vel, Radius: m1.Radius, Mass: 1.0},
			physics.Circle{Pos: &m2.Pos, Vel: &m2.Vel, Radius: m2.Radius, Mass: 1.0},
			0.15,
		)
	}
}

func (w *GameWorld) handlePlayerMobCollision(a, b HashItem) {
	combatCfg := GetCombatConfig()
	rarityCfg := GetRarityConfig()
	p, ok1 := w.Players[a.ID]
	m, ok2 := w.Mobs[b.ID]
	if ok1 && ok2 && p.Alive {
		relVelStart := p.Vel.Sub(m.Vel).Length()
		c1 := physics.Circle{Pos: &p.Pos, Vel: &p.Vel, Radius: p.Radius, Mass: p.Mass}
		c2 := physics.Circle{Pos: &m.Pos, Vel: &m.Vel, Radius: m.Radius, Mass: 1.0}
		if physics.ResolveCircleCircle(c1, c2, 0.3) {
			dmgKinetic := 0.5 * p.Mass * (relVelStart * relVelStart) * combatCfg.KineticDamageFactor
			dmgMelee := p.Radius * combatCfg.MeleeDamageRadiusFactor
			if armorMod, ok := rarityCfg.Modifiers["armor"]; ok {
				if m.Modifiers&(1<<armorMod.Bit) != 0 {
					dmgKinetic *= armorMod.DamageReduction
					dmgMelee *= armorMod.DamageReduction
				}
			}
			_ = dmgKinetic
			m.Health -= dmgMelee
			if p.StatThorns > 0 {
				m.Health -= float64(p.StatThorns) * 10.0
			}
			if m.Health <= 0 {
				m.KillerID = p.ID
				w.triggerOnKillEffects(p.ID, m)
			}
			if m.Type == 2 {
				m.Health = 0
			}
			dmgToPlayer := m.Damage * combatCfg.MeleeContactDamageMultiplier * (1.0 - math.Min(combatCfg.MaxDefianceReduction, float64(p.StatCritDefiance)*combatCfg.DefiancePerLevel))

			var armor float64
			for itemID, count := range p.Inventory {
				if count > 0 {
					if mod, ok := GetItemModifier(itemID); ok {
						armor += mod.StatModifiers.Armor * float64(count)
					}
				}
			}
			if p.ClassID == 4 && p.SkillDuration > 0 {
				armor += 150.0
			}
			if armor > 0 {
				dmgToPlayer *= (100.0 / (100.0 + armor))
			}

			if p.ClassID == 0 && p.SkillDuration > 0 {
				dmgToPlayer = 0
			}

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
}

func (w *GameWorld) handleBulletMobCollision(a, b HashItem) {
	combatCfg := GetCombatConfig()
	rarityCfg := GetRarityConfig()
	bullet, ok1 := w.Bullets[a.ID]
	m, ok2 := w.Mobs[b.ID]
	if ok1 && ok2 {
		if bullet.Lifetime <= 0 || bullet.Pierce <= 0 {
			return
		}
		if bullet.OwnerType == 0 || bullet.OwnerType == 2 {
			dmg := bullet.Damage
			if armorMod, ok := rarityCfg.Modifiers["armor"]; ok {
				if m.Modifiers&(1<<armorMod.Bit) != 0 {
					dmg *= armorMod.DamageReduction
				}
			}
			isCrit := false
			critChance := combatCfg.BaseCritChance
			critMultiplier := combatCfg.BaseCritMultiplier
			if p, okP := w.Players[bullet.OwnerID]; okP && p.Alive {
				critChance += float64(p.StatCritChance) * combatCfg.CritChancePerLevel
				critMultiplier += float64(p.StatCritDamage) * combatCfg.CritDamagePerLevel
				for itemID, count := range p.Inventory {
					if count > 0 {
						if mod, ok := GetItemModifier(itemID); ok {
							critChance += mod.StatModifiers.CritChance * float64(count)
							critMultiplier += mod.StatModifiers.CritDamage * float64(count)
						}
					}
				}
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
			m.Vel = m.Vel.Add(bullet.Vel.Normalize().Mul(combatCfg.BulletKnockback))
			if bullet.OwnerType == 0 {
				p, okP := w.Players[bullet.OwnerID]
				if okP && p.Alive {
					vampPercent := p.Vampirism
					if count, ok := p.Inventory[2]; ok {
						vampPercent += combatCfg.VampirismPerItem * float64(count)
					}
					if vampPercent > 0 {
						p.Health = math.Min(p.MaxHealth, p.Health+dmg*vampPercent)
					}
					if bullet.Subtype == 1 {
						p.LaserHitsCount[m.ID]++
						if p.LaserHitsCount[m.ID] >= combatCfg.LaserChainThreshold {
							p.LaserHitsCount[m.ID] = 0
							chainRadSq := combatCfg.LaserChainRadius * combatCfg.LaserChainRadius
							for _, otherMob := range w.Mobs {
								distSq := otherMob.Pos.Sub(m.Pos).LengthSq()
								if distSq < chainRadSq {
									otherMob.Health -= combatCfg.LaserChainDamage
								}
							}
						}
					}
					if isCrit {
						var targets []*Mob
						critRangeSq := combatCfg.CritChainRange * combatCfg.CritChainRange
						for _, otherMob := range w.Mobs {
							if otherMob.ID == m.ID {
								continue
							}
							distSq := otherMob.Pos.Sub(m.Pos).LengthSq()
							if distSq < critRangeSq {
								targets = append(targets, otherMob)
							}
						}
						w.rand.Shuffle(len(targets), func(i, j int) {
							targets[i], targets[j] = targets[j], targets[i]
						})
						limit := combatCfg.CritChainLimit
						if len(targets) < limit {
							limit = len(targets)
						}
						for k := 0; k < limit; k++ {
							targets[k].Health -= combatCfg.CritChainDamage
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
}

func (w *GameWorld) handleBulletPlayerCollision(a, b HashItem) {
	combatCfg := GetCombatConfig()
	bullet, ok1 := w.Bullets[a.ID]
	p, ok2 := w.Players[b.ID]
	if ok1 && ok2 && p.Alive {
		if bullet.Lifetime <= 0 || bullet.Pierce <= 0 {
			return
		}
		if bullet.OwnerType == 1 {
			dmgToPlayer := bullet.Damage * (1.0 - math.Min(combatCfg.MaxDefianceReduction, float64(p.StatCritDefiance)*combatCfg.DefiancePerLevel))

			var armor float64
			for itemID, count := range p.Inventory {
				if count > 0 {
					if mod, ok := GetItemModifier(itemID); ok {
						armor += mod.StatModifiers.Armor * float64(count)
					}
				}
			}
			if p.ClassID == 4 && p.SkillDuration > 0 {
				armor += 150.0
			}
			if armor > 0 {
				dmgToPlayer *= (100.0 / (100.0 + armor))
			}

			if p.ClassID == 0 && p.SkillDuration > 0 {
				dmgToPlayer = 0
			}

			if len(p.MinionIDs) > 0 {
				droneID := p.MinionIDs[0]
				if drone, okD := w.Minions[droneID]; okD {
					drone.Health -= dmgToPlayer
					dmgToPlayer = 0
				}
			}
			p.Health -= dmgToPlayer
			p.Vel = p.Vel.Add(bullet.Vel.Normalize().Mul(combatCfg.PlayerBulletKnockback))
			bullet.Lifetime = 0
		}
	}
}

func (w *GameWorld) handleBulletMinionCollision(a, b HashItem) {
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
}

func (w *GameWorld) handleMinionMobCollision(a, b HashItem) {
	rarityCfg := GetRarityConfig()
	combatCfg := GetCombatConfig()
	minion, ok1 := w.Minions[a.ID]
	m, ok2 := w.Mobs[b.ID]
	if ok1 && ok2 {
		c1 := physics.Circle{Pos: &minion.Pos, Vel: &minion.Vel, Radius: minion.Radius, Mass: 1.0}
		c2 := physics.Circle{Pos: &m.Pos, Vel: &m.Vel, Radius: m.Radius, Mass: 1.0}
		if physics.ResolveCircleCircle(c1, c2, 0.25) {
			dmg := minion.Damage
			if armorMod, ok := rarityCfg.Modifiers["armor"]; ok {
				if m.Modifiers&(1<<armorMod.Bit) != 0 {
					dmg *= armorMod.DamageReduction
				}
			}
			m.Health -= dmg
			minion.Health -= m.Damage * combatCfg.MinionContactDamageMultiplier
			if m.Type == 2 {
				minion.Health = 0
				m.Health = 0
			}
		}
	}
}

func (w *GameWorld) handlePlayerLootCollision(a, b HashItem) {
	p, ok1 := w.Players[a.ID]
	ld, ok2 := w.LootDrops[b.ID]
	if ok1 && ok2 && p.Alive {
		p.Inventory[uint16(ld.ItemID)]++
		p.invDirty = true
		w.RemovedEntityIDs = append(w.RemovedEntityIDs, b.ID)
		delete(w.LootDrops, b.ID)

		if ld.ItemID == 29 {
			hasHealer := false
			for _, mID := range p.MinionIDs {
				if m, exists := w.Minions[mID]; exists && m.Subtype == 1 {
					hasHealer = true
					break
				}
			}
			if !hasHealer {
				w.spawnSpecialDrone(p.ID, p.Pos, 1)
			}
		}
	}
}

func (w *GameWorld) triggerOnKillEffects(killerID uint16, deadMob *Mob) {
	combatCfg := GetCombatConfig()
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
				explRadSq := combatCfg.ExplosionRadius * combatCfg.ExplosionRadius
				for _, otherMob := range w.Mobs {
					if otherMob.ID == deadMob.ID {
						continue
					}
					distSq := otherMob.Pos.Sub(deadMob.Pos).LengthSq()
					if distSq < explRadSq {
						otherMob.Health -= combatCfg.ExplosionDamage * float64(count)
					}
				}
			} else if mod.OnKillEffectTrigger == TRIGGER_CHAIN_LIGHTNING {
				chainRadSq := combatCfg.LaserChainRadius * combatCfg.LaserChainRadius
				for _, otherMob := range w.Mobs {
					if otherMob.ID == deadMob.ID {
						continue
					}
					distSq := otherMob.Pos.Sub(deadMob.Pos).LengthSq()
					if distSq < chainRadSq {
						otherMob.Health -= combatCfg.LaserChainDamage * float64(count)
					}
				}
			}
		}
	}
}
