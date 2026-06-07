import re

with open('go-server/game/player.go', 'r') as f:
    content = f.read()

# Add stats to Player struct
stats_to_add = """	StatMinionPierce uint16
	StatMinionRegen  uint16
	StatDamageMod    uint16
	StatCooldownMod  uint16
	StatCritChance   uint16
	StatCritDamage   uint16
	StatCritDefiance uint16
	StatAddProjectiles uint16
	StatPierceCount  uint16
	StatSpread       uint16
	StatExpMod       uint16
	StatLootQuantity uint16"""
content = content.replace('	StatMinionPierce uint16\n	StatMinionRegen  uint16', stats_to_add)

# Implement upgrades in applyCardUpgrade
new_cases = """		case "StatDamageMod":
			if p.StatDamageMod < cardCfg.MaxLevel {
				p.StatDamageMod++
			}
		case "StatCooldownMod":
			if p.StatCooldownMod < cardCfg.MaxLevel {
				p.StatCooldownMod++
			}
		case "StatCritChance":
			if p.StatCritChance < cardCfg.MaxLevel {
				p.StatCritChance++
			}
		case "StatCritDamage":
			if p.StatCritDamage < cardCfg.MaxLevel {
				p.StatCritDamage++
			}
		case "StatCritDefiance":
			if p.StatCritDefiance < cardCfg.MaxLevel {
				p.StatCritDefiance++
			}
		case "StatAddProjectiles":
			if p.StatAddProjectiles < cardCfg.MaxLevel {
				p.StatAddProjectiles++
			}
		case "StatPierceCount":
			if p.StatPierceCount < cardCfg.MaxLevel {
				p.StatPierceCount++
			}
		case "StatSpread":
			if p.StatSpread < cardCfg.MaxLevel {
				p.StatSpread++
			}
		case "StatExpMod":
			if p.StatExpMod < cardCfg.MaxLevel {
				p.StatExpMod++
			}
		case "StatLootQuantity":
			if p.StatLootQuantity < cardCfg.MaxLevel {
				p.StatLootQuantity++
			}"""

content = re.sub(r'case "StatDamageMod":.*?case "StatLootQuality":', new_cases + '\n\t\tcase "StatLootQuality":', content, flags=re.DOTALL)

# Add to available choices
content = content.replace('available := []uint8{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}', 'available := []uint8{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21}')

# Apply to bullets
bullet_logic = """			p.ShootCooldown = classCfg.ShootCooldown * (1.0 + float64(p.StatCooldownMod)*(-0.01))
			bSpeed = classCfg.BulletSpeed
			bRadius = classCfg.BulletRadius
			bDamage = classCfg.BulletDamage * (1.0 + float64(p.StatMinionDmg)*upgCfg.GlobalMultipliers.MinionDamagePerLevel + float64(p.StatDamageMod)*0.05)
			bLifetime = classCfg.BulletLifetime
			bPierce = classCfg.BulletPierce + int(p.StatPierceCount)
			bSubtype = classCfg.BulletSubtype"""

content = content.replace('			p.ShootCooldown = classCfg.ShootCooldown\n			bSpeed = classCfg.BulletSpeed\n			bRadius = classCfg.BulletRadius\n			bDamage = classCfg.BulletDamage * (1.0 + float64(p.StatMinionDmg)*upgCfg.GlobalMultipliers.MinionDamagePerLevel)\n			bLifetime = classCfg.BulletLifetime\n			bPierce = classCfg.BulletPierce\n			bSubtype = classCfg.BulletSubtype', bullet_logic)

content = content.replace('addProjectiles := 0', 'addProjectiles := int(p.StatAddProjectiles)')
content = content.replace('angleStep := 0.15', 'angleStep := 0.15 + float64(p.StatSpread)*0.05')


with open('go-server/game/player.go', 'w') as f:
    f.write(content)

with open('go-server/game/collision.go', 'r') as f:
    content = f.read()

# Apply to orb XP
xp_code = """				gainedXP := uint32(float64(o.XPValue) * 0.75 * (1.0 + float64(p.StatExpMod)*0.01))"""
content = content.replace('				gainedXP := uint32(float64(o.XPValue) * 0.75)', xp_code)

# Apply to crit hit
crit_logic = """				isCrit := false
				critChance := 0.20
				critMultiplier := 2.0
				if p, okP := w.Players[bullet.OwnerID]; okP && p.Alive {
					critChance += float64(p.StatCritChance) * 0.05
					critMultiplier += float64(p.StatCritDamage) * 0.05
				}

				if bullet.Subtype == 2 && w.rand.Float64() < critChance {
					isCrit = true
					dmg *= critMultiplier
				}"""
content = content.replace('				isCrit := false\n				if bullet.Subtype == 2 && w.rand.Float64() < 0.20 {\n					isCrit = true\n					dmg *= 2.0\n				}', crit_logic)

# Apply to dmg defiance
defiance_logic = """				dmgToPlayer := m.Damage * 0.12 * (1.0 - math.Min(0.5, float64(p.StatCritDefiance)*0.05))"""
content = content.replace('				dmgToPlayer := m.Damage * 0.12', defiance_logic)

defiance_logic2 = """				dmgToPlayer := bullet.Damage * (1.0 - math.Min(0.5, float64(p.StatCritDefiance)*0.05))"""
content = content.replace('				dmgToPlayer := bullet.Damage', defiance_logic2)


with open('go-server/game/collision.go', 'w') as f:
    f.write(content)

print("upgrades updated")
