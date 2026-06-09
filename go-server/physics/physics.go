package physics

import "math"

type Vector2D struct {
	X float64
	Y float64
}

// --- СТАРЫЙ API (для совместимости, чтобы всё не горело) ---

func (v Vector2D) Add(o Vector2D) Vector2D {
	return Vector2D{v.X + o.X, v.Y + o.Y}
}

func (v Vector2D) Sub(o Vector2D) Vector2D {
	return Vector2D{v.X - o.X, v.Y - o.Y}
}

func (v Vector2D) Mul(s float64) Vector2D {
	return Vector2D{v.X * s, v.Y * s}
}

func (v Vector2D) LengthSq() float64 {
	return v.X*v.X + v.Y*v.Y
}

func (v Vector2D) Length() float64 {
	return math.Sqrt(v.X*v.X + v.Y*v.Y)
}

func (v Vector2D) Normalize() Vector2D {
	l := v.Length()
	if l == 0 {
		return Vector2D{0, 0}
	}
	return Vector2D{v.X / l, v.Y / l}
}

// --- НОВЫЙ API (для hot path в физике, без аллокаций) ---

func (v *Vector2D) SetSub(a, b Vector2D) {
	v.X = a.X - b.X
	v.Y = a.Y - b.Y
}

func (v Vector2D) Dot(o Vector2D) float64 {
	return v.X*o.X + v.Y*o.Y
}

type Circle struct {
	Pos    *Vector2D
	Vel    *Vector2D
	Radius float64
	Mass   float64
}

type Box struct {
	MinX float64
	MinY float64
	MaxX float64
	MaxY float64
}

func ResolveCircleCircle(c1, c2 Circle, bounce float64) bool {
	var delta Vector2D
	delta.SetSub(*c2.Pos, *c1.Pos)

	distSq := delta.LengthSq()
	minDist := c1.Radius + c2.Radius
	if distSq >= minDist*minDist {
		return false
	}

	dist := math.Sqrt(distSq)
	if dist == 0 {
		return false
	}

	invDist := 1.0 / dist
	normal := Vector2D{delta.X * invDist, delta.Y * invDist}
	overlap := minDist - dist

	invMass1 := 0.0
	if c1.Mass > 0 {
		invMass1 = 1.0 / c1.Mass
	}
	invMass2 := 0.0
	if c2.Mass > 0 {
		invMass2 = 1.0 / c2.Mass
	}

	totalInvMass := invMass1 + invMass2
	if totalInvMass == 0 {
		return false
	}

	invMassSum := 1.0 / totalInvMass
	sep1 := overlap * invMass1 * invMassSum
	sep2 := overlap * invMass2 * invMassSum

	c1.Pos.X -= normal.X * sep1
	c1.Pos.Y -= normal.Y * sep1
	c2.Pos.X += normal.X * sep2
	c2.Pos.Y += normal.Y * sep2

	relVel := Vector2D{c2.Vel.X - c1.Vel.X, c2.Vel.Y - c1.Vel.Y}
	velAlongNormal := relVel.Dot(normal)
	if velAlongNormal > 0 {
		return true
	}

	impulseScalar := -(1.0 + bounce) * velAlongNormal * invMassSum

	c1.Vel.X -= normal.X * impulseScalar * invMass1
	c1.Vel.Y -= normal.Y * impulseScalar * invMass1
	c2.Vel.X += normal.X * impulseScalar * invMass2
	c2.Vel.Y += normal.Y * impulseScalar * invMass2

	return true
}

func ResolveCircleBox(c Circle, b Box, bounce float64) {
	if c.Pos.X-c.Radius < b.MinX {
		c.Pos.X = b.MinX + c.Radius
		c.Vel.X = -c.Vel.X * bounce
	} else if c.Pos.X+c.Radius > b.MaxX {
		c.Pos.X = b.MaxX - c.Radius
		c.Vel.X = -c.Vel.X * bounce
	}
	if c.Pos.Y-c.Radius < b.MinY {
		c.Pos.Y = b.MinY + c.Radius
		c.Vel.Y = -c.Vel.Y * bounce
	} else if c.Pos.Y+c.Radius > b.MaxY {
		c.Pos.Y = b.MaxY - c.Radius
		c.Vel.Y = -c.Vel.Y * bounce
	}
}
