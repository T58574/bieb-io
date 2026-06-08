package game

import (
	"go-server/physics"
)

type ChronoField struct {
	ID       uint16
	OwnerID  uint16
	Pos      physics.Vector2D
	Radius   float64
	Duration float64
}

func (w *GameWorld) updateFields(dt float64) {
	for id, f := range w.Fields {
		f.Duration -= dt
		if f.Duration <= 0 {
			w.fieldPool.Put(f)
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.Fields, id)
			continue
		}
		owner, hasOwner := w.Players[f.OwnerID]
		pullActive := hasOwner && (owner.StateFlags&16384) != 0
		hazardActive := hasOwner && (owner.StateFlags&32768) != 0

		for _, m := range w.Mobs {
			distSq := m.Pos.Sub(f.Pos).LengthSq()
			radSum := f.Radius + m.Radius
			if distSq < radSum*radSum {
				m.Vel = m.Vel.Mul(0.2)
				if pullActive {
					pullDir := f.Pos.Sub(m.Pos).Normalize()
					m.Vel = m.Vel.Add(pullDir.Mul(1.5))
				}
				if hazardActive {
					m.Health -= 100.0 * dt
				}
			}
		}
	}
}
