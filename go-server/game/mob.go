package game

import (
	"math"

	"go-server/physics"
)

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
	Rarity        uint8
	Modifiers     uint32
}

func (w *GameWorld) spawnSingleMob() {
	var rx, ry float64
	var targetPlayer *Player
	for _, p := range w.Players {
		if p.Alive {
			targetPlayer = p
			break
		}
	}
	if targetPlayer != nil {
		angle := w.rand.Float64() * 2.0 * math.Pi
		dist := 850.0 + w.rand.Float64()*250.0
		rx = targetPlayer.Pos.X + math.Cos(angle)*dist
		ry = targetPlayer.Pos.Y + math.Sin(angle)*dist
		if rx < 10 {
			rx = 10
		} else if rx > w.Width-10 {
			rx = w.Width - 10
		}
		if ry < 10 {
			ry = 10
		} else if ry > w.Height-10 {
			ry = w.Height - 10
		}
	} else {
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
	}

	var mobType uint8
	roll := w.rand.Float64()
	if w.WaveNumber == 1 {
		if roll < 0.7 {
			mobType = 3
		} else {
			mobType = 0
		}
	} else if w.WaveNumber == 2 {
		if roll < 0.4 {
			mobType = 3
		} else if roll < 0.8 {
			mobType = 0
		} else {
			mobType = 1
		}
	} else if w.WaveNumber == 3 {
		if roll < 0.3 {
			mobType = 0
		} else if roll < 0.7 {
			mobType = 1
		} else {
			mobType = 2
		}
	} else {
		if roll < 0.2 {
			mobType = 3
		} else if roll < 0.4 {
			mobType = 0
		} else if roll < 0.7 {
			mobType = 1
		} else {
			mobType = 2
		}
	}

	rarity := uint8(0)
	rarityRoll := w.rand.Float64()
	if rarityRoll < 0.18 {
		if rarityRoll < 0.01 {
			rarity = 3
		} else if rarityRoll < 0.05 {
			rarity = 2
		} else {
			rarity = 1
		}
	}

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

	hpMultiplier := 1.0
	dmgMultiplier := 1.0
	xpMultiplier := 1.0
	radiusMultiplier := 1.0
	var modifiers uint32 = 0

	if rarity == 1 {
		hpMultiplier = 2.0
		dmgMultiplier = 1.3
		xpMultiplier = 2.5
		radiusMultiplier = 1.15
		modRoll := w.rand.Intn(4)
		modifiers |= (1 << modRoll)
	} else if rarity == 2 {
		hpMultiplier = 4.5
		dmgMultiplier = 1.8
		xpMultiplier = 6.0
		radiusMultiplier = 1.35
		mod1 := w.rand.Intn(4)
		mod2 := (mod1 + 1 + w.rand.Intn(3)) % 4
		modifiers |= (1 << mod1) | (1 << mod2)
	} else if rarity == 3 {
		hpMultiplier = 10.0
		dmgMultiplier = 2.5
		xpMultiplier = 15.0
		radiusMultiplier = 1.6
		modifiers |= 0x0F
	}

	hp *= hpMultiplier
	dmg *= dmgMultiplier
	xpVal = uint32(float64(xpVal) * xpMultiplier)
	rad *= radiusMultiplier

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
	m.Rarity = rarity
	m.Modifiers = modifiers
	w.Mobs[id] = m
}

