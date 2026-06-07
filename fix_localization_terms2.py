import json
import re

with open('ts-client/src/graphics.ts', 'r') as f:
    content = f.read()

content = content.replace('Увеличение тактовой частоты на +10%', 'Увеличение скорости на +10%')
content = content.replace('Увеличение стабильности ядра на +25', 'Увеличение макс здоровья на +25')
content = content.replace('Увеличение регенерации ядра', 'Увеличение регенерации здоровья')

with open('ts-client/src/graphics.ts', 'w') as f:
    f.write(content)

print("done")
