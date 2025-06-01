
# AI Ingestable Overview

## 1. Project Vision & High-Level Goals

- **Multiple Chart Types**: From simple line and bar charts to advanced candlestick, Renko, heatmap, and more. If it’s somewhat useful, we’ll implement it.
- **Live Data, Any Frequency**: Receiving tick-by-tick or interval-based data feeds. Handle multiple symbols, multiple series, up to 20 overlapping layers.
- **Full Customization**: The app doesn’t decide how charts should look or be laid out. Instead, it obeys clear JSON instructions from the C++ rendering engine and renders exactly what it’s told.
- **React + WebGL Frontend**: A React component (`ChartCanvas.tsx`) wraps a WebGL2 `<canvas>`. All drawing is dictated by “draw commands” from the C++ engine.
- **C++ Rendering Engine**: Computes transforms, generates vertex data, and packages “draw command” JSON for the frontend. Supports multiple panes, nested charts, multiple Y-axes, annotations, drawing tools, custom indicators, and theming.
- **Future-Ready**: VR/AR integration, mobile performance, DSL/scripting support, full developer tooling, and user-focused features (drawing tools, layout persistence, themes).

---

## 2. Directory Structure

```
charting-app/
│
├── .gitignore
├── README.md               <-- THIS FILE
│
├── backend/                # C++ Rendering Engine (WebSocket Server)
│   ├── include/            # Public headers (e.g., structures, protocol definitions)
│   │   └── RenderEngine.hpp
│   ├── src/                # C++ implementation files
│   │   ├── main.cpp        # Entry point, WebSocket server stub
│   │   ├── RenderEngine.cpp# Core transform & draw command generation
│   │   └── Utils.cpp       # Any helper functions (JSON serialization, math, etc.)
│   ├── CMakeLists.txt      # Build instructions for backend
│   ├── build/              # (Ignored) CMake build output
│   └── proto/              # (Optional) Protobuf/FlatBuffers schema (if any)
│
├── frontend/               # React + WebGL2 Client
│   ├── public/
│   │   ├── index.html      # HTML entry point (loads compiled JS)
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/     # Reusable React components (toolbar, sidebar, etc.)
│   │   │   ├── ChartCanvas.tsx   # Main WebGL canvas component
│   │   │   ├── SeriesList.tsx    # UI to toggle series & config
│   │   │   ├── ToolSelector.tsx  # Drawing tool toolbar
│   │   │   └── ThemeSwitcher.tsx # Dark/light theme toggler
│   │   ├── shaders/        # GLSL files (vertex.glsl, fragment.glsl, etc.)
│   │   ├── app.tsx         # React entry point (renders <App />)
│   │   ├── App.tsx         # Root component with layout (sidebar + ChartCanvas)
│   │   ├── index.tsx       # Renders <App /> into DOM
│   │   ├── types/          # TypeScript type definitions (protocol, draw commands)
│   │   │   └── protocol.d.ts
│   │   └── utils/          # Utility functions (WebSocket wrapper, color utils)
│   │       └── websocket.ts
│   ├── dist/               # (Ignored) Compiled JS output
│   ├── node_modules/       # (Ignored) npm packages
│   ├── tsconfig.json       # TypeScript configuration
│   ├── package.json        # npm scripts & dependencies
│   └── package-lock.json   # (Ignored) npm lock
│
└── data/                   # Optional: Sample test data (JSON, CSV)
    └── sample_data.json
```

- **Everything under `build/`, `dist/`, `node_modules/`, etc.** is ignored via `.gitignore`.
- **Your main work** will be editing C++ files in `backend/` and TypeScript/React files in `frontend/src/`.

---

## 3. Backend (C++ Rendering Engine)

### 3.1 Purpose & Responsibilities
The C++ engine receives “ready-to-chart” data (e.g., OHLC bars, ticks, indicator values) from an external data feed (not part of this repo). It then:

1. **Computes Transforms**  
   - Maps timestamps to X (−1 to +1 in NDC) and values to Y (−1 to +1).  
   - Handles multiple panes: different Y-min/Y-max per pane, nested insets, etc.
2. **Generates Vertex Data**  
   - For each series (up to 20 or more), produce a `std::vector<float>` where each pair is (x, y).  
   - For bar/candle charts, generate quads or triangle strips.
