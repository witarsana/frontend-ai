export interface TranscriptItem {
  start: string;
  end: string;
  speaker: string;
  speakerName: string;
  text: string;
  tags: string[];
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  status: string;
}

export type Tab = 'summary' | 'transcript' | 'analytics';

// export type FilterType = string;

export interface AppState {
  showUpload: boolean;
  showProcessing: boolean;
  showResults: boolean;
  activeTab: Tab;
  searchQuery: string;
  activeFilter: string;
  transcript: TranscriptItem[];
  filteredTranscript: TranscriptItem[];
}

export interface SummaryData {
  meetingSummary: string;
  actionItems: string[];
  keyDecisions: string[];
}
