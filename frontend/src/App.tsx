// frontend/src/App.tsx

import React from 'react';
import ChartCanvas from './components/ChartCanvas';

const App: React.FC = () => {
  const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:9001';
  return <ChartCanvas wsUrl={wsUrl} />;
};

export default App;
