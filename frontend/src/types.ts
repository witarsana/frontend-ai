export interface TranscriptItem {
  id?: number;
  start: string;
  end: string;
  speaker: string;
  speakerName: string;
  text: string;
  tags: string[];
  confidence?: number;
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
  error?: {
    message: string;
    type?:
      | "quota_exceeded"
      | "connection_error"
      | "api_error"
      | "general_error";
    details?: string;
  };
  autoFallback?: {
    reason: string;
    message: string;
    details?: {
      file_size_mb: number;
      duration_minutes: number;
      max_size_mb: number;
      max_duration_min: number;
    };
    recommendation?: string;
  };
  timeoutFallback?: {
    reason: string;
    message: string;
    original_error?: string;
  };
}

export type Tab = "summary" | "transcript" | "analytics" | "chat";

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

export interface NotionProperties {
  Priority: string;
  Category: string;
  "Due Date": string;
  Assigned: string;
  Status: string;
}

export interface NotionReady {
  title: string;
  properties: NotionProperties;
}

export interface EnhancedActionItem {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  category: "Immediate" | "Short-term" | "Strategic" | "Ongoing";
  timeframe: string;
  assigned_to: string;
  tags: string[];
  notion_ready: NotionReady;
}

export interface KeyDecision {
  title: string;
  description: string;
  category: "Decision" | "Insight" | "Strategy" | "Learning" | "Best Practice" | "Framework";
  impact: "High" | "Medium" | "Low";
  actionable: boolean;
}

export interface SummaryData {
  meetingSummary: string;
  // actionItems: REMOVED - No longer using basic action items feature
  enhancedActionItems: EnhancedActionItem[]; // Keep enhanced action items - this is the better feature
  keyDecisions: string[] | KeyDecision[]; // Support both legacy and new format
  speakerPoints: string[];
  pointOfView: string[];
}
