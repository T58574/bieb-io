package game

import (
	"log"
	"math"
	"sort"

	"go-server/physics"
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
	StatRegen        uint16
	StatMaxHP        uint16
	StatSpeed        uint16
	StatMinionDmg    uint16
	StatMinionSpeed  uint16
	StatMinionHP     uint16
	StatMinionPierce uint16
	StatMinionRegen  uint16
	StatDamageMod    uint16
	StatCooldownMod  uint16
	StatCritChance   uint16
	StatCritDamage   uint16
	StatCritDefiance uint16
	StatAddProjectiles uint16
	StatPierceCount  uint16
	StatSpread       uint16
	StatExpMod       uint16
	StatLootQuantity uint16
	StatLootQuality  uint16
	StatPickupItemRadius uint16
	StatThorns       uint16
	RegenAccum       float64
	ClassID          uint8
	Mass             float64
	StateFlags       uint32
	ChargeLevel      float64
	ShootCooldown    float64
	FlashTimer       float64
	CardChoices      [3]uint8
	Inventory        map[uint16]int
	invCache         []uint8
	invDirty         bool
	Vampirism        float64
	LaserHitsCount   map[uint16]uint8
	SkillCooldown    float64
	SkillDuration    float64
	AegisCooldown    float64
	AegisShieldTimer float64
}


func (p *Player) GetInventoryArray() []uint8 {
	if !p.invDirty && p.invCache != nil {
		return p.invCache
	}

	pCfg := GetPlayerConfig()
	var keys []int
	for k := range p.Inventory {
		keys = append(keys, int(k))
	}
	sort.Ints(keys)

	invList := make([]uint8, pCfg.InventorySize)
	idx := 0
	for _, k := range keys {
		id := uint16(k)
		count := p.Inventory[id]
		if count > 0 && idx < pCfg.InventorySize {
			invList[idx] = uint8(id)
			cVal := count
			if cVal > 255 {
				cVal = 255
			}
			invList[idx+1] = uint8(cVal)
			idx += 2
		}
	}
	p.invCache = invList
	p.invDirty = false
	return invList
}

func (p *Player) GetUpgradeLevels() []uint8 {
	levels := make([]uint8, 29)
	levels[1] = uint8(p.StatSpeed)
	levels[2] = uint8(math.Round(p.Vampirism / 0.05))
	levels[3] = uint8(p.StatMaxHP)
	levels[4] = uint8(p.StatRegen)
	levels[5] = uint8(p.StatMinionDmg)
	levels[6] = uint8(p.StatMinionSpeed)
	levels[7] = uint8(p.StatMinionHP)
	levels[8] = uint8(p.StatMinionPierce)
	levels[9] = uint8(p.StatMinionRegen)
	levels[10] = uint8((p.StateFlags >> 4) & 0xF)
	if (p.StateFlags & 256) != 0 {
		levels[11] = 1
	} else {
		levels[11] = 0
	}
	levels[12] = uint8(p.StatDamageMod)
	levels[13] = uint8(p.StatCooldownMod)
	levels[14] = uint8(p.StatCritChance)
	levels[15] = uint8(p.StatCritDamage)
	levels[16] = uint8(p.StatCritDefiance)
	levels[17] = uint8(p.StatAddProjectiles)
	levels[18] = uint8(p.StatPierceCount)
	levels[19] = uint8(p.StatSpread)
	levels[20] = uint8(p.StatExpMod)
	levels[21] = uint8(p.StatLootQuantity)
	levels[22] = uint8(p.StatLootQuality)
	levels[23] = uint8(p.StatPickupItemRadius)
	levels[24] = uint8(p.StatThorns)
	if (p.StateFlags & 4096) != 0 {
		levels[25] = 1
	}
	if (p.StateFlags & 8192) != 0 {
		levels[26] = 1
	}
	if (p.StateFlags & 16384) != 0 {
		levels[27] = 1
	}
	if (p.StateFlags & 32768) != 0 {
		levels[28] = 1
	}
	return levels
}