3. **Packages Draw Commands**  
   - Wrap vertex arrays, style attributes (color, thickness, chart type), pane/axis metadata into a JSON “drawBatch” or “drawSeries” object.
   - Example:
     ```jsonc
     {
       "type": "drawSeries",
       "pane": "pricePane",
       "seriesId": "price",
       "style": { "type": "candlestick", "upColor": "#00ff00", "downColor": "#ff0000", "wickColor": "#888888" },
       "vertices": [x0, y0, x1, y1, … xN, yN]
     }
     ```
4. **Streams Data Over WebSocket**  
   - Listens on a configurable port (default: `9001`).  
   - On client connect, optionally read a “subscribe” JSON (which series/panes the client wants).  
   - Periodically (or on each new data tick) recompute and broadcast draw command packets.

### 3.2 Build Instructions

1. **Install Dependencies**  
   - Make sure you have a C++20 compiler (g++ 10+, clang++ 10+, or MSVC 2019+).  
   - Install CMake ≥ 3.15.  
   - We use a header-only JSON library (e.g., nlohmann/json) and a WebSocket library (e.g., uWebSockets or Boost.Beast). Add those to `/backend/include/` or configure via your package manager.

2. **CMake Build Steps**
   ```bash
   cd charting-app/backend
   mkdir -p build
   cd build
   cmake ..
   cmake --build . --config Release
   ```
   - After a successful build, you should see an executable named `chart_server` (or `chart_server.exe` on Windows).
   - Example output:
     ```
     -- Configuring done
     -- Generating done
     -- Build files have been written to: .../charting-app/backend/build
     [100%] Built target chart_server
     ```

3. **Run the Server (Stub)**
   ```bash
   ./chart_server
   ```
   - Output (initial stub):
     ```
     Rendering engine starting on port 9001...
     ```
   - Currently, it sends a hard-coded single series. We’ll expand this in Phase 2–5.

---

## 4. Frontend (React + WebGL)

### 4.1 Purpose & Responsibilities
The React/WebGL frontend is responsible for:

1. **Rendering Canvas & UI**  
   - A top-level `<App />` component splits the screen into a **toolbar/sidebar** (for series, tools, themes) and a **full-screen WebGL `<canvas>`**.
2. **WebSocket Connection**  
   - Connect to `ws://localhost:9001`, send subscription requests, and listen for “drawBatch” or “drawSeries.”
3. **WebGL Pipeline**  
   - On receiving a draw command, parse vertex data into a `Float32Array`, upload into a `WebGLBuffer`, and draw via `gl.drawArrays()`.
4. **Pane & Axis Management**  
   - Use scissor test `gl.enable(GL.SCISSOR_TEST)` + `gl.viewport()` to carve up the canvas into multiple sub-viewports (panes).
   - Draw axes lines and labels (text rendering via a canvas2D overlay or a GL text atlas).
5. **UI Interactions**  
   - Allow user to toggle series visibility, change colors/thickness, add/remove panes, drag-resize panes, select drawing tools, and write custom indicator scripts.
   - Each UI action sends a JSON “configChange” or “userDraw” message back to the C++ engine, which then re-broadcasts updated draw commands.

### 4.2 Build & Run Instructions

1. **Prerequisites**  
   - Node.js (≥ 14.x) and npm (or yarn).  
   - You can use Create React App (CRA) or a custom Webpack setup. We’ll assume CRA with TypeScript.

2. **Install & Build**
   ```bash
   cd charting-app/frontend
   npm install
   npm run build    # compiles TS → JS into /dist
   npm start        # runs a development server (e.g., on http://localhost:3000)
   ```
   - `npm run build` outputs to `dist/`.  
   - `npm start` (CRA) hot-reloads on changes in `src/`. Make sure your `index.html` references `/dist/app.js` (or CRA’s served bundle).

3. **Serving the App**  
   - During development: CRA’s dev server serves `/src` and hot-reloads.  
   - For production: run a simple static server pointing at `/dist/` (e.g. `serve -s dist` or `http-server dist -p 8080`).

