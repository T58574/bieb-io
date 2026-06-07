export interface TextOptions {
  fontSize: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  bold?: boolean;
}

export class TextRenderer {
  private static baseWidth = 1920;
  private static baseHeight = 1080;

  static getScale(canvasWidth: number, canvasHeight: number): number {
    return Math.min(canvasWidth / this.baseWidth, canvasHeight / this.baseHeight);
  }

  static draw(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    options: TextOptions,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const scale = this.getScale(canvasWidth, canvasHeight);
    const scaledSize = Math.max(6, options.fontSize * scale);
    
    ctx.save();
    ctx.font = `${options.bold ? "bold " : ""}${scaledSize}px 'JetBrains Mono', monospace`;
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = options.baseline || "alphabetic";

    if (options.shadowColor) {
      ctx.shadowColor = options.shadowColor;
      ctx.shadowBlur = (options.shadowBlur || 0) * scale;
      ctx.shadowOffsetX = (options.shadowOffsetX || 0) * scale;
      ctx.shadowOffsetY = (options.shadowOffsetY || 0) * scale;
    }

    if (options.strokeColor && options.strokeWidth) {
      ctx.strokeStyle = options.strokeColor;
      ctx.lineWidth = options.strokeWidth * scale;
      ctx.strokeText(text, x, y);
    }

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}
