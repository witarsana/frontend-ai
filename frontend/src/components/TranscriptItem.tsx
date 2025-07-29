import React, { useState } from 'react';
import { TranscriptItem } from '../types';
import { parseTimeToSeconds } from '../utils/helpers';

interface TranscriptItemProps {
  item: TranscriptItem;
  onSeekToTime: (seconds: number) => void;
  currentTime?: number; // Current audio time to highlight active segment
}

const TranscriptItemComponent: React.FC<TranscriptItemProps> = ({ item, onSeekToTime, currentTime = 0 }) => {
  const [isClicked, setIsClicked] = useState(false);
  
  const startSeconds = parseTimeToSeconds(item.start);
  const endSeconds = parseTimeToSeconds(item.end);
  const isActive = currentTime >= startSeconds && currentTime <= endSeconds;

  const handleTimestampClick = () => {
    setIsClicked(true);
    
    // Visual feedback
    setTimeout(() => setIsClicked(false), 1000);
    
    const startSeconds = parseTimeToSeconds(item.start);
    onSeekToTime(startSeconds);
  };

  return (
    <div className={`transcript-item ${isActive ? 'active-segment' : ''}`}>
      <div className="speaker-info">
        <div className={`speaker-avatar ${item.speaker}`}>
          {item.speakerName[0]}
        </div>
        <div>
          <strong>{item.speakerName}</strong>
          <span 
            className={`timestamp ${isClicked ? 'clicked' : ''} ${isActive ? 'playing' : ''}`}
            onClick={handleTimestampClick}
            title="Click to jump to this time in audio"
          >
            {isActive ? '🔊' : '🎵'} {item.start} - {item.end}
          </span>
        </div>
      </div>
      <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>
        {item.text}
      </p>
      <div className="tags">
        {item.tags.map((tag, index) => (
          <span key={index} className={`tag ${tag}`}>
            #{tag.replace('-', '')}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TranscriptItemComponent;
