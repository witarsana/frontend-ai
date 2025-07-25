import React from 'react';
import { TranscriptItem } from '../types';
import { parseTimeToSeconds } from '../utils/helpers';

interface TranscriptItemProps {
  item: TranscriptItem;
  onSeekToTime: (seconds: number) => void;
}

const TranscriptItemComponent: React.FC<TranscriptItemProps> = ({ item, onSeekToTime }) => {
  const handleTimestampClick = () => {
    const seconds = parseTimeToSeconds(item.start);
    onSeekToTime(seconds);
  };

  return (
    <div className="transcript-item">
      <div className="speaker-info">
        <div className={`speaker-avatar ${item.speaker}`}>
          {item.speakerName[0]}
        </div>
        <div>
          <strong>{item.speakerName}</strong>
          <span 
            className="timestamp" 
            onClick={handleTimestampClick}
          >
            {item.start} - {item.end}
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