4. **React Component Overview**
   - `ChartCanvas.tsx`  
     - On mount:
       ```ts
       const canvasRef = useRef<HTMLCanvasElement>(null);
       const glRef = useRef<WebGL2RenderingContext | null>(null);

       useEffect(() => {
         const canvas = canvasRef.current;
         if (!canvas) return;
         const gl = canvas.getContext('webgl2');
         glRef.current = gl;
         // Initialize shaders, buffers, event listeners ...
         const ws = new WebSocket('ws://localhost:9001');
         ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', requestedSeries: ['price'] }));
         ws.onmessage = (evt) => handleDrawCommand(evt.data);
         // resize logic ...
       }, []);
       ```
   - `SeriesList.tsx`  
     - Displays checkboxes or toggles for each series. On change, do:
       ```ts
       ws.send(JSON.stringify({ type: 'configChange', seriesId: 'price', visible: false }));
       ```
   - `ToolSelector.tsx`  
     - Buttons for “Trendline,” “Text,” “Fibonacci,” etc. On select, set React state `currentTool`.  
     - Mouse events in `ChartCanvas` read `currentTool` and emit `userDraw` messages with start/end coordinates.
   - `ThemeSwitcher.tsx`  
     - Toggle dark/light mode. On change, send:
       ```ts
       ws.send(JSON.stringify({ type: 'themeChange', theme: 'dark' }));
       ```
     - Also update React/CSS variables for UI components.

5. **Types & Protocol Definitions**
   - In `frontend/src/types/protocol.d.ts`, define TypeScript interfaces that match C++ JSON structures:
     ```ts
     export interface DrawSeriesCommand {
       type: 'drawSeries';
       pane: string;
       seriesId: string;
       style: {
         type: 'line' | 'candlestick' | 'histogram' | 'heatmap' | 'scatter' | ...;
         color?: string;
         upColor?: string;
         downColor?: string;
         thickness?: number;
         // etc.
       };
       vertices: number[]; // [x0, y0, x1, y1, ...]
     }

     export interface DrawBatchCommand {
       type: 'drawBatch';
       panes: {
         id: string;
         series: DrawSeriesCommand[];
       }[];
     }

     export interface PaneLayout {
       type: 'paneLayout';
       panes: { id: string; heightRatio: number }[];
     }

     // userDraw, configChange, themeChange, etc.
     ```

---

## 5. WebSocket Protocol & JSON Schemas

Everything flows through JSON over WebSocket. Below is the evolving schema:

### 5.1 Subscription & Config

1. **Client → Server: Subscribe**
   ```json
   {
     "type": "subscribe",
     "requestedSeries": ["price", "sma20", "volume"]
   }
   ```

2. **Client → Server: Config Change**
   ```json
   {
     "type": "configChange",
     "seriesId": "price",
     "visible": true,
     "color": "#ff00ff",
     "thickness": 3
   }
   ```

3. **Client → Server: New Pane Definition**
   ```json
   {
     "type": "paneChange",
     "panes": [
       { "id": "pricePane",  "heightRatio": 0.75 },
       { "id": "volumePane", "heightRatio": 0.25 }
     ]
   }
   ```

4. **Client → Server: userDraw (Annotation)**
   ```jsonc
   {
     "type": "userDraw",
     "tool": "trendline",
     "pane": "pricePane",
     "coords": { "x1": -0.8, "y1": 0.1, "x2": 0.2, "y2": -0.3 },
     "style": { "color": "#ffffff", "thickness": 2 }
   }
   ```

5. **Client → Server: themeChange**
   ```json
   {
     "type": "themeChange",
     "theme": "light" // or "dark", or a custom palette object
   }
   ```

### 5.2 Server → Client: Draw Commands & Layout

1. **Pane Layout (Sent once on connect or when changed)**
   ```json
   {
     "type": "paneLayout",
     "panes": [
       { "id": "pricePane",  "heightRatio": 0.7 },
       { "id": "volumePane", "heightRatio": 0.3 }
     ]
   }
   ```

2. **Axis Layout (Sent when axis scales or ticks change)**
   ```jsonc
   {
     "type": "axisLayout",
     "pane": "pricePane",
     "yAxes": [
       {
         "id": "priceAxis",
         "side": "left",
         "ticks": [
           { "value": 100.00, "ndcY": 0.6 },
           { "value": 105.00, "ndcY": 0.8 },
           ...
         ]
       }
     ],
     "xAxis": {
       "ticks": [
         { "timestamp": 1620000000, "ndcX": -0.9 },
         { "timestamp": 1620000600, "ndcX": -0.7 },
         ...
       ]
     }
   }
   ```

