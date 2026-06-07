package game

import (
	"math"
	"strconv"

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
	KillerID      uint16
}

func (w *GameWorld) spawnSingleMob() {
	mobsCfg := GetMobsConfig()
	spawnCfg := GetSpawnConfig()

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
		dist := mobsCfg.SpawnDistMin + w.rand.Float64()*(mobsCfg.SpawnDistMax-mobsCfg.SpawnDistMin)
		rx = targetPlayer.Pos.X + math.Cos(angle)*dist
		ry = targetPlayer.Pos.Y + math.Sin(angle)*dist
		if rx < mobsCfg.BorderPadding {
			rx = mobsCfg.BorderPadding
		} else if rx > w.Width-mobsCfg.BorderPadding {
			rx = w.Width - mobsCfg.BorderPadding
		}
		if ry < mobsCfg.BorderPadding {
			ry = mobsCfg.BorderPadding
		} else if ry > w.Height-mobsCfg.BorderPadding {
			ry = w.Height - mobsCfg.BorderPadding
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

	waveKey := strconv.Itoa(int(w.WaveNumber))
	spawnTable, ok := spawnCfg.WaveSpawnTables[waveKey]
	if !ok {
		spawnTable = spawnCfg.WaveSpawnTables["default"]
	}

	roll := w.rand.Float64()
	var mobType uint8
	cumWeight := 0.0
	for _, entry := range spawnTable {
		cumWeight += entry.Weight
		if roll < cumWeight {
			mobType = entry.Type
			break
		}
	}

	rarityCfg := GetRarityConfig()
	rarity := uint8(0)
	rarityRoll := w.rand.Float64()
	for i := len(rarityCfg.Chances) - 1; i >= 0; i-- {
		if rarityRoll < rarityCfg.Chances[i].MaxRoll {
			rarity = rarityCfg.Chances[i].Rarity
			break
		}
	}

	id := w.GenerateID()
	mobCfg, hasCfg := GetMobTypeConfig(mobType)
	if !hasCfg {
		mobCfg, _ = GetMobTypeConfig(0)
	}

	hp := mobCfg.BaseHP * w.WaveDifficulty
	rad := mobCfg.Radius
	dmg := mobCfg.BaseDamage * w.WaveDifficulty
	xpVal := mobCfg.BaseXP

	rm := GetRarityMultiplier(rarity)
	hp *= rm.HP
	dmg *= rm.Damage
	xpVal = uint32(float64(xpVal) * rm.XP * w.WaveDifficulty)
	rad *= rm.Radius

	var modifiers uint32 = 0
	if rm.ModifierCount == 4 {
		modifiers = 0x0F
	} else if rm.ModifierCount > 0 {
		mod1 := w.rand.Intn(4)
		modifiers |= (1 << mod1)
		for j := 1; j < rm.ModifierCount; j++ {
			mod := (mod1 + 1 + w.rand.Intn(3)) % 4
			modifiers |= (1 << mod)
		}
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
	m.Rarity = rarity
	m.Modifiers = modifiers
	w.Mobs[id] = m
}

func (w *GameWorld) updateMobs(dt float64) {
	rarityCfg := GetRarityConfig()
	worldCfg := GetWorldConfig()

	for id, m := range w.Mobs {
		var target *Player
		var minDist float64 = -1
		cellSize := worldCfg.CellSize
		c := int(m.Pos.X / cellSize)
		r := int(m.Pos.Y / cellSize)
		gridSize := worldCfg.GridSize
		for dr := -1; dr <= 1; dr++ {
			nr := r + dr
			if nr < 0 || nr >= gridSize {
				continue
			}
			for dc := -1; dc <= 1; dc++ {
				nc := c + dc
				if nc < 0 || nc >= gridSize {
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
			distToEdgeX := m.Pos.X - float64((c-1)*int(cellSize))
			if rightEdge := float64((c+2)*int(cellSize)) - m.Pos.X; rightEdge < distToEdgeX {
				distToEdgeX = rightEdge
			}
			distToEdgeY := m.Pos.Y - float64((r-1)*int(cellSize))
			if bottomEdge := float64((r+2)*int(cellSize)) - m.Pos.Y; bottomEdge < distToEdgeY {
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

			rm := GetRarityMultiplier(m.Rarity)
			speedMul := rm.Speed

			if speedMod, ok := rarityCfg.Modifiers["speed"]; ok {
				if m.Modifiers&(1<<speedMod.Bit) != 0 {
					speedMul *= speedMod.SpeedMultiplier
				}
			}

			if m.Type < 10 {
				speedMul *= math.Pow(w.WaveDifficulty, CurrentWaveConfig.SpeedDifficultyExponent)
			}

			mobCfg, hasCfg := GetMobTypeConfig(m.Type)
			if !hasCfg {
				bossCfg, hasBoss := GetBossTypeConfig(m.Type)
				if hasBoss {
					w.updateBossMob(m, bossCfg, dir, dist, dt, speedMul)
				}
			} else {
				if mobCfg.ShootCooldown > 0 {
					if dist > mobCfg.PreferredMaxDist {
						m.Vel = m.Vel.Add(dir.Mul(mobCfg.Acceleration)).Normalize().Mul(mobCfg.BaseSpeed * speedMul)
					} else if dist < mobCfg.PreferredMinDist {
						m.Vel = m.Vel.Add(dir.Mul(mobCfg.RetreatAccel)).Normalize().Mul(mobCfg.RetreatSpeed * speedMul)
					} else {
						m.Vel = m.Vel.Mul(mobCfg.IdleFriction)
					}
					m.ShootCooldown -= dt
					if m.ShootCooldown <= 0 && dist < mobCfg.ShootRange {
						m.ShootCooldown = mobCfg.ShootCooldown
						bID := w.GenerateID()
						b := w.bulletPool.Get().(*Bullet)
						*b = Bullet{}
						b.ID = bID
						b.OwnerID = m.ID
						b.OwnerType = 1
						b.Subtype = mobCfg.BulletSubtype
						b.Pos = m.Pos.Add(dir.Mul(m.Radius + 5))
						b.PrevPos = b.Pos
						b.Vel = dir.Mul(mobCfg.BulletSpeed)
						b.Radius = mobCfg.BulletRadius
						b.Damage = mobCfg.BulletDamage
						b.Lifetime = mobCfg.BulletLifetime
						b.Pierce = mobCfg.BulletPierce
						w.Bullets[bID] = b
					}
				} else {
					m.Vel = m.Vel.Add(dir.Mul(mobCfg.Acceleration)).Normalize().Mul(mobCfg.BaseSpeed * speedMul)
				}
			}
		}

		if regenMod, ok := rarityCfg.Modifiers["regen"]; ok {
			if m.Modifiers&(1<<regenMod.Bit) != 0 && m.Health < m.MaxHealth {
				m.Health += m.MaxHealth * regenMod.RegenPercent * dt
				if m.Health > m.MaxHealth {
					m.Health = m.MaxHealth
				}
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
			var owner *Player
			for _, p := range w.Players {
				if p.Alive {
					owner = p
					break
				}
			}
			if droneSpawnMod, ok := rarityCfg.Modifiers["droneSpawn"]; ok {
				if m.Modifiers&(1<<droneSpawnMod.Bit) != 0 && w.rand.Float64() < droneSpawnMod.SpawnChance && owner != nil {
					w.spawnDrone(owner.ID, m.Pos)
				}
			}

			bossCfg, isBoss := GetBossTypeConfig(m.Type)
			if isBoss && bossCfg.KillAllPlayersOnDeath {
				for _, p := range w.Players {
					p.Alive = false
					p.StateFlags |= 0x10000
				}
			}
			w.dropLoot(m.Pos, m.Rarity, m.Type, m.KillerID)
			if m.KillerID != 0 {
				w.AwardXP(m.KillerID, m.XPValue)
			} else {
				for _, p := range w.Players {
					if p.Alive {
						w.AwardXP(p.ID, m.XPValue)
						break
					}
				}
			}
			w.mobPool.Put(m)
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.Mobs, id)
		}
	}
}

func (w *GameWorld) updateBossMob(m *Mob, cfg BossTypeConfig, dir physics.Vector2D, dist float64, dt float64, speedMul float64) {
	if cfg.BulletCount > 0 {
		m.Vel = m.Vel.Add(dir.Mul(cfg.Acceleration)).Normalize().Mul(cfg.BaseSpeed * speedMul)
		m.ShootCooldown -= dt
		if m.ShootCooldown <= 0 && dist < cfg.ShootRange {
			m.ShootCooldown = cfg.ShootCooldown
			for i := 0; i < cfg.BulletCount; i++ {
				angle := (float64(i) / float64(cfg.BulletCount)) * 2.0 * math.Pi
				bDir := physics.Vector2D{X: math.Cos(angle), Y: math.Sin(angle)}
				bID := w.GenerateID()
				b := w.bulletPool.Get().(*Bullet)
				*b = Bullet{}
				b.ID = bID
				b.OwnerID = m.ID
				b.OwnerType = 1
				b.Subtype = cfg.BulletSubtype
				b.Pos = m.Pos.Add(bDir.Mul(m.Radius + 5))
				b.PrevPos = b.Pos
				b.Vel = bDir.Mul(cfg.BulletSpeed)
				b.Radius = cfg.BulletRadius
				b.Damage = m.Damage * cfg.BulletDamageMultiplier
				b.Lifetime = cfg.BulletLifetime
				b.Pierce = cfg.BulletPierce
				w.Bullets[bID] = b
			}
		}
	} else if cfg.ChargeCooldown > 0 {
		m.ShootCooldown -= dt
		if m.ShootCooldown <= 0 {
			m.ShootCooldown = cfg.ChargeCooldown
			m.Vel = dir.Mul(cfg.ChargeSpeed)
		} else if m.ShootCooldown > cfg.ChargeCooldown-cfg.ChargeDuration {
			m.Vel = m.Vel.Normalize().Mul(cfg.ChargeSpeed)
		} else {
			m.Vel = m.Vel.Add(dir.Mul(cfg.IdleAcceleration)).Normalize().Mul(cfg.IdleSpeed * speedMul)
		}
	}
}

func (w *GameWorld) spawnDrone(ownerID uint16, pos physics.Vector2D) {
	owner, ok := w.Players[ownerID]
	if !ok {
		return
	}
	mCfg := GetMinionConfig()
	mID := w.GenerateID()
	minionMaxHP := mCfg.BaseHP + float64(owner.StatMinionHP)*mCfg.HPPerLevel
	minion := &Minion{
		ID:          mID,
		OwnerID:     ownerID,
		Pos:         pos,
		Radius:      mCfg.Radius,
		Health:      minionMaxHP,
		MaxHealth:   minionMaxHP,
		Damage:      mCfg.BaseDamage + float64(owner.StatMinionDmg)*mCfg.DamagePerLevel,
		OrbitIndex:  len(owner.MinionIDs),
		Lifetime:    mCfg.DroneLifetime,
		HasLifetime: mCfg.DroneHasLifetime,
	}
	w.Minions[mID] = minion
	owner.MinionIDs = append(owner.MinionIDs, mID)
}

func (w *GameWorld) dropLoot(pos physics.Vector2D, rarity uint8, mobType uint8, killerID uint16) {
	tableKey := "normal_rarity_0"
	if mobType == 10 || mobType == 11 || mobType == 12 {
		tableKey = "boss"
	} else if rarity == 3 {
		tableKey = "normal_rarity_3"
	} else if rarity == 2 {
		tableKey = "normal_rarity_2"
	} else if rarity == 1 {
		tableKey = "normal_rarity_1"
	}

	table, ok := GetLootTable(tableKey)
	if !ok {
		return
	}

	combatCfg := GetCombatConfig()
	chanceLimit := table.LootChance
	if killer, okK := w.Players[killerID]; okK && killer.Alive {
		chanceLimit += chanceLimit * float64(killer.StatLootQuantity) * combatCfg.LootQuantityPerLevel
	}

	roll := w.rand.Float64()
	if roll >= chanceLimit {
		return
	}

	totalWeight := 0
	for _, g := range table.Groups {
		totalWeight += g.Weight
	}
	if totalWeight <= 0 {
		return
	}

	weightRoll := w.rand.Intn(totalWeight)
	currentWeight := 0
	var selectedGroup *LootGroup
	for _, g := range table.Groups {
		currentWeight += g.Weight
		if weightRoll < currentWeight {
			selectedGroup = &g
			break
		}
	}

	if selectedGroup == nil || len(selectedGroup.Items) == 0 {
		return
	}

	itemID := selectedGroup.Items[w.rand.Intn(len(selectedGroup.Items))]

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
	bossesCfg := GetBossesConfig()
	for _, p := range w.Players {
		if p.Alive {
			targetPlayer = p
			break
		}
	}
	if targetPlayer != nil {
		angle := w.rand.Float64() * 2.0 * math.Pi
		dist := bossesCfg.SpawnDistance
		rx = targetPlayer.Pos.X + math.Cos(angle)*dist
		ry = targetPlayer.Pos.Y + math.Sin(angle)*dist
	} else {
		rx = w.Width / 2
		ry = w.Height / 2
	}

	id := w.GenerateID()

	cfg, ok := GetBossTypeConfig(bossType)
	if !ok {
		return
	}

	hp := cfg.BaseHP * w.WaveDifficulty
	rad := cfg.Radius
	dmg := cfg.BaseDamage * w.WaveDifficulty
	xpVal := uint32(cfg.BaseXP * w.WaveDifficulty)

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
	bossesCfg := GetBossesConfig()

	for _, entry := range bossesCfg.Schedule {
		if w.WaveNumber == entry.Wave {
			for _, bossType := range entry.Bosses {
				w.spawnBoss(bossType)
			}
			return
		}
	}

	rule := bossesCfg.RecurringRule
	if rule.Interval > 0 && w.WaveNumber >= rule.MinWave && w.WaveNumber <= rule.MaxWave && w.WaveNumber%uint32(rule.Interval) == 0 {
		for _, bossType := range rule.Bosses {
			w.spawnBoss(bossType)
		}
	}
}
