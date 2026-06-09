import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextRenderer } from './text';

describe('TextRenderer', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      // Properties
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
  });

  describe('getScale', () => {
    it('should calculate scale based on minimum ratio', () => {
      // baseWidth = 1920, baseHeight = 1080
      // 1920 / 1920 = 1, 1080 / 1080 = 1 -> min = 1
      expect(TextRenderer.getScale(1920, 1080)).toBe(1);

      // 960 / 1920 = 0.5, 1080 / 1080 = 1 -> min = 0.5
      expect(TextRenderer.getScale(960, 1080)).toBe(0.5);

      // 1920 / 1920 = 1, 540 / 1080 = 0.5 -> min = 0.5
      expect(TextRenderer.getScale(1920, 540)).toBe(0.5);

      // 3840 / 1920 = 2, 2160 / 1080 = 2 -> min = 2
      expect(TextRenderer.getScale(3840, 2160)).toBe(2);
    });

    it('should handle zero dimensions', () => {
      expect(TextRenderer.getScale(0, 1080)).toBe(0);
      expect(TextRenderer.getScale(1920, 0)).toBe(0);
      expect(TextRenderer.getScale(0, 0)).toBe(0);
    });

    it('should handle negative dimensions by preserving the negative ratio', () => {
      expect(TextRenderer.getScale(-1920, 1080)).toBe(-1);
      expect(TextRenderer.getScale(1920, -1080)).toBe(-1);
      expect(TextRenderer.getScale(-1920, -1080)).toBe(-1);
    });
  });

  describe('draw', () => {
    it('should draw text with default options', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Hello World',
        100,
        200,
        '#FFFFFF',
        { fontSize: 24 },
        1920,
        1080
      );

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.font).toBe("24px 'JetBrains Mono', monospace");
      expect(mockCtx.textAlign).toBe('left');
      expect(mockCtx.textBaseline).toBe('alphabetic');
      expect(mockCtx.fillStyle).toBe('#FFFFFF');
      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello World', 100, 200);
      expect(mockCtx.restore).toHaveBeenCalled();

      // Stroke shouldn't be called
      expect(mockCtx.strokeText).not.toHaveBeenCalled();
    });

    it('should scale font size properly', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Test',
        0,
        0,
        'red',
        { fontSize: 24 },
        960, // 0.5 scale width
        540  // 0.5 scale height
      );

      expect(mockCtx.font).toBe("12px 'JetBrains Mono', monospace"); // 24 * 0.5
    });

    it('should enforce a minimum scaled font size of 6', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Tiny Text',
        0,
        0,
        'blue',
        { fontSize: 10 },
        192, // 0.1 scale
        108  // 0.1 scale
      );

      // 10 * 0.1 = 1, which is less than 6. Should use 6.
      expect(mockCtx.font).toBe("6px 'JetBrains Mono', monospace");
    });

    it('should apply bold styling when specified', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Bold Text',
        0,
        0,
        'black',
        { fontSize: 20, bold: true },
        1920,
        1080
      );

      expect(mockCtx.font).toBe("bold 20px 'JetBrains Mono', monospace");
    });

    it('should apply custom alignment and baseline', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Aligned Text',
        0,
        0,
        'black',
        { fontSize: 20, align: 'center', baseline: 'middle' },
        1920,
        1080
      );

      expect(mockCtx.textAlign).toBe('center');
      expect(mockCtx.textBaseline).toBe('middle');
    });

    it('should apply shadows correctly scaled', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Shadow Text',
        0,
        0,
        'black',
        {
          fontSize: 20,
          shadowColor: 'rgba(0,0,0,0.5)',
          shadowBlur: 10,
          shadowOffsetX: 5,
          shadowOffsetY: 5
        },
        960, // 0.5 scale
        540  // 0.5 scale
      );

      expect(mockCtx.shadowColor).toBe('rgba(0,0,0,0.5)');
      expect(mockCtx.shadowBlur).toBe(5); // 10 * 0.5
      expect(mockCtx.shadowOffsetX).toBe(2.5); // 5 * 0.5
      expect(mockCtx.shadowOffsetY).toBe(2.5); // 5 * 0.5
    });

    it('should handle shadow with missing blur/offset properties gracefully', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Partial Shadow Text',
        0,
        0,
        'black',
        {
          fontSize: 20,
          shadowColor: 'red'
        },
        1920,
        1080
      );

      expect(mockCtx.shadowColor).toBe('red');
      expect(mockCtx.shadowBlur).toBe(0);
      expect(mockCtx.shadowOffsetX).toBe(0);
      expect(mockCtx.shadowOffsetY).toBe(0);
    });

    it('should apply stroke text and scaled stroke width', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'Stroke Text',
        50,
        50,
        'black',
        {
          fontSize: 20,
          strokeColor: 'white',
          strokeWidth: 4
        },
        960, // 0.5 scale
        540  // 0.5 scale
      );

      expect(mockCtx.strokeStyle).toBe('white');
      expect(mockCtx.lineWidth).toBe(2); // 4 * 0.5
      expect(mockCtx.strokeText).toHaveBeenCalledWith('Stroke Text', 50, 50);
    });

    it('should not apply stroke text if strokeWidth is not provided', () => {
      TextRenderer.draw(
        mockCtx as CanvasRenderingContext2D,
        'No Stroke Width Text',
        50,
        50,
        'black',
        {
          fontSize: 20,
          strokeColor: 'white'
          // no strokeWidth
        },
        1920,
        1080
      );

      expect(mockCtx.strokeText).not.toHaveBeenCalled();
    });
  });
});
