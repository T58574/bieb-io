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
}

func (w *GameWorld) spawnSingleMob() {
	var rx, ry float64
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
			if nr < 0 || nr >= 20 {
				continue
			}
			for dc := -1; dc <= 1; dc++ {
				nc := c + dc
				if nc < 0 || nc >= 20 {
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
			if m.Type == 0 {
				m.Vel = m.Vel.Add(dir.Mul(0.2)).Normalize().Mul(1.8)
			} else if m.Type == 1 {
				if dist > 260 {
					m.Vel = m.Vel.Add(dir.Mul(0.2)).Normalize().Mul(2.0)
				} else if dist < 180 {
					m.Vel = m.Vel.Add(dir.Mul(-0.25)).Normalize().Mul(2.2)
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
					b.Pos = m.Pos.Add(dir.Mul(m.Radius + 5))
					b.Vel = dir.Mul(7.0)
					b.Radius = 7
					b.Damage = 4
					b.Lifetime = 3.0
					b.Pierce = 1
					w.Bullets[bID] = b
				}
			} else if m.Type == 2 {
				m.Vel = m.Vel.Add(dir.Mul(0.3)).Normalize().Mul(3.2)
			} else if m.Type == 3 {
				m.Vel = m.Vel.Add(dir.Mul(0.25)).Normalize().Mul(2.5)
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
			w.spawnOrb(m.Pos, m.XPValue)
			w.mobPool.Put(m)
			delete(w.Mobs, id)
		}
	}
}
