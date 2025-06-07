// frontend/src/App.tsx

import React from 'react';
import ChartCanvas from './components/ChartCanvas';

const App: React.FC = () => (
  <ChartCanvas wsUrl="ws://localhost:9001" />
);

export default App;
