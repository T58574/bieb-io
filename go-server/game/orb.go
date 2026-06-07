package game

import (
	"math"

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
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.Orbs, id)
		}
	}
}

func (w *GameWorld) mergeOrbs() {
	merged := make(map[uint16]bool)
	var keys []uint16
	for id := range w.Orbs {
		keys = append(keys, id)
	}

	for i := 0; i < len(keys); i++ {
		idA := keys[i]
		oA, existsA := w.Orbs[idA]
		if !existsA || merged[idA] {
			continue
		}

		for j := i + 1; j < len(keys); j++ {
			idB := keys[j]
			oB, existsB := w.Orbs[idB]
			if !existsB || merged[idB] {
				continue
			}

			distSq := oA.Pos.Sub(oB.Pos).LengthSq()
			if distSq < 80.0*80.0 {
				oA.XPValue += oB.XPValue
				oA.Radius = math.Min(24.0, 8.0+math.Sqrt(float64(oA.XPValue))*1.2)
				merged[idB] = true
				w.orbPool.Put(oB)
				w.RemovedEntityIDs = append(w.RemovedEntityIDs, idB)
				delete(w.Orbs, idB)
			}
		}
	}
}
