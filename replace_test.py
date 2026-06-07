import re

with open('ts-client/src/protocol.test.ts', 'r') as f:
    content = f.read()

content = content.replace('Array(32)', 'Array(200)')
content = content.replace('view.setUint16(71', 'view.setUint16(239')
content = content.replace('ArrayBuffer(73 + 26)', 'ArrayBuffer(241 + 26)')
content = content.replace('offset = 73', 'offset = 241')
content = content.replace('ArrayBuffer(72)', 'ArrayBuffer(240)')

with open('ts-client/src/protocol.test.ts', 'w') as f:
    f.write(content)

print("Test updated")
