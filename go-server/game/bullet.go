package game

import (
	"go-server/physics"
)

type Bullet struct {
	ID        uint16
	OwnerID   uint16
	OwnerType uint8
	Subtype   uint8
	Pos       physics.Vector2D
	PrevPos   physics.Vector2D
	Vel       physics.Vector2D
	Radius    float64
	Damage    float64
	Lifetime  float64
	Pierce    int
}

func (w *GameWorld) updateBullets(dt float64) {
	for id, b := range w.Bullets {
		b.PrevPos = b.Pos
		b.Pos = b.Pos.Add(b.Vel)
		b.Lifetime -= dt
		if b.Lifetime <= 0 || b.Pos.X < 0 || b.Pos.X > w.Width || b.Pos.Y < 0 || b.Pos.Y > w.Height {
			w.bulletPool.Put(b)
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.Bullets, id)
		}
	}
}
