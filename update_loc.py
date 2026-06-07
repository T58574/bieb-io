import json

with open('ts-client/src/items_localization.json', 'r') as f:
    loc = json.load(f)

loc['items']['5'] = { "name": "ПЛАСТИНА ХП", "color": "#10b981", "desc": "+10 ХП", "abbrev": "HP\nPlat", "rarity": "Common" }
loc['items']['6'] = { "name": "РЕАКТОР", "color": "#10b981", "desc": "+10% Макс ХП", "abbrev": "Max\nHP", "rarity": "Common" }
loc['items']['7'] = { "name": "РАДИАТОР", "color": "#fbbf24", "desc": "+2 Урон\n+5% Скор", "abbrev": "Rad\nIat", "rarity": "Rare" }
loc['items']['8'] = { "name": "УСКОРИТЕЛЬ", "color": "#fbbf24", "desc": "+1.5 СкорСнар\n+10% Урон", "abbrev": "Acc\nEl", "rarity": "Rare" }
loc['items']['9'] = { "name": "КРОВОПИЙЦА", "color": "#d946ef", "desc": "+10% Вамп\n+15% ХП", "abbrev": "Vamp\nBat", "rarity": "Unique" }
loc['items']['10'] = { "name": "БУР", "color": "#d946ef", "desc": "+1 Пробитие\n+20% Урон", "abbrev": "Dril\nEr", "rarity": "Unique" }
loc['items']['11'] = { "name": "ДВУСТВОЛ", "color": "#d946ef", "desc": "+1 Снаряд\n+5 Урон", "abbrev": "Duo\nGun", "rarity": "Unique" }
loc['items']['12'] = { "name": "ТРИСТВОЛ", "color": "#f97316", "desc": "+2 Снаряда\n+2 Пробитие\n+25% Урон\n-10% Скор", "abbrev": "Tri\nGun", "rarity": "Legendary" }
loc['items']['13'] = { "name": "АЭГИС", "color": "#f97316", "desc": "+15% Вамп\n+30% Макс ХП\n+50 ХП\n+15% Скор", "abbrev": "Aeg\nIs", "rarity": "Legendary" }
loc['items']['14'] = { "name": "АННИГИЛЯТОР", "color": "#f97316", "desc": "+3 СкорСнар\n+50% Урон\n+1 Снаряд\n+1 Пробитие", "abbrev": "Ann\nIhi", "rarity": "Legendary" }

with open('ts-client/src/items_localization.json', 'w') as f:
    json.dump(loc, f, indent=2, ensure_ascii=False)

print("Loc updated")
