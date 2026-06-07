import re

with open('go-server/game/collision.go', 'r') as f:
    content = f.read()

# Add killerID to triggerOnKillEffects so we can also drop loot there before the mob is removed. Wait, dropLoot is already called in updateMobs when mob dies.
# If we want the killer's StatLootQuantity to affect dropLoot, we should store killerID in Mob struct when it takes fatal damage.
pass
