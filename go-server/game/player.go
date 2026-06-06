package game

import (
	"math"

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
}

func (w *GameWorld) AddPlayer(id uint16, username string) *Player {
	w.mu.Lock()
	defer w.mu.Unlock()
	p := &Player{
		ID:          id,
		Username:    username,
		Pos:         physics.Vector2D{X: w.Width / 2, Y: w.Height / 2},
		Radius:      24,
		Health:      100,
		MaxHealth:   100,
		XP:          0,
		MaxXP:       60,
		Level:       1,
		Score:       0,
		Alive:       true,
		ClassID:     0,
		Mass:        1.0,
		StateFlags:  0,
		ChargeLevel: 0.0,
	}
	if p.ClassID == 1 {
		p.Mass = 2.5
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

func (w *GameWorld) applyStatUpgrade(p *Player, statID uint8) {
	if p.UpgradePoints == 0 {
		return
	}
	switch statID {
	case 1:
		if p.StatRegen < 7 {
			p.StatRegen++
			p.UpgradePoints--
		}
	case 2:
		if p.StatMaxHP < 7 {
			p.StatMaxHP++
			p.UpgradePoints--
			p.MaxHealth = 100 + float64(p.StatMaxHP)*25
			if p.Health > p.MaxHealth {
				p.Health = p.MaxHealth
			}
		}
	case 3:
		if p.StatSpeed < 7 {
			p.StatSpeed++
			p.UpgradePoints--
		}
	case 4:
		if p.StatMinionDmg < 7 {
			p.StatMinionDmg++
			p.UpgradePoints--
		}
	case 5:
		if p.StatMinionSpeed < 7 {
			p.StatMinionSpeed++
			p.UpgradePoints--
		}
	case 6:
		if p.StatMinionHP < 7 {
			p.StatMinionHP++
			p.UpgradePoints--
			for _, mID := range p.MinionIDs {
				if m, ok := w.Minions[mID]; ok {
					newMax := 35.0 + float64(p.StatMinionHP)*10.0
					m.MaxHealth = newMax
					if m.Health > m.MaxHealth {
						m.Health = m.MaxHealth
					}
				}
			}
		}
	case 7:
		if p.StatMinionPierce < 7 {
			p.StatMinionPierce++
			p.UpgradePoints--
		}
	case 8:
		if p.StatMinionRegen < 7 {
			p.StatMinionRegen++
			p.UpgradePoints--
		}
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
					w.applyStatUpgrade(p, ev.Upgrade)
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
			for _, mID := range p.MinionIDs {
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
		speedMul := 1.0 + float64(p.StatSpeed)*0.08
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
		if p.ChargeLevel > 0 {
			p.ChargeLevel -= dt
		}
		if p.ClassID == 1 && p.Keys&0x10 != 0 && p.ChargeLevel <= 0 {
			dashDir := physics.Vector2D{X: math.Cos(p.MouseAngle), Y: math.Sin(p.MouseAngle)}
			p.Vel = p.Vel.Add(dashDir.Mul(150.0))
			p.ChargeLevel = 2.0
		} else if p.ClassID == 2 {
			if p.Keys&0x20 != 0 {
				p.ChargeLevel += dt
				if p.ChargeLevel > 2.0 {
					p.ChargeLevel = 2.0
				}
				chargePct := math.Min(1.0, p.ChargeLevel/2.0)
				p.StateFlags = (p.StateFlags & 0xFF) | (uint32(chargePct*100) << 8)
			} else if p.ChargeLevel > 0 {
				chargePct := math.Min(1.0, p.ChargeLevel/2.0)
				bID := w.GenerateID()
				b := w.bulletPool.Get().(*Bullet)
				*b = Bullet{}
				b.ID = bID
				b.OwnerID = p.ID
				b.OwnerType = 0
				dir := physics.Vector2D{X: math.Cos(p.MouseAngle), Y: math.Sin(p.MouseAngle)}
				b.Pos = p.Pos.Add(dir.Mul(p.Radius + 5))
				b.Vel = dir.Mul(6.0 + 8.0*chargePct)
				b.Radius = 6
				b.Damage = 10.0 + 30.0*chargePct
				b.Lifetime = 2.0
				b.Pierce = 1 + int(4.0*chargePct)
				w.Bullets[bID] = b
				p.ChargeLevel = 0
				p.StateFlags &= 0xFF
			}
		} else if p.ClassID == 3 {
			if p.ShootCooldown > 0 {
				p.ShootCooldown -= dt
			}
			if p.Keys&0x10 != 0 && p.ChargeLevel <= 0 {
				p.StateFlags |= 1
				p.ChargeLevel = 5.0
			}
			if p.Keys&0x20 != 0 && p.ShootCooldown <= 0 {
				p.ShootCooldown = 0.4
				dmg := 15.0
				if p.StateFlags&1 != 0 {
					dmg *= 3.0
					p.StateFlags &^= 1
				}
				bID := w.GenerateID()
				b := w.bulletPool.Get().(*Bullet)
				*b = Bullet{}
				b.ID = bID
				b.OwnerID = p.ID
				b.OwnerType = 0
				dir := physics.Vector2D{X: math.Cos(p.MouseAngle), Y: math.Sin(p.MouseAngle)}
				b.Pos = p.Pos.Add(dir.Mul(p.Radius + 5))
				b.Vel = dir.Mul(12.0)
				b.Radius = 5
				b.Damage = dmg
				b.Lifetime = 1.5
				b.Pierce = 1
				w.Bullets[bID] = b
			}
		} else if p.ClassID == 4 && p.Keys&0x10 != 0 && p.ChargeLevel <= 0 {
			fID := w.GenerateID()
			f := w.fieldPool.Get().(*ChronoField)
			*f = ChronoField{}
			f.ID = fID
			f.OwnerID = p.ID
			f.Pos = p.Pos
			f.Radius = 120.0
			f.Duration = 5.0
			w.Fields[fID] = f
			p.ChargeLevel = 8.0
		}
		if p.StateFlags&1 != 0 && p.ChargeLevel <= 2.0 {
			p.StateFlags &^= 1
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
	if p.Level >= 10 && p.ClassID == 0 && classID >= 1 && classID <= 4 {
		p.ClassID = classID
		if classID == 1 {
			p.Mass = 2.5
		}
	}
}