func (w *GameWorld) AddPlayer(id uint16, username string, classID uint8) *Player {
	w.mu.Lock()
	defer w.mu.Unlock()
	hasAlive := false
	for _, p := range w.Players {
		if p.Alive {
			hasAlive = true
			break
		}
	}
	if !hasAlive {
		w.resetLocked()
	}
	pCfg := GetPlayerConfig()
	p := &Player{
		ID:             id,
		Username:       username,
		Pos:            physics.Vector2D{X: w.Width / 2, Y: w.Height / 2},
		Radius:         pCfg.Radius,
		Health:         pCfg.StartHP,
		MaxHealth:      pCfg.StartMaxHP,
		XP:             0,
		MaxXP:          pCfg.StartMaxXP,
		Level:          pCfg.StartLevel,
		Score:          0,
		Alive:          true,
		ClassID:        classID,
		Mass:           1.0,
		StateFlags:     0,
		ChargeLevel:    0.0,
		LaserHitsCount: make(map[uint16]uint8),
		Inventory:      make(map[uint16]int),
		invDirty:       true,
	}
	if classCfg, ok := GetClassConfig(p.ClassID); ok {
		p.Mass = classCfg.Mass
	}
	w.Players[id] = p
	w.spawnMinion(id, p.Pos.Add(physics.Vector2D{X: pCfg.InitialMinionOffset, Y: 0}))
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
		w.RemovedEntityIDs = append(w.RemovedEntityIDs, mID)
		delete(w.Minions, mID)
	}
	w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
	delete(w.Players, id)
}

func (w *GameWorld) UpdateInput(id uint16, keys uint8, angle float32, upgradeSelect uint8, deleteSlotSelect uint8) {
	select {
	case w.inputChan <- InputEvent{PlayerID: id, Keys: keys, Angle: angle, Upgrade: upgradeSelect, Delete: deleteSlotSelect}:
	default:
	}
}

func (w *GameWorld) rollUpgradeCards(p *Player) {
	upgCfg := GetUpgradesConfig()
	available := make([]uint8, 0, len(upgCfg.Cards))
	for _, card := range upgCfg.Cards {
		available = append(available, card.ID)
	}
	w.rand.Shuffle(len(available), func(i, j int) {
		available[i], available[j] = available[j], available[i]
	})
	p.CardChoices[0] = available[0]
	p.CardChoices[1] = available[1]
	p.CardChoices[2] = available[2]
}

