import re

with open('go-server/game/mob.go', 'r') as f:
    content = f.read()

# I accidentally replaced the wrong 'roll := w.rand.Float64()'
bad_code = """	var mobType uint8
	roll := w.rand.Float64()

	if killer, ok := w.Players[killerID]; ok && killer.Alive {
		roll += roll * float64(killer.StatLootQuantity) * 0.05
	}"""

good_code = """	var mobType uint8
	roll := w.rand.Float64()"""

content = content.replace(bad_code, good_code)

with open('go-server/game/mob.go', 'w') as f:
    f.write(content)

print("fixed mob")
