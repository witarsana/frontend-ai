import React from 'react';
import { TranscriptItem } from '../types';
import TranscriptItemComponent from './TranscriptItem';

interface TranscriptTabProps {
  transcript: TranscriptItem[];
  searchQuery: string;
  activeFilter: string;
  participants: string[];
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onSeekToTime: (seconds: number) => void;
}

const TranscriptTab: React.FC<TranscriptTabProps> = ({
  transcript,
  searchQuery,
  activeFilter,
  participants,
  onSearchChange,
  onFilterChange,
  onSeekToTime
}) => {
  const filters: { label: string; value: string }[] = [
    
  ];
  filters.push({ label: 'All', value: 'All' });

  for (const participant of participants) {
    filters.push({ label: participant, value: participant });
  }

  return (
    <div className="tab-content">
      <div className="controls">
        <input
          type="text"
          className="search-box"
          placeholder="🔍 Cari dalam transcript..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="filters">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={`filter-btn ${activeFilter === filter.value ? 'active' : ''}`}
              onClick={() => onFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {transcript.map((item, index) => (
          <TranscriptItemComponent
            key={index}
            item={item}
            onSeekToTime={onSeekToTime}
          />
        ))}
      </div>
    </div>
  );
};

export default TranscriptTab;