func (w *GameWorld) applyCardUpgrade(p *Player, choiceIndex uint8) {
	if p.UpgradePoints == 0 || choiceIndex < 1 || choiceIndex > 3 {
		return
	}
	cardID := p.CardChoices[choiceIndex-1]

	upgCfg := GetUpgradesConfig()
	var cardCfg *UpgradeCardConfig
	for _, c := range upgCfg.Cards {
		if c.ID == cardID {
			cardCfg = &c
			break
		}
	}

	if cardCfg != nil {
		switch cardCfg.Type {
		case "StatSpeed":
			if p.StatSpeed < cardCfg.MaxLevel {
				p.StatSpeed++
			}
		case "Vampirism":
			p.Vampirism += cardCfg.Value
		case "StatMaxHP":
			if p.StatMaxHP < cardCfg.MaxLevel {
				p.StatMaxHP++
				p.MaxHealth = upgCfg.GlobalMultipliers.BaseMaxHP + float64(p.StatMaxHP)*upgCfg.GlobalMultipliers.HPPerLevel
				p.Health = math.Min(p.MaxHealth, p.Health+upgCfg.GlobalMultipliers.HPPerLevel)
			}
		case "StatRegen":
			if p.StatRegen < cardCfg.MaxLevel {
				p.StatRegen++
			}
		case "StatMinionDmg":
			if p.StatMinionDmg < cardCfg.MaxLevel {
				p.StatMinionDmg++
			}
		case "StatMinionSpeed":
			if p.StatMinionSpeed < cardCfg.MaxLevel {
				p.StatMinionSpeed++
			}
		case "StatMinionHP":
			if p.StatMinionHP < cardCfg.MaxLevel {
				p.StatMinionHP++
			}
		case "StatMinionPierce":
			if p.StatMinionPierce < cardCfg.MaxLevel {
				p.StatMinionPierce++
			}
		case "StatMinionRegen":
			if p.StatMinionRegen < cardCfg.MaxLevel {
				p.StatMinionRegen++
			}
		case "OrbitShield":
			shields := (p.StateFlags >> 4) & 0xF
			if shields < uint32(cardCfg.MaxLevel) {
				shields++
			}
			p.StateFlags = (p.StateFlags & 0xFFFFFF0F) | (shields << 4)
				case "StatDamageMod":
			if p.StatDamageMod < cardCfg.MaxLevel {
				p.StatDamageMod++
			}
		case "StatCooldownMod":
			if p.StatCooldownMod < cardCfg.MaxLevel {
				p.StatCooldownMod++
			}
		case "StatCritChance":
			if p.StatCritChance < cardCfg.MaxLevel {
				p.StatCritChance++
			}
		case "StatCritDamage":
			if p.StatCritDamage < cardCfg.MaxLevel {
				p.StatCritDamage++
			}
		case "StatCritDefiance":
			if p.StatCritDefiance < cardCfg.MaxLevel {
				p.StatCritDefiance++
			}
		case "StatAddProjectiles":
			if p.StatAddProjectiles < cardCfg.MaxLevel {
				p.StatAddProjectiles++
			}
		case "StatPierceCount":
			if p.StatPierceCount < cardCfg.MaxLevel {
				p.StatPierceCount++
			}
		case "StatSpread":
			if p.StatSpread < cardCfg.MaxLevel {
				p.StatSpread++
			}
		case "StatExpMod":
			if p.StatExpMod < cardCfg.MaxLevel {
				p.StatExpMod++
			}
		case "StatLootQuantity":
			if p.StatLootQuantity < cardCfg.MaxLevel {
				p.StatLootQuantity++
			}
		case "StatLootQuality":
			if p.StatLootQuality < cardCfg.MaxLevel {
				p.StatLootQuality++
			}
		case "PickupItemRadius":
			if p.StatPickupItemRadius < cardCfg.MaxLevel {
				p.StatPickupItemRadius++
			}
		case "StatThorns":
			if p.StatThorns < cardCfg.MaxLevel {
				p.StatThorns++
			}
		case "FlagUnlock":
			p.StateFlags |= uint32(cardCfg.Value)
		}
	}

	p.UpgradePoints--
	if p.UpgradePoints > 0 {
		w.rollUpgradeCards(p)
	} else {
		p.CardChoices = [3]uint8{0, 0, 0}
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
					w.applyCardUpgrade(p, ev.Upgrade)
				}
				if ev.Delete != 0 {
					itemID := uint16(ev.Delete)
					if p.Inventory[itemID] > 0 {
						p.Inventory[itemID]--
						if p.Inventory[itemID] <= 0 {
							delete(p.Inventory, itemID)
						}
						p.invDirty = true
					}
				}
			}
		default:
			return
		}
	}
}

