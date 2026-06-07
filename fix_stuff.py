import json

# Fix unique items giving 3 stats
with open('go-server/config/items.json', 'r') as f:
    items = json.load(f)

for item in items:
    if item['ID'] == 9:
        item['StatModifiers']['PercentSpeed'] = -0.05
    elif item['ID'] == 10:
        item['StatModifiers']['BulletSpeed'] = 2.0
    elif item['ID'] == 11:
        item['StatModifiers']['PierceCount'] = 1

with open('go-server/config/items.json', 'w') as f:
    json.dump(items, f, indent=2)

with open('ts-client/src/items_localization.json', 'r') as f:
    loc = json.load(f)

loc['items']['9']['desc'] = "+10% Вамп\n+15% ХП\n-5% Скор"
loc['items']['10']['desc'] = "+1 Пробитие\n+20% Урон\n+2 СкорСнар"
loc['items']['11']['desc'] = "+1 Снаряд\n+5 Урон\n+1 Пробитие"

with open('ts-client/src/items_localization.json', 'w') as f:
    json.dump(loc, f, indent=2, ensure_ascii=False)


# Fix graphics.ts loop
with open('ts-client/src/graphics.ts', 'r') as f:
    content = f.read()

# We need to find the entity drawing loop. Let's see what was changed
import re
# Look for something that was i < 16 and got replaced by i < 100 but shouldn't have.
# The inventory drawing loop was i < 16 (16 slots originally).
# What else was i < 16? Probably orb drawing loop or minion drawing loop or player drawing loop.
pass
