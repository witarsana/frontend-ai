import React from 'react';
import { TranscriptItem, FilterType } from '../types';
import TranscriptItemComponent from './TranscriptItem';

interface TranscriptTabProps {
  transcript: TranscriptItem[];
  searchQuery: string;
  activeFilter: FilterType;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: FilterType) => void;
  onSeekToTime: (seconds: number) => void;
}

const TranscriptTab: React.FC<TranscriptTabProps> = ({
  transcript,
  searchQuery,
  activeFilter,
  onSearchChange,
  onFilterChange,
  onSeekToTime
}) => {
  const filters: { label: string; value: FilterType }[] = [
    { label: 'Semua', value: 'all' },
    { label: 'Speaker 1', value: 'speaker-1' },
    { label: 'Speaker 2', value: 'speaker-2' },
    { label: 'Speaker 3', value: 'speaker-3' },
    { label: '#ActionItem', value: 'action-item' },
    { label: '#Decision', value: 'decision' }
  ];

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
