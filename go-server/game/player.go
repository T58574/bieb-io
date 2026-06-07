package game

import (
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
	ShootCooldown    float64
	FlashTimer       float64
	CardChoices      [3]uint8
	Inventory        map[uint16]int
	invCache         []uint8
	invDirty         bool
	Vampirism        float64
	LaserHitsCount   map[uint16]uint8
}


func (p *Player) GetInventoryArray() []uint8 {
	if !p.invDirty && p.invCache != nil {
		return p.invCache
	}

	var keys []int
	for k := range p.Inventory {
		keys = append(keys, int(k))
	}
	sort.Ints(keys)

	invList := make([]uint8, 32)
	idx := 0
	for _, k := range keys {
		id := uint16(k)
		count := p.Inventory[id]
		if count > 0 && idx < 32 {
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

func (w *GameWorld) AddPlayer(id uint16, username string) *Player {
	w.mu.Lock()
	defer w.mu.Unlock()
	p := &Player{
		ID:             id,
		Username:       username,
		Pos:            physics.Vector2D{X: w.Width / 2, Y: w.Height / 2},
		Radius:         24,
		Health:         100,
		MaxHealth:      100,
		XP:             0,
		MaxXP:          60,
		Level:          1,
		Score:          0,
		Alive:          true,
		ClassID:        0,
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
	available := []uint8{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}
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
	switch cardID {
	case 1:
		if p.StatSpeed < 7 {
			p.StatSpeed++
		}
	case 2:
		p.Vampirism += 0.05
	case 3:
		if p.StatMaxHP < 7 {
			p.StatMaxHP++
			p.MaxHealth = 100 + float64(p.StatMaxHP)*25
			p.Health = math.Min(p.MaxHealth, p.Health+25)
		}
	case 4:
		if p.StatRegen < 7 {
			p.StatRegen++
		}
	case 5:
		if p.StatMinionDmg < 7 {
			p.StatMinionDmg++
		}
	case 6:
		if p.StatMinionSpeed < 7 {
			p.StatMinionSpeed++
		}
	case 7:
		if p.StatMinionHP < 7 {
			p.StatMinionHP++
		}
	case 8:
		if p.StatMinionPierce < 7 {
			p.StatMinionPierce++
		}
	case 9:
		if p.StatMinionRegen < 7 {
			p.StatMinionRegen++
		}
	case 10:
		shields := (p.StateFlags >> 4) & 0xF
		if shields < 4 {
			shields++
		}
		p.StateFlags = (p.StateFlags & 0xFFFFFF0F) | (shields << 4)
	case 11:
		p.StateFlags |= 1 << 8
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
			p.StateFlags &^= 2
		}
		if p.UpgradePoints > 0 && p.CardChoices[0] == 0 {
			w.rollUpgradeCards(p)
		}
		baseMaxHP := 100.0 + float64(p.StatMaxHP)*25.0
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

		speedMul := 1.0 + float64(p.StatSpeed)*0.08
		itemSpeedMul := 1.0
		if count, ok := p.Inventory[1]; ok {
			itemSpeedMul += 0.05 * float64(count)
		}
		speedMul *= itemSpeedMul

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

		numShields := (p.StateFlags >> 4) & 0xF
		if numShields > 0 {
			for i := uint32(0); i < numShields; i++ {
				orbitAngle := w.ElapsedTime*3.0 + (float64(i)/float64(numShields))*2.0*math.Pi
				shieldPos := p.Pos.Add(physics.Vector2D{X: math.Cos(orbitAngle) * 55.0, Y: math.Sin(orbitAngle) * 55.0})
				for _, mob := range w.Mobs {
					distSq := mob.Pos.Sub(shieldPos).LengthSq()
					radSum := mob.Radius + 8.0
					if distSq < radSum*radSum {
						dmg := 30.0 * dt
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
				classCfg, _ = GetClassConfig(0)
			}

			p.ShootCooldown = classCfg.ShootCooldown
			bSpeed = classCfg.BulletSpeed
			bRadius = classCfg.BulletRadius
			bDamage = classCfg.BulletDamage * (1.0 + float64(p.StatMinionDmg)*0.15)
			bLifetime = classCfg.BulletLifetime
			bPierce = classCfg.BulletPierce
			bSubtype = classCfg.BulletSubtype

			dmgMul := 1.0
			if count, ok := p.Inventory[2]; ok {
				dmgMul += 0.10 * float64(count)
			}
			bDamage *= dmgMul

			if count, ok := p.Inventory[3]; ok {
				bPierce += count + (count * count) / 2
			}

			addProjectiles := 0
			if count, ok := p.Inventory[4]; ok {
				addProjectiles = count
			}

			totalProjectiles := 1 + addProjectiles
			angleStep := 0.15
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
				b.Vel = dir.Mul(bSpeed)
				b.Radius = bRadius
				b.Damage = bDamage
				b.Lifetime = bLifetime
				b.Pierce = bPierce
				w.Bullets[bID] = b
			}
		}

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

func (w *GameWorld) UpgradePlayerClass(id uint16, classID uint8) {
	w.mu.Lock()
	defer w.mu.Unlock()
	p, exists := w.Players[id]
	if !exists || !p.Alive {
		return
	}
	if (p.Level >= 10 || p.Level == 1) && p.ClassID == 0 && classID >= 1 && classID <= 3 {
		p.ClassID = classID
		if classCfg, ok := GetClassConfig(classID); ok {
			p.Mass = classCfg.Mass
		}
	}
}
