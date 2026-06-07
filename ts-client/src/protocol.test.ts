import { describe, it, expect } from 'vitest';
import { serializeJoin, serializeInput, deserializeMessage } from './protocol';

describe('protocol serialization', () => {
  describe('serializeJoin', () => {
    it('should correctly serialize a username', () => {
      const username = 'testuser';
      const buffer = serializeJoin(username);
      const view = new DataView(buffer);

      expect(buffer.byteLength).toBe(2 + username.length);
      expect(view.getUint8(0)).toBe(1); // Opcode
      expect(view.getUint8(1)).toBe(username.length); // Length

      const textDecoder = new TextDecoder();
      const decodedName = textDecoder.decode(new Uint8Array(buffer, 2));
      expect(decodedName).toBe(username);
    });
  });

  describe('serializeInput', () => {
    it('should correctly serialize input state', () => {
      const keys = 5;
      const mouseAngle = 3.14159;
      const upgradeSelect = 2;
      const deleteSlotSelect = 4;

      const buffer = serializeInput(keys, mouseAngle, upgradeSelect, deleteSlotSelect);
      const view = new DataView(buffer);

      expect(buffer.byteLength).toBe(8);
      expect(view.getUint8(0)).toBe(2);
      expect(view.getUint8(1)).toBe(keys);
      expect(view.getFloat32(2, true)).toBeCloseTo(mouseAngle, 5);
      expect(view.getUint8(6)).toBe(upgradeSelect);
      expect(view.getUint8(7)).toBe(deleteSlotSelect);
    });
  });

  describe('deserializeMessage', () => {
    it('should return null for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(deserializeMessage(buffer)).toBeNull();
    });

    it('should return null for unknown opcode', () => {
      const buffer = new ArrayBuffer(1);
      const view = new DataView(buffer);
      view.setUint8(0, 99); // Unknown opcode
      expect(deserializeMessage(buffer)).toBeNull();
    });

    describe('WelcomeMessage (Opcode 1)', () => {
      it('should deserialize a valid welcome message', () => {
        const buffer = new ArrayBuffer(11);
        const view = new DataView(buffer);
        view.setUint8(0, 1); // Opcode
        view.setUint16(1, 42, true); // playerId
        view.setFloat32(3, 800.5, true); // arenaWidth
        view.setFloat32(7, 600.5, true); // arenaHeight

        const msg = deserializeMessage(buffer);
        expect(msg).toEqual({
          type: 'welcome',
          playerId: 42,
          arenaWidth: 800.5,
          arenaHeight: 600.5,
        });
      });

      it('should return null if buffer is too short', () => {
        const buffer = new ArrayBuffer(10);
        const view = new DataView(buffer);
        view.setUint8(0, 1);
        expect(deserializeMessage(buffer)).toBeNull();
      });
    });

    describe('GameOverMessage (Opcode 4)', () => {
      it('should deserialize a valid game over message', () => {
        const buffer = new ArrayBuffer(9);
        const view = new DataView(buffer);
        view.setUint8(0, 4); // Opcode
        view.setUint32(1, 15000, true); // score
        view.setUint32(5, 10, true); // wave

        const msg = deserializeMessage(buffer);
        expect(msg).toEqual({
          type: 'gameOver',
          score: 15000,
          wave: 10,
        });
      });

      it('should return null if buffer is too short', () => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setUint8(0, 4);
        expect(deserializeMessage(buffer)).toBeNull();
      });
    });

    describe('WorldStateMessage (Opcode 2)', () => {
      it('should deserialize a valid world state message with zero entities', () => {
        const buffer = new ArrayBuffer(71);
        const view = new DataView(buffer);
        view.setUint8(0, 2);
        view.setUint32(1, 100, true);
        view.setUint32(5, 50, true);
        view.setUint32(9, 200, true);
        view.setUint16(13, 5, true);
        view.setUint32(15, 1000, true);
        view.setUint16(19, 80, true);
        view.setUint16(21, 100, true);
        view.setUint8(23, 2);

        const statsPack1 = 1 | (2 << 8) | (3 << 16) | (4 << 24);
        view.setUint32(24, statsPack1, true);

        const statsPack2 = 5 | (6 << 8) | (7 << 16) | (8 << 24);
        view.setUint32(28, statsPack2, true);

        view.setUint16(32, 3, true);
        view.setUint16(34, 0, true);
        view.setUint8(36, 11);
        view.setUint8(37, 12);
        view.setUint8(38, 13);
        view.setUint8(39, 1);
        view.setUint8(40, 2);
        view.setUint8(41, 3);
        view.setUint8(42, 4);

        const msg = deserializeMessage(buffer);
        const expectedInventory = Array(32).fill(0);
        expectedInventory[0] = 1;
        expectedInventory[1] = 2;
        expectedInventory[2] = 3;
        expectedInventory[3] = 4;

        expect(msg).toEqual({
          type: 'worldState',
          tick: 100,
          xp: 50,
          maxXp: 200,
          level: 5,
          score: 1000,
          health: 80,
          maxHealth: 100,
          upgradePoints: 2,
          statRegen: 1,
          statMaxHP: 2,
          statSpeed: 3,
          statMinionDmg: 4,
          statMinionSpeed: 5,
          statMinionHP: 6,
          statMinionPierce: 7,
          statMinionRegen: 8,
          waveNumber: 3,
          card1: 11,
          card2: 12,
          card3: 13,
          inventory: expectedInventory,
          entities: []
        });
      });

      it('should deserialize a valid world state message with entities', () => {
        const buffer = new ArrayBuffer(71 + 26);
        const view = new DataView(buffer);
        view.setUint8(0, 2); // Opcode
        view.setUint16(34, 1, true); // entitiesCount
        view.setUint8(36, 0); // card1
        view.setUint8(37, 0); // card2
        view.setUint8(38, 0); // card3
        view.setUint8(39, 0); // slot1
        view.setUint8(40, 0); // slot2
        view.setUint8(41, 0); // slot3
        view.setUint8(42, 0); // slot4

        const offset = 71;
        view.setUint16(offset, 101, true); // id
        view.setUint8(offset + 2, 1); // type
        view.setUint8(offset + 3, 2); // subtype
        view.setFloat32(offset + 4, 10.5, true); // x
        view.setFloat32(offset + 8, 20.5, true); // y
        view.setFloat32(offset + 12, 1.5, true); // angle
        view.setUint16(offset + 16, 50, true); // health
        view.setUint16(offset + 18, 100, true); // maxHealth
        view.setUint16(offset + 20, 15, true); // radius
        view.setUint32(offset + 22, 255, true); // stateFlags

        const msg = deserializeMessage(buffer);
        expect(msg?.type).toBe('worldState');
        if (msg?.type === 'worldState') {
            expect(msg.entities.length).toBe(1);
            expect(msg.entities[0]).toEqual({
                id: 101,
                type: 1,
                subtype: 2,
                x: 10.5,
                y: 20.5,
                angle: 1.5,
                health: 50,
                maxHealth: 100,
                radius: 15,
                stateFlags: 255,
             });
        }
      });

      it('should stop reading entities if buffer is truncated', () => {
        const buffer = new ArrayBuffer(71 + 26);
        const view = new DataView(buffer);
        view.setUint8(0, 2);
        view.setUint16(34, 2, true);
        view.setUint8(36, 0);
        view.setUint8(37, 0);
        view.setUint8(38, 0);

        const msg = deserializeMessage(buffer);
        expect(msg?.type).toBe('worldState');
        if (msg?.type === 'worldState') {
            expect(msg.entities.length).toBe(1);
        }
      });

      it('should return null if buffer is too short for base world state', () => {
        const buffer = new ArrayBuffer(70);
        const view = new DataView(buffer);
        view.setUint8(0, 2);
        expect(deserializeMessage(buffer)).toBeNull();
      });
    });
  });
});
