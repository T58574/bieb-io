import re

with open('ts-client/src/graphics.ts', 'r') as f:
    content = f.read()

# Fix the shape drawing loop
old_code = """          for (let i = 0; i < 100; i++) {
            const a = (i * 2 * Math.PI) / 16;
            const curR = i % 2 === 0 ? r : r * 0.65;
            c.lineTo(Math.cos(a) * curR, Math.sin(a) * curR);
          }"""

new_code = """          for (let i = 0; i < 16; i++) {
            const a = (i * 2 * Math.PI) / 16;
            const curR = i % 2 === 0 ? r : r * 0.65;
            c.lineTo(Math.cos(a) * curR, Math.sin(a) * curR);
          }"""

content = content.replace(old_code, new_code)

with open('ts-client/src/graphics.ts', 'w') as f:
    f.write(content)

print("fixed graphics")