3. **Draw Batch (Sent each update)**
   ```jsonc
   {
     "type": "drawBatch",
     "panes": [
       {
         "id": "pricePane",
         "series": [
           {
             "type": "drawSeries",
             "pane": "pricePane",
             "seriesId": "price",
             "style": { "type": "line", "color": "#22ff88", "thickness": 2 },
             "vertices": [ -1, 0.0, -0.8, 0.1, ... ]
           },
           {
             "type": "drawSeries",
             "pane": "pricePane",
             "seriesId": "sma20",
             "style": { "type": "line", "color": "#ff8822", "thickness": 1 },
             "vertices": [ -1, 0.05, -0.8, 0.12, ... ]
           }
         ]
       },
       {
         "id": "volumePane",
         "series": [
           {
             "type": "drawSeries",
             "pane": "volumePane",
             "seriesId": "volume",
             "style": { "type": "histogram", "color": "#8888ff", "thickness": 1 },
             "vertices": [ -1, -1, -1, -0.8, ... ]
           }
         ]
       }
     ]
   }
   ```

4. **Draw Inset Pane (Nested Chart)**
   ```json
   {
     "type": "insetPane",
     "id": "miniRSI",
     "parentPane": "pricePane",
     "widthRatio": 0.25,
     "heightRatio": 0.2,
     "offsetXRatio": 0.7,
     "offsetYRatio": 0.75,
     "series": [
       {
         "type": "drawSeries",
         "pane": "miniRSI",
         "seriesId": "rsi14",
         "style": { "type": "line", "color": "#ffaa00", "thickness": 1 },
         "vertices": [ -0.2, 0.5, -0.1, 0.45, ... ]
       }
     ]
   }
   ```

---

## 6. Building Blocks & Key Concepts

### 6.1 Normalized Device Coordinates (NDC)
- We map timestamps and values into a **−1 to +1** range for both X and Y:
  ```cpp
  float xNorm = (t - tMin) / (tMax - tMin) * 2.0f - 1.0f; // in C++
  float yNorm = (v - vMin) / (vMax - vMin) * 2.0f - 1.0f;
  ```
- For multiple panes, we carve out subranges of Y (e.g., pricePane might be Y ∈ [−0.4, +1], volumePane Y ∈ [−1, −0.4]).

### 6.2 WebGL2 Draw Pipeline
1. **Shader Programs**  
   - **Line Program**  
     - Vertex Shader: takes `vec2 a_position`, applies `u_projection` matrix.  
     - Fragment Shader: uniform `u_color`.
   - **Candle / Bar Program**  
     - Vertex Shader: same as line or specialized for instanced quads.  
     - Fragment Shader: choose color based on “up” or “down” flags.
   - **Histogram Program**  
     - Vertex Shader: takes bar vertices.  
     - Fragment Shader: uniform `u_color`.

2. **Buffers & Attributes**  
   - Each series has a `WebGLBuffer` bound to `ARRAY_BUFFER`, with attribute pointer:
     ```ts
     gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(positionLocation);
     ```
   - On each update, we `gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)`.

3. **Viewports & Scissor**  
   - For each pane or inset, compute pixel bounds and call:
     ```ts
     gl.enable(gl.SCISSOR_TEST);
     gl.viewport(x, y, width, height);
     gl.scissor(x, y, width, height);
     // Draw respective series here
     gl.disable(gl.SCISSOR_TEST);
     ```

4. **RequestAnimationFrame Loop**  
   - We use:
     ```ts
     function renderLoop() {
       gl.clearColor(bgColor.r, bgColor.g, bgColor.b, 1.0);
       gl.clear(gl.COLOR_BUFFER_BIT);
       // Loop through panes & draw series in each
       requestAnimationFrame(renderLoop);
     }
     renderLoop();
     ```

### 6.3 React Integration
- **`ChartCanvas.tsx`**  
  - Holds references: `const canvasRef = useRef<HTMLCanvasElement>(null)`, `const glRef = useRef<WebGL2RenderingContext | null>(null)`, `const bufferMap = useRef<Map<string, WebGLBuffer>>(new Map())`.
  - On `useEffect` mount: initialize WebGL, connect socket, set up event listeners.  
  - On incoming draw commands: update `bufferMap.current.set(seriesId, buffer)` and store style in a `Map<string, Style>`.
- **State vs. Refs**  
  - Using React state for frequently changing data (like vertices) would cause constant re-renders—avoid that. Use `useRef` for GL objects, and only use state for config/UI (e.g., which series are toggled).
- **UI Components** (in `components/`)  
  - Each UI component communicates with the C++ engine via WebSocket: toggles, color pickers, script editor, pane resizer, etc.  
  - Use React Context to share the WebSocket instance across components.

---

