// frontend/src/renderers/ChartRenderer.ts
import { DrawSeriesCommand } from '../types/protocol';

/**
 * Strategy interface for rendering a series.
 */
export interface ChartRenderer {
  /**
   * Draws one series.
   *
   * @param gl       WebGL2 context (program is already in use, buffer/attrib set up)
   * @param cmd      One draw command with vertices & style
   * @param colorLoc Uniform location for 'u_color'
   */
  draw(
    gl: WebGL2RenderingContext,
    cmd: DrawSeriesCommand,
    colorLoc: WebGLUniformLocation
  ): void;
}
