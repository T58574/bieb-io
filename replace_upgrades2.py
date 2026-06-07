import json

with open('ts-client/src/graphics.ts', 'r') as f:
    content = f.read()

new_cards = """    11: { title: "ЯДРО НЕКРОЗА", color: "#d946ef", desc: "Все ваши снаряды взрывают убитые вирусы", rarity: "Unique" },
    12: { title: "УСИЛИТЕЛЬ УРОНА", color: "#ef4444", desc: "Увеличение урона снарядов на +5%", rarity: "Common" },
    13: { title: "РАЗГОН ОРУЖИЯ", color: "#f97316", desc: "Снижение задержки выстрела на 1%", rarity: "Common" },
    14: { title: "ВЕРОЯТНОСТЬ КРИТА", color: "#f59e0b", desc: "Шанс крит. урона +5%", rarity: "Common" },
    15: { title: "СИЛА КРИТА", color: "#eab308", desc: "Множитель крит. урона +5%", rarity: "Common" },
    16: { title: "КИНЕТИЧЕСКИЙ БАРЬЕР", color: "#84cc16", desc: "Снижение получаемого урона на 5%", rarity: "Common" },
    17: { title: "МНОЖИТЕЛЬ СНАРЯДОВ", color: "#22c55e", desc: "+1 доп. снаряд", rarity: "Rare" },
    18: { title: "БРОНЕБОЙНОСТЬ", color: "#10b981", desc: "+1 пробитие снарядов", rarity: "Rare" },
    19: { title: "УГОЛ АТАКИ", color: "#14b8a6", desc: "Увеличение разброса на +5%", rarity: "Common" },
    20: { title: "ОБУЧЕНИЕ НЕЙРОСЕТИ", color: "#0ea5e9", desc: "Получаемый опыт +1%", rarity: "Common" },
    21: { title: "КВАНТОВЫЙ АНАЛИЗАТОР", color: "#6366f1", desc: "Шанс дропа предметов +5%", rarity: "Common" }"""
content = content.replace('    11: { title: "ЯДРО НЕКРОЗА", color: "#d946ef", desc: "Все ваши снаряды взрывают убитые вирусы", rarity: "Unique" }', new_cards)

with open('ts-client/src/graphics.ts', 'w') as f:
    f.write(content)

print("done")
