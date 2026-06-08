package physics

import (
	"math"
	"testing"
)

func TestVectorOps(t *testing.T) {
	v1 := Vector2D{3, 4}
	if v1.Length() != 5 {
		t.Errorf("length error")
	}
	v2 := Vector2D{1, 2}
	v3 := v1.Add(v2)
	if v3.X != 4 || v3.Y != 6 {
		t.Errorf("add error")
	}

	v4 := v1.Sub(v2)
	if v4.X != 2 || v4.Y != 2 {
		t.Errorf("sub error: expected {2, 2}, got {%v, %v}", v4.X, v4.Y)
	}

	v5 := v1.Mul(2.0)
	if v5.X != 6 || v5.Y != 8 {
		t.Errorf("mul error: expected {6, 8}, got {%v, %v}", v5.X, v5.Y)
	}

	v6 := v1.Mul(-0.5)
	if v6.X != -1.5 || v6.Y != -2.0 {
		t.Errorf("mul negative error: expected {-1.5, -2.0}, got {%v, %v}", v6.X, v6.Y)
	}

	v7 := v1.Mul(0)
	if v7.X != 0 || v7.Y != 0 {
		t.Errorf("mul zero error: expected {0, 0}, got {%v, %v}", v7.X, v7.Y)
	}
}

func TestResolveCircleCircle(t *testing.T) {
	p1 := Vector2D{0, 0}
	p2 := Vector2D{1.5, 0}
	v1 := Vector2D{1, 0}
	v2 := Vector2D{-1, 0}

	c1 := Circle{Pos: &p1, Vel: &v1, Radius: 1.0, Mass: 1.0}
	c2 := Circle{Pos: &p2, Vel: &v2, Radius: 1.0, Mass: 1.0}

	collided := ResolveCircleCircle(c1, c2, 0.5)
	if !collided {
		t.Errorf("expected collision")
	}
	if p1.X >= 0 {
		t.Errorf("expected separation of p1 to the left, got %f", p1.X)
	}
	if p2.X <= 1.5 {
		t.Errorf("expected separation of p2 to the right, got %f", p2.X)
	}
}

func TestResolveCircleBox(t *testing.T) {
	p := Vector2D{5, 5}
	v := Vector2D{-2, 0}
	c := Circle{Pos: &p, Vel: &v, Radius: 6.0}
	b := Box{MinX: 0, MinY: 0, MaxX: 100, MaxY: 100}
	ResolveCircleBox(c, b, 0.5)
	if p.X != 6.0 {
		t.Errorf("expected X to be clipped to 6.0, got %f", p.X)
	}
	if math.Abs(v.X-1.0) > 1e-6 {
		t.Errorf("expected velocity bounce to flip, got %f", v.X)
	}
}

func TestVectorNormalize(t *testing.T) {
	// Happy path
	v := Vector2D{3, 4}
	norm := v.Normalize()
	if math.Abs(norm.X-0.6) > 1e-6 || math.Abs(norm.Y-0.8) > 1e-6 {
		t.Errorf("expected {0.6, 0.8}, got {%f, %f}", norm.X, norm.Y)
	}

	// Edge case: zero length
	vZero := Vector2D{0, 0}
	normZero := vZero.Normalize()
	if normZero.X != 0 || normZero.Y != 0 {
		t.Errorf("expected {0, 0}, got {%f, %f}", normZero.X, normZero.Y)
	}
}
