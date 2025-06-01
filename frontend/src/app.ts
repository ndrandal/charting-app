window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('chartCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Cannot find <canvas id="chartCanvas">');
    return;
  }

  // Try to get WebGL2 context
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    console.error('WebGL2 not supported in this browser.');
    return;
  }

  let resizeScheduled = false;

  // Resize canvas to fill window
  function resizeCanvas(): void {
    if (resizeScheduled) {
      // Already requested a resize – let that run instead of scheduling another
      return;
    }
    resizeScheduled = true;

    // Schedule actual resize at next animation frame
    window.requestAnimationFrame(() => {
      resizeScheduled = false;

      // Double‐check that canvas & gl still exist
      if (!(canvas instanceof HTMLCanvasElement)) {
        console.warn('Canvas element no longer exists. Skipping resize.');
        return;
      }
      if (!gl) {
        console.warn('WebGL context is gone. Skipping resize.');
        return;
      }

      // Calculate new dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Only update if dimensions actually changed
      if (canvas.width === width && canvas.height === height) {
        return;
      }

      // Apply new size
      canvas.width = width;
      canvas.height = height;

      // Safe‐guard viewport call in try/catch
      try {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      } catch (e) {
        console.error('Error when setting WebGL viewport:', e);
      }
    });
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  console.log('WebGL2 context initialized.');

  // — Connect to backend WebSocket (Phase 2 will implement real server)
  let ws: WebSocket;
  try {
    ws = new WebSocket('ws://localhost:9001');
  } catch (e) {
    console.error('Failed to create WebSocket:', e);
    return;
  }

  ws.onopen = () => {
    console.log('WebSocket connected to backend.');
  };

  ws.onmessage = (event: MessageEvent<string>) => {
    console.log('Received from backend:', event.data);
    // TODO: parse JSON, update GL buffers, redraw
  };

  ws.onerror = (err: Event) => {
    console.error('WebSocket error:', err);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed.');
  };

  // TODO: Setup basic WebGL shaders/buffers here in Phase 2
});
