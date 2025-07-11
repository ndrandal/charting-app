import React, { useState } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import ResizableChart from '../components/ResizableChart';
import sampleData from '../data/sampleData';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const initialLayout: Layout[] = [
  { i: 'chart1', x: 0, y: 0, w: 6, h: 8 },
  { i: 'chart2', x: 6, y: 0, w: 6, h: 8 },
];

const Dashboard: React.FC = () => {
  const [layout, setLayout] = useState<Layout[]>(initialLayout);

  return (
    <div className="p-4" style={{ width: '100%', height: '100%' }}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        onLayoutChange={setLayout}
      >
        <div key="chart1">
          <ResizableChart
            data={sampleData}
            title="Chart One"
            xLabel="Time"
            yLabel="Value"
            smooth={false}
          />
        </div>
        <div key="chart2">
          <ResizableChart
            data={sampleData}
            title="Smoothed Chart"
            xLabel="Time"
            yLabel="Value"
            smooth={true}
            smoothSegments={20}
          />
        </div>
      </GridLayout>
    </div>
  );
};

export default Dashboard;