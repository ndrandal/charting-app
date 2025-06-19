import React, { useRef, useEffect } from 'react';
import { chartRenderers } from '../renderers';
import type { DrawBatch } from '../types/protocol';

interface ChartCanvasProps {
  ws: WebSocket;
  streaming: boolean;
}

/**
 * Compiles a shader of given type from source.
 */
function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum
): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return shader
}

/**
 * Links a vertex+fragment shader into a program.
 */
function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vert = compileShader(gl, vertSrc, gl.VERTEX_SHADER)
  const frag = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER)
  const program = gl.createProgram()!
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Program link failed: ${log}`)
  }
  // shaders can be deleted once linked
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  return program
}


const ChartCanvas: React.FC<ChartCanvasProps> = ({ ws, streaming }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batchRef = useRef<DrawBatch | null>(null);
  const frameRef = useRef<number>(0);
  const colorLocRef = useRef<WebGLUniformLocation | null>(null)

  useEffect(() => {
    if (!ws) return; // nothing to do if no socket

    // 1) Message handler: parse JSON, update batchRef on drawCommands
    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'drawCommands') {
          batchRef.current = data;            // store for the draw loop
        } else if (data.type === 'error') {
          console.error('Server error:', data.message);
        }
      } catch (e) {
        console.error('Invalid JSON from server:', e);
      }
    };

    // 2) Optional: error & close handlers for diagnostics
    const onError = (event: Event) => {
      console.error('WebSocket error', event);
    };
    const onClose = () => {
      console.warn('WebSocket closed');
    };

    // 3) Attach listeners
    ws.addEventListener('message', onMessage);
    ws.addEventListener('error', onError);
    ws.addEventListener('close', onClose);

    // 4) Cleanup on unmount or if ws changes
    return () => {
      ws.removeEventListener('message', onMessage);
      ws.removeEventListener('error', onError);
      ws.removeEventListener('close', onClose);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [ws]);

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.error('Canvas element not found')
      return
    }
    const gl = canvas.getContext('webgl2')
    if (!gl) {
      console.error('WebGL2 not supported')
      return
    }



    // Compile shaders and create program (example, adapt to your code)
    const vertSrc = (document.getElementById('vertex-shader') as HTMLScriptElement).text
    const fragSrc = (document.getElementById('fragment-shader') as HTMLScriptElement).text
    const program = createProgram(gl, vertSrc, fragSrc)
    gl.useProgram(program)

    // Now grab the uniform location for `u_color`
    const loc = gl.getUniformLocation(program, 'u_color')
    if (!loc) {
      console.error("Could not find uniform 'u_color'")
    }
    colorLocRef.current = loc


    // Create a single buffer for all series
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    const aPos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Handle canvas resize
    const resize = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }
    window.addEventListener('resize', resize)
    resize()

    return () => {
      window.removeEventListener('resize', resize)
      // If you stored program or buffer in refs, you could delete them here:
      // gl.deleteProgram(program)
      // gl.deleteBuffer(buffer)
    }
  }, [])  // <-- runs once on mount

    // 2) Render loop effect
  useEffect(() => {
    if (!streaming) return

    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2')
    if (!canvas || !gl) return

    const renderLoop = () => {
      // Clear canvas
      gl.clear(gl.COLOR_BUFFER_BIT)

      // Draw each series in the latest batch
      const batch = batchRef.current;
      const colorLoc = colorLocRef.current!
      if (batch) {
        batch.commands.forEach(cmd => {
        // Determine pane viewport
        if (cmd.pane === 'main') {
          // Upper 70%
          gl.viewport(
            0,
            Math.floor(canvas.height * 0.3),
            canvas.width,
            Math.floor(canvas.height * 0.7)
          );
        } else if (cmd.pane === 'volume') {
          // Lower 30%
          gl.viewport(
            0,
            0,
            canvas.width,
            Math.floor(canvas.height * 0.3)
          );
        } else {
          // Default to full canvas
          gl.viewport(0, 0, canvas.width, canvas.height);
        }

        // Then draw as before
        if (cmd.seriesId === 'price') {
          chartRenderers.LineChartRenderer.draw( gl, cmd, colorLoc);
        } else {
          chartRenderers.CandlestickChartRenderer.draw( gl, cmd, colorLoc);
        }
    });

      }
      // Schedule next frame
      frameRef.current = requestAnimationFrame(renderLoop)
    }

    frameRef.current = requestAnimationFrame(renderLoop)
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [streaming])  // <-- re-runs when `streaming` toggles


  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default ChartCanvas;
