import re

with open('go-server/game/collision.go', 'r') as f:
    content = f.read()

content = content.replace('w.triggerOnKillEffects(p.ID, m)', 'm.KillerID = p.ID\n\t\t\t\t\tw.triggerOnKillEffects(p.ID, m)')
content = content.replace('w.triggerOnKillEffects(bullet.OwnerID, m)', 'm.KillerID = bullet.OwnerID\n\t\t\t\t\tw.triggerOnKillEffects(bullet.OwnerID, m)')

with open('go-server/game/collision.go', 'w') as f:
    f.write(content)

with open('go-server/game/mob.go', 'r') as f:
    content = f.read()

content = content.replace('w.dropLoot(m.Pos, m.Rarity, m.Type, 0)', 'w.dropLoot(m.Pos, m.Rarity, m.Type, m.KillerID)')

with open('go-server/game/mob.go', 'w') as f:
    f.write(content)

print("done")
