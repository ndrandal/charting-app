import React from 'react';

export interface StreamControlsProps {
  /** Current selected series style */
  seriesType: 'line' | 'candlestick';
  /** Called when user picks a different style */
  onSeriesTypeChange: (type: 'line' | 'candlestick') => void;
  /** Start streaming */
  onSubscribe: () => void;
  /** Stop streaming */
  onUnsubscribe: () => void;
  /** Whether we’re actively streaming */
  streaming: boolean;
}

const StreamControls: React.FC<StreamControlsProps> = ({
  seriesType,
  onSeriesTypeChange,
  onSubscribe,
  onUnsubscribe,
  streaming,
}) => (
  <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000 }}>
    {/* Style selector */}
    <button
      onClick={() => onSeriesTypeChange('line')}
      disabled={seriesType === 'line'}
      style={{ marginRight: 8 }}
    >
      Line
    </button>
    <button
      onClick={() => onSeriesTypeChange('candlestick')}
      disabled={seriesType === 'candlestick'}
      style={{ marginRight: 16 }}
    >
      Candlestick
    </button>

    {/* Stream controls */}
    <button
      onClick={onSubscribe}
      disabled={streaming}
      style={{ marginRight: 8 }}
    >
      Start Stream
    </button>
    <button onClick={onUnsubscribe} disabled={!streaming}>
      Stop Stream
    </button>
  </div>
);

export default StreamControls;
