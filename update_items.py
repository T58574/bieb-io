import json

with open('go-server/config/items.json', 'r') as f:
    items = json.load(f)

new_items = [
  { "ID": 5, "Rarity": 1, "StatModifiers": { "FlatHP": 10.0 } },
  { "ID": 6, "Rarity": 1, "StatModifiers": { "PercentHP": 0.10 } },
  { "ID": 7, "Rarity": 2, "StatModifiers": { "FlatDamage": 2.0, "PercentSpeed": 0.05 } },
  { "ID": 8, "Rarity": 2, "StatModifiers": { "BulletSpeed": 1.5, "PercentDamage": 0.10 } },
  { "ID": 9, "Rarity": 3, "StatModifiers": { "Vampirism": 0.10, "PercentHP": 0.15 } },
  { "ID": 10, "Rarity": 3, "StatModifiers": { "PierceCount": 1, "PercentDamage": 0.20 } },
  { "ID": 11, "Rarity": 3, "StatModifiers": { "AddProjectiles": 1, "FlatDamage": 5.0 } },
  { "ID": 12, "Rarity": 4, "StatModifiers": { "AddProjectiles": 2, "PierceCount": 2, "PercentDamage": 0.25, "PercentSpeed": -0.10 } },
  { "ID": 13, "Rarity": 4, "StatModifiers": { "Vampirism": 0.15, "PercentHP": 0.30, "FlatHP": 50.0, "PercentSpeed": 0.15 } },
  { "ID": 14, "Rarity": 4, "StatModifiers": { "BulletSpeed": 3.0, "PercentDamage": 0.50, "AddProjectiles": 1, "PierceCount": 1 } }
]

items.extend(new_items)

with open('go-server/config/items.json', 'w') as f:
    json.dump(items, f, indent=2)

print("Items updated")
