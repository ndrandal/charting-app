## Overview

A modular system for rendering a wide range of chart types—line, bar, candlestick, heatmap, Renko, etc.—driven entirely by JSON commands. The backend is a C++ engine that computes all drawing data; the frontend is a React component using WebGL to display it.

## Core Design Principles

1. **Clear Separation of Concerns**
   - The C++ engine handles data processing, scaling, and vertex generation.
   - The React/WebGL frontend only renders the provided instructions.

2. **Modularity and Extensibility**
   - Each chart type and statistical function is implemented as an independent module.
   - New types or indicators can be added by registering them in the engine without altering frontend code.

3. **Performance Optimization**
   - Backend uses lock-free queues and ring buffers to avoid contention under heavy data loads.
   - Frontend reuses WebGL buffers and uses scissor tests to manage multiple panes efficiently.

4. **Reactive Subscription Model**
   - Clients subscribe to specific data series.
   - The engine pushes updates only when values change, reducing unnecessary processing and network traffic.

5. **Configurability and Observability**
   - A single configuration file controls thread counts, buffer sizes, log levels, and network settings.
   - Structured logging enables integration with external monitoring or tracing systems.

## Functionality

**Backend (C++ Engine)**
- Listens for WebSocket connections.
- Receives subscription and configuration JSON.
- Maintains per-symbol history buffers.
- Converts data into normalized device coordinates (–1 to +1).
- Packages vertices and style into simple JSON messages (“drawSeries” or “drawBatch”) and broadcasts to subscribers.

**Frontend (React + WebGL)**
- Initializes a WebGL2 `<canvas>` within a React component.
- Opens a WebSocket connection and sends subscription requests.
- On each draw command:
  - Converts vertex arrays to `Float32Array`.
  - Binds data to WebGL buffers.
  - Issues `gl.drawArrays()` calls within designated viewports using `gl.scissor` and `gl.viewport`.
- UI controls (series toggles, color pickers, annotation tools) send back JSON messages to adjust rendering parameters.

## Benefits

- **Exact Rendering**: Charts reflect precisely what the engine specifies.
- **Easy Extension**: Add new chart types or indicators without touching frontend code.
- **High Throughput**: Capable of handling many symbols and high-frequency updates with minimal latency.
- **Future Flexibility**: The JSON-driven approach can be adapted to mobile, VR/AR, or alternative rendering platforms.