func (w *GameWorld) updateMobs(dt float64) {
	for id, m := range w.Mobs {
		var target *Player
		var minDist float64 = -1
		c := int(m.Pos.X / 100.0)
		r := int(m.Pos.Y / 100.0)
		for dr := -1; dr <= 1; dr++ {
			nr := r + dr
			if nr < 0 || nr >= 60 {
				continue
			}
			for dc := -1; dc <= 1; dc++ {
				nc := c + dc
				if nc < 0 || nc >= 60 {
					continue
				}
				for _, item := range w.grid[nr][nc] {
					if item.Type == 0 {
						p := w.Players[item.ID]
						if p != nil && p.Alive {
							distSq := m.Pos.Sub(item.Pos).LengthSq()
							if minDist < 0 || distSq < minDist {
								minDist = distSq
								target = p
							}
						}
					}
				}
			}
		}
		needsFallback := true
		if target != nil {
			distToEdgeX := m.Pos.X - float64((c-1)*100)
			if rightEdge := float64((c+2)*100) - m.Pos.X; rightEdge < distToEdgeX {
				distToEdgeX = rightEdge
			}
			distToEdgeY := m.Pos.Y - float64((r-1)*100)
			if bottomEdge := float64((r+2)*100) - m.Pos.Y; bottomEdge < distToEdgeY {
				distToEdgeY = bottomEdge
			}
			minDistToEdgeSq := distToEdgeX * distToEdgeX
			if distToEdgeY*distToEdgeY < minDistToEdgeSq {
				minDistToEdgeSq = distToEdgeY * distToEdgeY
			}
			if minDist <= minDistToEdgeSq {
				needsFallback = false
			}
		}
		if needsFallback {
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
		}
		if target != nil {
			dist := math.Sqrt(minDist)
			dir := target.Pos.Sub(m.Pos).Normalize()
			speedMul := 1.0
			if m.Rarity == 1 {
				speedMul = 1.1
			} else if m.Rarity == 2 {
				speedMul = 1.25
			} else if m.Rarity == 3 {
				speedMul = 1.4
			}
			if m.Modifiers&1 != 0 {
				speedMul *= 1.5
			}

			if m.Type == 0 {
				m.Vel = m.Vel.Add(dir.Mul(0.2)).Normalize().Mul(1.8 * speedMul)
			} else if m.Type == 1 {
				if dist > 260 {
					m.Vel = m.Vel.Add(dir.Mul(0.2)).Normalize().Mul(2.0 * speedMul)
				} else if dist < 180 {
					m.Vel = m.Vel.Add(dir.Mul(-0.25)).Normalize().Mul(2.2 * speedMul)
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
					b.Subtype = 5
					b.Pos = m.Pos.Add(dir.Mul(m.Radius + 5))
					b.Vel = dir.Mul(7.0)
					b.Radius = 7
					b.Damage = 4
					b.Lifetime = 3.0
					b.Pierce = 1
					w.Bullets[bID] = b
				}
			} else if m.Type == 2 {
				m.Vel = m.Vel.Add(dir.Mul(0.3)).Normalize().Mul(3.2 * speedMul)
			} else if m.Type == 3 {
				m.Vel = m.Vel.Add(dir.Mul(0.25)).Normalize().Mul(2.5 * speedMul)
			} else if m.Type == 10 {
				m.Vel = m.Vel.Add(dir.Mul(0.15)).Normalize().Mul(1.4 * speedMul)
				m.ShootCooldown -= dt
				if m.ShootCooldown <= 0 && dist < 500 {
					m.ShootCooldown = 2.5
					for i := 0; i < 8; i++ {
						angle := (float64(i) / 8.0) * 2.0 * math.Pi
						bDir := physics.Vector2D{X: math.Cos(angle), Y: math.Sin(angle)}
						bID := w.GenerateID()
						b := w.bulletPool.Get().(*Bullet)
						*b = Bullet{}
						b.ID = bID
						b.OwnerID = m.ID
						b.OwnerType = 1
						b.Subtype = 5
						b.Pos = m.Pos.Add(bDir.Mul(m.Radius + 5))
						b.Vel = bDir.Mul(5.0)
						b.Radius = 9
						b.Damage = m.Damage * 0.5
						b.Lifetime = 4.0
						b.Pierce = 1
						w.Bullets[bID] = b
					}
				}
			} else if m.Type == 11 {
				m.ShootCooldown -= dt
				if m.ShootCooldown <= 0 {
					m.ShootCooldown = 3.2
					m.Vel = dir.Mul(9.0)
				} else if m.ShootCooldown > 2.0 {
					m.Vel = m.Vel.Normalize().Mul(9.0)
				} else {
					m.Vel = m.Vel.Add(dir.Mul(0.1)).Normalize().Mul(1.8 * speedMul)
				}
			}
		}
		if m.Modifiers&4 != 0 && m.Health < m.MaxHealth {
			m.Health += m.MaxHealth * 0.03 * dt
			if m.Health > m.MaxHealth {
				m.Health = m.MaxHealth
			}
		}
		for _, f := range w.Fields {
			distSq := m.Pos.Sub(f.Pos).LengthSq()
			radSum := f.Radius + m.Radius
			if distSq < radSum*radSum {
				m.Vel = m.Vel.Mul(0.2)
				break
			}
		}
		m.Pos = m.Pos.Add(m.Vel)
		physics.ResolveCircleBox(&m.Pos, m.Radius, &m.Vel, 0, 0, w.Width, w.Height, 0.2)
		if m.Health <= 0 {
			var hasNecrosis bool
			var owner *Player
			for _, p := range w.Players {
				if p.Alive {
					owner = p
					if (p.StateFlags & (1 << 8)) != 0 {
						hasNecrosis = true
					}
					if count, ok := p.Inventory[3]; ok && count > 0 {
						hasNecrosis = true
					}
					break
				}
			}
			if hasNecrosis && owner != nil {
				for _, otherMob := range w.Mobs {
					if otherMob.ID == m.ID {
						continue
					}
					distSq := otherMob.Pos.Sub(m.Pos).LengthSq()
					if distSq < 140.0*140.0 {
						otherMob.Health -= 35.0
					}
				}
			}
			if m.Modifiers&16 != 0 && w.rand.Float64() < 0.30 && owner != nil {
				w.spawnDrone(owner.ID, m.Pos)
			}
			if m.Type == 12 {
				for _, p := range w.Players {
					p.Alive = false
					p.StateFlags |= 0x10000
				}
			}
			w.dropLoot(m.Pos, m.Rarity, m.Type)
			w.spawnOrb(m.Pos, m.XPValue)
			w.mobPool.Put(m)
			delete(w.Mobs, id)
		}
	}
}

