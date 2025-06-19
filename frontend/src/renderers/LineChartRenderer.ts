// frontend/src/renderers/LineChartRenderer.ts
import { ChartRenderer } from './ChartRenderer';
import { DrawSeriesCommand, LineStyle } from '../types/protocol';

export class LineChartRenderer implements ChartRenderer {
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
    const style = cmd.style as LineStyle;
    const [r, g, b] = this.hexToRgbNormalized(style.color);
    gl.uniform4f(colorLoc, r, g, b, 1);
    gl.lineWidth(style.thickness);

    const vertexCount = cmd.vertices.length / 2;
    gl.drawArrays(gl.LINE_STRIP, 0, vertexCount);
  }
}
