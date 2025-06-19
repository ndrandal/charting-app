// frontend/src/renderers/CandlestickChartRenderer.ts
import { ChartRenderer } from './ChartRenderer';
import { DrawSeriesCommand, CandlestickStyle } from '../types/protocol';

export class CandlestickChartRenderer implements ChartRenderer {
  private hexToRgbNormalized(hex: string): [number, number, number] {
    if (!hex.startsWith('#') || hex.length !== 7) return [0, 0, 0];
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  draw(
    gl: WebGL2RenderingContext,
    cmd: DrawSeriesCommand,
    colorLoc: WebGLUniformLocation
  ): void {
    const style = cmd.style as CandlestickStyle;
    // Choose wick color if set, otherwise primary
    const wickHex = style.wickColor ?? style.color;
    const [wr, wg, wb] = this.hexToRgbNormalized(wickHex);
    gl.uniform4f(colorLoc, wr, wg, wb, 1);
    gl.lineWidth(style.thickness);

    // All segments encoded as LINES in one buffer
    const vertexCount = cmd.vertices.length / 2;
    gl.drawArrays(gl.LINES, 0, vertexCount);
  }
}
