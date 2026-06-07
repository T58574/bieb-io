import json

with open('ts-client/src/items_localization.json', 'r') as f:
    loc = json.load(f)

# The user explicitly directive: "Use standard, easily understandable gaming terminology for stats and UI (e.g., 'Скорость', 'Урон', 'Здоровье') in the localization dictionary (items_localization.json) rather than complex or sci-fi/lore-specific words (like 'Частота', 'Вычисления', 'Интегрити')."

loc['ui']['stats']['hp'] = "ЗДОРОВЬЕ"
loc['ui']['stats']['speed'] = "СКОРОСТЬ"
loc['ui']['stats']['damage'] = "УРОН"

loc['items']['1']['desc'] = "+10% Скорость"
loc['items']['2']['desc'] = "+15% Урон\n+5% Вамп"

with open('ts-client/src/items_localization.json', 'w') as f:
    json.dump(loc, f, indent=2, ensure_ascii=False)

print("Terms fixed")