## 7. Phase Roadmap

### Phase 1: Structure & Boilerplate (Completed)
- Directory structure, `.gitignore`, basic C++ “hello” stub, React/TS skeleton, WebGL context init, placeholder WebSocket.

### Phase 2: Single Series MVP
- C++ stub: send hard‑coded `"drawSeries"` JSON once.  
- React: parse JSON, draw single line on canvas.

### Phase 3: Multi‑Series & Single Pane
- C++: implement `drawBatch` with multiple series, send every second.  
- React: store multiple `WebGLBuffer`s, draw overlapping series.

### Phase 4: Panes & Nesting
- C++: send `paneLayout` and nested `"insetPane"` messages.  
- React: compute sub‑viewports, scissor test, draw each pane’s series.

### Phase 5: Full Suite
- C++: complete chart types (candlestick, area, histogram, heatmap, Renko, scatter, etc.), multiple Y‑axes, axis/tick layout, annotation tools, custom indicator DSL, theme handling.  
- React: full toolbar/sidebars, drawing tool support, script editor, dynamic color pickers, persistent layouts, mobile/VR support, QA tests.

---

## 8. Customization & Extensibility

- **JSON‑Driven Control**:  
  - The frontend obeys exactly what the C++ engine instructs.  
  - Any future chart type or style is defined in the JSON protocol—no hard‑coded layout decisions on the React side.
- **Adding a New Chart Type**:  
  1. **Backend**: Write a function to compute vertex data for the new type (e.g., “Point & Figure”).  
  2. Add a new `"style.type": "pointAndFigure"` in `DrawSeriesCommand`.  
  3. **Frontend**: In the shader setup, create a new GL program or modify fragment logic to handle that style. Register `getProgramForStyle("pointAndFigure")`.
- **Dynamic Panes & Inset Charts**:  
  - The engine can add/remove panes at any time. Frontend listens for `"paneLayout"` or `"insetPane"` messages and recomputes dimensions on the fly.
- **Custom Indicators**:  
  - Define a minimal DSL or embed an existing engine (e.g., ducc for Lua, tiny embedded Python) inside C++.  
  - React’s script editor sends code to C++; the engine computes new vertices for that indicator and broadcasts.

---

## 9. Theming & Styling Guidelines

- **Theme Packet** from C++:
  ```json
  {
    "type": "themeChange",
    "theme": "dark",
    "colors": {
      "background": "#1e1e1e",
      "grid": "#444444",
      "axis": "#888888",
      "text": "#ffffff"
    },
    "font": { "family": "Arial", "size": 12 }
  }
  ```
- **Frontend**:  
  1. Update GL clear color (`gl.clearColor(...)`) based on `background`.  
  2. Change uniform values for grid/axis draw.  
  3. Update React UI (CSS variables or styled-components) so that sidebars, toolbars, and text match theme.
- **CSS Variables**:  
  ```css
  :root {
    --bg-color: #1e1e1e;
    --grid-color: #444444;
    --axis-color: #888888;
    --text-color: #ffffff;
    --font-family: Arial, sans-serif;
    --font-size: 12px;
  }
  [data-theme="light"] {
    --bg-color: #ffffff;
    --grid-color: #cccccc;
    --axis-color: #444444;
    --text-color: #000000;
  }
  ```
  - In React, wrap the app in a `<div data-theme={currentTheme}>` for easy theme switching.

---

## 10. Tips & Troubleshooting

1. **Canvas Blank or WebGL Errors**  
   - Make sure you’re calling `gl.viewport(...)` after setting canvas size.  
   - Check for console errors like “Attribute location not found” or “Uniform not found.”  
   - Verify you’re using `#version 300 es` in GLSL if you’re using WebGL2.

2. **WebSocket Fails to Connect**  
   - Ensure C++ server is running on port 9001.  
   - Check firewall rules.  
   - Confirm you’re using `ws://localhost:9001` (no `https://` for a local dev server).

3. **JSON Parsing Issues**  
   - Keep backend JSON keys in sync with frontend TypeScript interfaces.  
   - Use `nlohmann::json` (C++) and `JSON.parse()` (JS) consistently.

4. **Performance Bottlenecks**  
   - Minimize calls to `gl.bufferData` by reusing buffers or using streaming buffers (`gl.bufferSubData`).  
   - Combine vertex data for multiple series into one big buffer (with offsets) if you need micro-optimizations.