func (w *GameWorld) spawnDrone(ownerID uint16, pos physics.Vector2D) {
	owner, ok := w.Players[ownerID]
	if !ok {
		return
	}
	mID := w.GenerateID()
	minionMaxHP := 35.0 + float64(owner.StatMinionHP)*10.0
	minion := &Minion{
		ID:          mID,
		OwnerID:     ownerID,
		Pos:         pos,
		Radius:      12,
		Health:      minionMaxHP,
		MaxHealth:   minionMaxHP,
		Damage:      10.0 + float64(owner.StatMinionDmg)*3.0,
		OrbitIndex:  len(owner.MinionIDs),
		Lifetime:    15.0,
		HasLifetime: true,
	}
	w.Minions[mID] = minion
	owner.MinionIDs = append(owner.MinionIDs, mID)
}

func (w *GameWorld) dropLoot(pos physics.Vector2D, rarity uint8, mobType uint8) {
	roll := w.rand.Float64()
	var itemID uint8

	commonChance := 0.70
	rareChance := 0.25
	uniqueChance := 0.05

	uniqueChance += float64(w.WaveNumber) * 0.01
	rareChance += float64(w.WaveNumber) * 0.005
	total := commonChance + rareChance + uniqueChance
	commonChance /= total
	rareChance /= total
	uniqueChance /= total

	if mobType == 10 || mobType == 11 || mobType == 12 {
		if roll < 0.5 {
			itemID = 4
		} else {
			itemID = 3
		}
	} else if rarity > 0 {
		if roll < uniqueChance*3 {
			if roll < (uniqueChance*3)/2 {
				itemID = 3
			} else {
				itemID = 4
			}
		} else if roll < (uniqueChance*3 + rareChance*2) {
			itemID = 2
		} else if roll < (uniqueChance*3 + rareChance*2 + commonChance*0.3) {
			itemID = 1
		}
	} else {
		if roll < uniqueChance*0.2 {
			itemID = 4
		} else if roll < (uniqueChance*0.2 + rareChance*0.2) {
			itemID = 2
		} else if roll < (uniqueChance*0.2 + rareChance*0.2 + commonChance*0.05) {
			itemID = 1
		}
	}
	if itemID != 0 {
		id := w.GenerateID()
		w.LootDrops[id] = &LootDrop{
			ID:     id,
			ItemID: itemID,
			Pos:    pos,
			Radius: 12.0,
		}
	}
}

func (w *GameWorld) spawnBoss(bossType uint8) {
	var rx, ry float64
	var targetPlayer *Player
	for _, p := range w.Players {
		if p.Alive {
			targetPlayer = p
			break
		}
	}
	if targetPlayer != nil {
		angle := w.rand.Float64() * 2.0 * math.Pi
		dist := 900.0
		rx = targetPlayer.Pos.X + math.Cos(angle)*dist
		ry = targetPlayer.Pos.Y + math.Sin(angle)*dist
	} else {
		rx = w.Width / 2
		ry = w.Height / 2
	}

	id := w.GenerateID()
	waveScale := float64(w.WaveNumber - 1)
	var hp, rad, dmg float64
	var xpVal uint32

	if bossType == 10 {
		hp = 600 * (1.0 + 0.25*waveScale)
		rad = 48
		dmg = 18 * (1.0 + 0.15*waveScale)
		xpVal = 500
	} else if bossType == 11 {
		hp = 900 * (1.0 + 0.25*waveScale)
		rad = 56
		dmg = 28 * (1.0 + 0.15*waveScale)
		xpVal = 800
	} else {
		hp = 2500 * (1.0 + 0.25*waveScale)
		rad = 72
		dmg = 45 * (1.0 + 0.15*waveScale)
		xpVal = 2000
	}

	m := w.mobPool.Get().(*Mob)
	*m = Mob{}
	m.ID = id
	m.Type = bossType
	m.Pos = physics.Vector2D{X: rx, Y: ry}
	m.Radius = rad
	m.Health = hp
	m.MaxHealth = hp
	m.Damage = dmg
	m.XPValue = xpVal
	m.Rarity = 3
	m.Modifiers = 0x0F
	w.Mobs[id] = m
}

func (w *GameWorld) spawnBossesForWave() {
	if w.WaveNumber == 50 {
		w.spawnBoss(12)
	} else if w.WaveNumber == 5 {
		w.spawnBoss(10)
	} else if w.WaveNumber == 10 {
		w.spawnBoss(11)
	} else if w.WaveNumber%5 == 0 && w.WaveNumber < 50 {
		w.spawnBoss(10)
		w.spawnBoss(11)
	}
}
