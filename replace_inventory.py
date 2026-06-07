import re

with open('go-server/game/player.go', 'r') as f:
    content = f.read()

content = content.replace('make([]uint8, 32)', 'make([]uint8, 200)')
content = content.replace('idx < 32', 'idx < 200')

with open('go-server/game/player.go', 'w') as f:
    f.write(content)

with open('go-server/protocol/protocol.go', 'r') as f:
    content = f.read()

content = content.replace('bufSize := 73 + count*26 + removedCount*2', 'bufSize := 241 + count*26 + removedCount*2')
content = content.replace('i < 32', 'i < 200')
content = content.replace('buf[71:73]', 'buf[239:241]')
content = content.replace('offset := 73', 'offset := 241')

with open('go-server/protocol/protocol.go', 'w') as f:
    f.write(content)

with open('ts-client/src/protocol.ts', 'r') as f:
    content = f.read()

content = content.replace('if (view.byteLength < 73) return null;', 'if (view.byteLength < 241) return null;')
content = content.replace('i < 32', 'i < 200')
content = content.replace('view.getUint16(71, true)', 'view.getUint16(239, true)')
content = content.replace('let offset = 73;', 'let offset = 241;')

with open('ts-client/src/protocol.ts', 'w') as f:
    f.write(content)

with open('ts-client/src/state.ts', 'r') as f:
    content = f.read()

content = content.replace('Array(32)', 'Array(200)')

with open('ts-client/src/state.ts', 'w') as f:
    f.write(content)

with open('ts-client/src/graphics.ts', 'r') as f:
    content = f.read()

content = content.replace('i < 16', 'i < 100')

with open('ts-client/src/graphics.ts', 'w') as f:
    f.write(content)

with open('ts-client/src/input.ts', 'r') as f:
    content = f.read()

content = content.replace('i < 16', 'i < 100')

with open('ts-client/src/input.ts', 'w') as f:
    f.write(content)

print("Done")
