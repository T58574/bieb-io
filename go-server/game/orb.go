package game

import (
	"go-server/physics"
)

type ExpOrb struct {
	ID            uint16
	Pos           physics.Vector2D
	Vel           physics.Vector2D
	Radius        float64
	XPValue       uint32
	AttractTarget uint16
}

func (w *GameWorld) spawnOrb(pos physics.Vector2D, xp uint32) {
	oID := w.GenerateID()
	o := w.orbPool.Get().(*ExpOrb)
	*o = ExpOrb{}
	o.ID = oID
	o.Pos = pos.Add(physics.Vector2D{X: w.rand.Float64()*12 - 6, Y: w.rand.Float64()*12 - 6})
	o.Radius = 8
	o.XPValue = xp
	o.AttractTarget = 0
	w.Orbs[oID] = o
}

func (w *GameWorld) updateOrbs(dt float64) {
	for id, o := range w.Orbs {
		if o.AttractTarget != 0 {
			p, ok := w.Players[o.AttractTarget]
			if !ok || !p.Alive {
				o.AttractTarget = 0
			} else {
				dir := p.Pos.Sub(o.Pos).Normalize()
				o.Vel = o.Vel.Add(dir.Mul(0.85)).Normalize().Mul(8.5)
				o.Pos = o.Pos.Add(o.Vel)
			}
		} else {
			var target *Player
			var minDistSq float64 = -1
			for _, p := range w.Players {
				if !p.Alive {
					continue
				}
				distSq := p.Pos.Sub(o.Pos).LengthSq()
				if minDistSq < 0 || distSq < minDistSq {
					minDistSq = distSq
					target = p
				}
			}
			if target != nil {
				o.AttractTarget = target.ID
			}
		}
		if o.Pos.X < 0 || o.Pos.X > w.Width || o.Pos.Y < 0 || o.Pos.Y > w.Height {
			w.orbPool.Put(o)
			delete(w.Orbs, id)
		}
	}
}