5. **Axis & Tick Labels**  
   - Text rendering in WebGL can be tricky. For MVP, use a 2D canvas overlay for labels:
     ```ts
     const ctx2D = overlayCanvas.getContext('2d');
     ctx2D.fillStyle = theme.textColor;
     ctx2D.font = `${fontSize}px ${fontFamily}`;
     ctx2D.fillText('100.00', 10, 50);
     ```

---

## 11. Future Directions & VR/AR Ready

- **WebXR Integration**  
  - When you detect `navigator.xr` support, create an `XRSession`.  
  - Use `XRWebGLLayer` to present your WebGL canvas in VR/AR.  
  - All draw commands remain identical—just pass your GL texture to an XR layer.

- **Mobile Optimizations**  
  - Detect low-performance GPUs and automatically downsample (send fewer points) or switch to simpler chart types.  
  - Use `requestAnimationFrame` wisely to drop to 30 fps on mobile if 60 fps is impossible.

- **Collaborative Features**  
  - Because all annotations are “userDraw” commands sent to C++, you can store them in a central database. Multiple clients can connect to the same session and see each other’s annotations in real time.

- **Plug‑In System for Indicators**  
  - In the future, package indicator logic as separate dynamic libraries or WASM modules. The engine can load them at runtime without recompiling the whole C++ codebase.

---

## 12. Contributing & Best Practices

1. **Coding Standards**  
   - **C++**: Follow C++20 guidelines, prefer `std::vector<float>` over raw pointers. Use RAII, avoid global variables, write unit tests (GoogleTest) for core transform functions.  
   - **TypeScript/React**: Use functional components with hooks. Keep WebGL logic isolated in `ChartCanvas.tsx`. Refs for GL objects, state only for UI and config.

2. **Branching & PR Workflow**  
   - Use `main` (or `master`) for stable releases.  
   - Create feature branches: `feature/multi-series`, `feature/pane-layout`, etc.  
   - One PR per feature, include screenshots or video clips of the chart in action.

3. **Issue Tracking**  
   - Tag issues by category: `backend`, `frontend`, `performance`, `UI`, `bug`, `enhancement`.  
   - When filing a bug, include reproducible steps—e.g., “Backend sends invalid JSON for drawBatch with empty series array.”

4. **Testing**  
   - **C++ Unit Tests**: Put under `backend/tests/` using GoogleTest. Test transforms, JSON serialization, and edge cases (e.g., zero data points).  
   - **React Jest Tests**: Test that `ChartCanvas` mounts without errors, mock WebSocket to send a sample draw command, and verify that `gl.drawArrays` is called (using a mock gl context).  
   - **Visual Regression**: Use Puppeteer + pixelmatch to capture canvas snapshots for common chart states.

5. **Documentation**  
   - Keep this README up to date with:  
     - New JSON fields or schema changes.  
     - New chart types and style options.  
     - UX changes in the React UI (e.g., new sidebar features).
   - Consider adding a `docs/` folder for deeper guides:  
     - “How to add a new shader program.”  
     - “How to write a custom indicator plugin.”  
     - “How to integrate with WebXR.”

---

## 13. Quick Commands & Cheatsheet

```bash
# Clone & enter repo
git clone https://github.com/your-org/charting-app.git
cd charting-app

# ---------- Backend ----------
cd backend
mkdir -p build
cd build
cmake ..
cmake --build . --config Release
./chart_server

# ---------- Frontend ----------
cd ../../frontend
npm install
npm run build        # compile TS → dist/app.js
npm start            # launch dev server on http://localhost:3000

# Open browser → http://localhost:3000
# Check console: "WebGL2 context initialized." + "WebSocket connected"

# ---------- Tips ----------
# Rebuild backend after code changes:
cd backend/build
cmake --build . --config Release

# Rebuild frontend TS:
cd frontend
npm run build

# Restart servers as needed
```

---

## 14. Final Words

This project is intentionally ambitious: we want **all** chart types, **all** customization, **all** tools, and future VR/AR. Our guiding principle: **The C++ engine dictates exactly what to draw; the React/WebGL frontend just plays it back as efficiently as possible**. We’ll start simple in Phase 2 and incrementally layer on features until we reach the TradingView caliber and beyond.

**Remember**: If it’s possible and somewhat useful, we implement it. No project is ever “too big” if we break it down into small, manageable phases. You’ve got this! Let’s make an awesome charting library that users will love.

---

*Created with ❤️ by the Charting App team.*