func (w *GameWorld) updatePlayers(dt float64) {
	pCfg := GetPlayerConfig()
	combatCfg := GetCombatConfig()
	for _, p := range w.Players {
		if !p.Alive {
			continue
		}
		if p.Health <= 0 {
			p.Alive = false
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, p.ID)
			for _, mID := range p.MinionIDs {
				w.RemovedEntityIDs = append(w.RemovedEntityIDs, mID)
				delete(w.Minions, mID)
			}
			p.MinionIDs = nil
			continue
		}
		if p.FlashTimer > 0 {
			p.FlashTimer -= dt
			if p.FlashTimer <= 0 {
				p.StateFlags &^= 2
			} else {
				p.StateFlags |= 2
			}
		} else {
			if p.ClassID != 0 || p.SkillDuration <= 0 {
				p.StateFlags &^= 2
			}
		}

		if p.SkillCooldown > 0 {
			p.SkillCooldown -= dt
		}
		if p.AegisCooldown > 0 {
			p.AegisCooldown -= dt
		}
		if p.AegisShieldTimer > 0 {
			p.AegisShieldTimer -= dt
			if p.AegisShieldTimer <= 0 {
				p.StateFlags &^= 8
			}
		}
		if p.SkillDuration > 0 {
			p.SkillDuration -= dt
			if p.ClassID == 0 && (p.StateFlags&4096) != 0 && int(p.SkillDuration*60.0)%3 == 0 {
				fID := w.GenerateID()
				f := w.fieldPool.Get().(*ChronoField)
				*f = ChronoField{}
				f.ID = fID
				f.OwnerID = p.ID
				f.Pos = p.Pos
				f.Radius = 60.0
				f.Duration = 2.0
				w.Fields[fID] = f
			}
			if p.SkillDuration <= 0 {
				if p.ClassID == 0 {
					p.StateFlags &^= 2
				}
			}
		}

		if p.Keys&0x10 != 0 && p.SkillCooldown <= 0 && p.SkillDuration <= 0 {
			var itemCDMod float64
			if count, ok := p.Inventory[23]; ok {
				itemCDMod -= 0.10 * float64(count)
			}
			if count, ok := p.Inventory[27]; ok {
				itemCDMod -= 0.15 * float64(count)
			}
			cdReduction := (1.0 + float64(p.StatCooldownMod)*pCfg.CooldownReductionPerLevel) * (1.0 + itemCDMod)

			if p.Inventory[27] > 0 {
				dir := physics.Vector2D{X: math.Cos(p.MouseAngle), Y: math.Sin(p.MouseAngle)}
				p.Pos = p.Pos.Add(dir.Mul(150.0))
			}
			if p.Inventory[15] > 0 {
				for i := 0; i < 12; i++ {
					angle := (float64(i) / 12.0) * 2.0 * math.Pi
					bID := w.GenerateID()
					b := w.bulletPool.Get().(*Bullet)
					*b = Bullet{}
					b.ID = bID
					b.OwnerID = p.ID
					b.OwnerType = 0
					b.Subtype = 0
					dir := physics.Vector2D{X: math.Cos(angle), Y: math.Sin(angle)}
					b.Pos = p.Pos.Add(dir.Mul(p.Radius + 5))
					b.PrevPos = b.Pos
					b.Vel = dir.Mul(12.0)
					b.Radius = 5.0
					b.Damage = 15.0
					b.Lifetime = 1.5
					b.Pierce = 1
					w.Bullets[bID] = b
				}
			}
			switch p.ClassID {
			case 0:
				p.SkillDuration = 0.25
				p.SkillCooldown = 3.0 * cdReduction
				p.StateFlags |= 2
				dir := physics.Vector2D{X: math.Cos(p.MouseAngle), Y: math.Sin(p.MouseAngle)}
				p.Vel = dir.Mul(22.0)
			case 1:
				p.SkillDuration = 2.0
				p.SkillCooldown = 8.0 * cdReduction
			case 2:
				p.SkillDuration = 0.1
				p.SkillCooldown = 7.0 * cdReduction
				fID := w.GenerateID()
				f := w.fieldPool.Get().(*ChronoField)
				*f = ChronoField{}
				f.ID = fID
				f.OwnerID = p.ID
				f.Pos = p.Pos
				f.Radius = 200.0
				f.Duration = 5.0
				w.Fields[fID] = f
			case 3:
				p.SkillDuration = 0.1
				p.SkillCooldown = 10.0 * cdReduction
				for i := 0; i < 3; i++ {
					angle := (float64(i) / 3.0) * 2.0 * math.Pi
					offsetPos := p.Pos.Add(physics.Vector2D{X: math.Cos(angle) * 50.0, Y: math.Sin(angle) * 50.0})
					w.spawnDrone(p.ID, offsetPos)
				}
			case 4:
				p.SkillDuration = 3.0
				p.SkillCooldown = 6.0 * cdReduction
				for _, mob := range w.Mobs {
					distSq := mob.Pos.Sub(p.Pos).LengthSq()
					if distSq < 250.0*250.0 {
						dir := mob.Pos.Sub(p.Pos).Normalize()
						mob.Vel = mob.Vel.Add(dir.Mul(15.0))
					}
				}
				if (p.StateFlags & 32768) != 0 {
					fID := w.GenerateID()
					f := w.fieldPool.Get().(*ChronoField)
					*f = ChronoField{}
					f.ID = fID
					f.OwnerID = p.ID
					f.Pos = p.Pos
					f.Radius = 250.0
					f.Duration = 4.0
					w.Fields[fID] = f
				}
			}
		}

		if p.UpgradePoints > 0 && p.CardChoices[0] == 0 {
			w.rollUpgradeCards(p)
		}

		upgCfg := GetUpgradesConfig()

		baseMaxHP := upgCfg.GlobalMultipliers.BaseMaxHP + float64(p.StatMaxHP)*upgCfg.GlobalMultipliers.HPPerLevel
		var totalFlatHP, totalPercentHP float64
		for itemID, count := range p.Inventory {
			if count <= 0 {
				continue
			}
			if mod, ok := GetItemModifier(itemID); ok {
				totalFlatHP += mod.StatModifiers.FlatHP * float64(count)
				totalPercentHP += mod.StatModifiers.PercentHP * float64(count)
			}
		}
		p.MaxHealth = (baseMaxHP + totalFlatHP) * (1.0 + totalPercentHP)
		if p.Health > p.MaxHealth {
			p.Health = p.MaxHealth
		}

		speedMul := 1.0 + float64(p.StatSpeed)*upgCfg.GlobalMultipliers.SpeedPerLevel
		var itemSpeedMul float64
		for itemID, count := range p.Inventory {
			if count <= 0 {
				continue
			}
			if mod, ok := GetItemModifier(itemID); ok {
				itemSpeedMul += mod.StatModifiers.PercentSpeed * float64(count)
			}
		}
		speedMul *= (1.0 + itemSpeedMul)

		var ax, ay float64
		accel := pCfg.MoveAcceleration
		if p.Keys&0x01 != 0 {
			ay -= accel * speedMul
		}
		if p.Keys&0x02 != 0 {
			ax -= accel * speedMul
		}
		if p.Keys&0x04 != 0 {
			ay += accel * speedMul
		}
		if p.Keys&0x08 != 0 {
			ax += accel * speedMul
		}
		p.Vel = p.Vel.Add(physics.Vector2D{X: ax, Y: ay})
		p.Vel = p.Vel.Mul(pCfg.Friction)

		if p.ClassID == 0 && p.SkillDuration > 0 {
			dir := physics.Vector2D{X: math.Cos(p.MouseAngle), Y: math.Sin(p.MouseAngle)}
			p.Vel = dir.Mul(22.0)
		}

		numShields := (p.StateFlags >> 4) & 0xF
		if numShields > 0 {
			for i := uint32(0); i < numShields; i++ {
				orbitAngle := w.ElapsedTime*3.0 + (float64(i)/float64(numShields))*2.0*math.Pi
				shieldPos := p.Pos.Add(physics.Vector2D{X: math.Cos(orbitAngle) * combatCfg.ShieldOrbitRadius, Y: math.Sin(orbitAngle) * combatCfg.ShieldOrbitRadius})
				for _, mob := range w.Mobs {
					distSq := mob.Pos.Sub(shieldPos).LengthSq()
					radSum := mob.Radius + combatCfg.ShieldBallRadius
					if distSq < radSum*radSum {
						dmg := upgCfg.GlobalMultipliers.ShieldDamagePerSecond * dt
						mob.Health -= dmg
						if p.Vampirism > 0 {
							p.Health = math.Min(p.MaxHealth, p.Health+dmg*p.Vampirism)
						}
					}
				}
			}
		}

		if p.ShootCooldown > 0 {
			p.ShootCooldown -= dt
		}
		if p.Keys&0x20 != 0 && p.ShootCooldown <= 0 {
			var bSpeed, bRadius, bDamage, bLifetime float64
			var bPierce int
			var bSubtype uint8

			classCfg, ok := GetClassConfig(p.ClassID)
			if !ok {
				var okFallback bool
				classCfg, okFallback = GetClassConfig(0)
				if !okFallback {
					log.Println("error: default class config not found")
				}
			}

			shootCooldown := classCfg.ShootCooldown * (1.0 + float64(p.StatCooldownMod)*pCfg.CooldownReductionPerLevel)
			if p.ClassID == 1 && p.SkillDuration > 0 {
				shootCooldown = 0.05
			}
			p.ShootCooldown = shootCooldown
			bSpeed = classCfg.BulletSpeed
			bRadius = classCfg.BulletRadius
			bDamage = classCfg.BulletDamage * (1.0 + float64(p.StatMinionDmg)*upgCfg.GlobalMultipliers.MinionDamagePerLevel + float64(p.StatDamageMod)*pCfg.DamageModPerLevel)
			bLifetime = classCfg.BulletLifetime
			bPierce = classCfg.BulletPierce + int(p.StatPierceCount)
			if p.ClassID == 1 && p.SkillDuration > 0 && (p.StateFlags&8192) != 0 {
				bPierce += 5
			}
			bSubtype = classCfg.BulletSubtype

			var totalFlatDmg, totalPercentDmg float64
			addProjectiles := int(p.StatAddProjectiles)
			for itemID, count := range p.Inventory {
				if count <= 0 {
					continue
				}
				if mod, ok := GetItemModifier(itemID); ok {
					totalFlatDmg += mod.StatModifiers.FlatDamage * float64(count)
					totalPercentDmg += mod.StatModifiers.PercentDamage * float64(count)
					bSpeed += mod.StatModifiers.BulletSpeed * float64(count)
					bPierce += mod.StatModifiers.PierceCount * count
					addProjectiles += mod.StatModifiers.AddProjectiles * count
				}
			}
			bDamage = (bDamage + totalFlatDmg) * (1.0 + totalPercentDmg)

			totalProjectiles := 1 + addProjectiles
			angleStep := pCfg.AngleStep + float64(p.StatSpread)*pCfg.AngleSpreadPerLevel
			startAngle := p.MouseAngle - angleStep*float64(totalProjectiles-1)/2.0

			for i := 0; i < totalProjectiles; i++ {
				angle := startAngle + float64(i)*angleStep
				bID := w.GenerateID()
				b := w.bulletPool.Get().(*Bullet)
				*b = Bullet{}
				b.ID = bID
				b.OwnerID = p.ID
				b.OwnerType = 0
				b.Subtype = bSubtype
				dir := physics.Vector2D{X: math.Cos(angle), Y: math.Sin(angle)}
				b.Pos = p.Pos.Add(dir.Mul(p.Radius + 5))
				b.PrevPos = b.Pos
				b.Vel = dir.Mul(bSpeed)
				b.Radius = bRadius
				b.Damage = bDamage
				b.Lifetime = bLifetime
				b.Pierce = bPierce
				w.Bullets[bID] = b
			}
		}

		p.Pos = p.Pos.Add(p.Vel)
		physics.ResolveCircleBox(
			physics.Circle{Pos: &p.Pos, Vel: &p.Vel, Radius: p.Radius},
			physics.Box{MinX: 0, MinY: 0, MaxX: w.Width, MaxY: w.Height},
			0.2,
		)

		var itemRegen float64
		for itemID, count := range p.Inventory {
			if count > 0 {
				if mod, ok := GetItemModifier(itemID); ok {
					itemRegen += mod.StatModifiers.Regen * float64(count)
				}
			}
		}

		if (p.StatRegen > 0 || itemRegen > 0) && p.Health < p.MaxHealth {
			regenRate := float64(p.StatRegen)*upgCfg.GlobalMultipliers.RegenPerLevel + itemRegen
			p.RegenAccum += regenRate * dt
			if p.RegenAccum >= 1.0 {
				heal := math.Floor(p.RegenAccum)
				p.Health = math.Min(p.MaxHealth, p.Health+heal)
				p.RegenAccum -= heal
			}
		}
	}
}

func (w *GameWorld) UpgradePlayerClass(id uint16, classID uint8) {
}

func (w *GameWorld) AwardXP(playerID uint16, xpValue uint32) {
	combatCfg := GetCombatConfig()
	p, ok := w.Players[playerID]
	if !ok || !p.Alive {
		return
	}
	var itemExpMod float64
	for itemID, count := range p.Inventory {
		if count > 0 {
			if mod, ok := GetItemModifier(itemID); ok {
				itemExpMod += mod.StatModifiers.ExpMod * float64(count)
			}
		}
	}
	gainedXP := uint32(float64(xpValue) * combatCfg.XPGainMultiplier * (1.0 + float64(p.StatExpMod)*combatCfg.XPPerLevelMultiplier + itemExpMod))
	if gainedXP == 0 && xpValue > 0 {
		gainedXP = 1
	}
	p.XP += gainedXP
	p.Score += gainedXP
	for p.XP >= p.MaxXP {
		p.XP -= p.MaxXP
		p.Level++
		p.MaxXP = uint32(float64(p.MaxXP) * combatCfg.LevelUpXPMultiplier)
		p.Health = p.MaxHealth
		p.UpgradePoints++
	}
}
