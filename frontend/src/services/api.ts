// API configuration for connecting to Node.js Express backend
export const API_CONFIG = {
  BASE_URL: import.meta.env.DEV ? "http://localhost:8000" : "http://localhost:8000", // Auto-configured for python backend
  ENDPOINTS: {
    UPLOAD: "/api/upload-and-process",
    STATUS: "/api/status",
    RESULT: "/api/result",
    CONFIG: "/api/config",
    ENGINES: "/api/engines",
    SET_ENGINE: "/api/config/engine",
    SPEED_OPTIONS: "/api/speed-options",
    COMPLETED_JOBS: "/api/jobs/completed",
    REGENERATE_SUMMARY: "/api/regenerate-summary",
    CHAT: "/api/chat",
    CHAT_SUGGESTIONS: "/api/chat/suggestions",
    CHAT_STATUS: "/api/chat/status",
    CHAT_LOAD: "/api/chat/load",
    CANCEL: "/api/cancel",
  },
};

// Types for API responses
export interface APIUploadResponse {
  job_id: string;
  filename: string;
  file_size_kb: number;
  message: string;
}

export interface APIStatusResponse {
  job_id: string;
  status:
    | "pending"
    | "preprocessing"
    | "transcribing"
    | "generating_summary"
    | "completed"
    | "error";
  progress: number;
  message?: string;
  error?: string;
  error_type?:
    | "quota_exceeded"
    | "connection_error"
    | "api_error"
    | "general_error";
  error_details?: string;
  word_count?: number;
  duration?: number;
  auto_fallback?: {
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
  timeout_fallback?: {
    reason: string;
    message: string;
    original_error?: string;
  };
}

export interface APIResultResponse {
  job_id: string;
  filename: string;
  transcript: Array<{
    id?: number;
    start: number | string;  // Support both formats
    end: number | string;    // Support both formats  
    text: string;
    speaker: string;
    speakerName?: string;    // Add speakerName field
    speaker_name?: string;   // Keep original field
    confidence?: number;     // Make optional
    tags?: string[];         // Make optional
  }>;
  text?: string;             // Add full text field
  summary?: string;          // Make optional
  duration?: number | string; // Support both formats
  language?: string;         // Make optional
  word_count?: number;       // Make optional
  model_used?: string;       // Add model info
  processing_time?: number;  // Add processing time
  processed_at?: string;     // Add timestamp
  status?: string;           // Add status
  segments?: any[];          // Add segments compatibility
  speakers?: string[];       // Make optional
  participants?: string[];   // Make optional
  detectedSpeakers?: number; // Add detected speakers count
  audioInfo?: any;           // Add audio info
  
  // Optional enhanced features (for backwards compatibility)
  enhanced_action_items?: Array<{
    title: string;
    description: string;
    priority: string;
    category: string;
    timeframe: string;
    assigned_to: string;
    tags: string[];
    notion_ready?: {
      title: string;
      properties: Record<string, any>;
    };
  }>;
  key_decisions?: string[];
  enhanced_key_decisions?: Array<{
    title: string;
    description: string;
    category: string;
    impact: string;
    tags: string[];
  }>;
  actionItems?: any[];       // Add empty action items
  enhancedActionItems?: any[]; // Add enhanced action items
  keyDecisions?: any[];      // Add key decisions
  tags?: string[];           // Make optional
  meeting_type?: string;     // Make optional
  sentiment?: string;        // Make optional
  audio_info?: {             // Make optional
    sample_rate?: number;
    duration?: number;
    samples?: number;
    channels?: number;
    method?: string;
    model?: string;
    speed_mode?: string;
    experimental_speaker_detection?: {
      method: string;
      confidence: string;
      speaker_count: number;
      speakers: string[];
      segments_count: number;
    };
  };
  experimental_speaker_data?: {
    method: string;
    speaker_count: number;
    confidence: string;
    speakers: string[];
    segments: any[];
    analysis?: {
      duration_minutes?: number;
      voice_frames?: number;
      silence_frames?: number;
      voice_activity_ratio?: number;
      speaker_transitions?: number;
      change_points?: number;
      change_frequency_per_minute?: number;
      threshold_used?: number;
    };
  };
  detected_speakers?: number;
}

export interface CompletedJob {
  job_id: string;
  filename: string;
  processed_at: string;
  duration: number;
  word_count: number;
  summary_preview?: string;
}

export interface CompletedJobsResponse {
  jobs: CompletedJob[];
}

// Engine Configuration Types
export interface EngineConfig {
  transcription_engine: string;
  engines_available: {
    faster_whisper: boolean;
    deepgram: boolean;
  };
  deepgram_sdk_available: boolean;
  fallback_enabled: boolean;
}

// Supported transcription engines
export type TranscriptionEngine = "faster-whisper" | "deepgram" | "huggingface";

export interface EngineInfo {
  name: string;
  type: "local" | "cloud";
  cost: "free" | "paid";
  speed: "fast" | "very_fast" | "medium";
  accuracy: "high" | "very_high" | "experimental";
  languages: string;
  features: string[];
  available: boolean;
  quota?: string;
}

export interface EnginesResponse {
  engines: {
    "faster-whisper": EngineInfo;
    deepgram: EngineInfo;
    huggingface: EngineInfo;
  };
  current_engine: string;
  recommendations: {
    for_privacy: string;
    for_accuracy: string;
    for_cost: string;
    for_speed: string;
  };
}

export interface EngineChangeResponse {
  status: string;
  previous_engine: string;
  current_engine: string;
  message: string;
}

export interface SpeedOption {
  model: string;
  description: string;
  expected_speed: string;
  memory_usage: string;
  use_case: string;
}

export interface SpeedOptionsResponse {
  success: boolean;
  speed_options: {
    fast: SpeedOption;
    medium: SpeedOption;
    slow: SpeedOption;
  };
  default: string;
  description: {
    fast: string;
    medium: string;
    slow: string;
  };
}

// API service class
export class AITranscriptionAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Upload and start processing
  async uploadAndProcess(
    file: File,
    options?: { engine?: TranscriptionEngine; language?: string; speed?: string; speakerMethod?: string }
  ): Promise<APIUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    // Add engine preference if provided
    if (options?.engine) {
      formData.append("engine", options.engine);
    }

    // Add language preference if provided
    if (options?.language) {
      formData.append("language", options.language);
    }

    // Add speed preference if provided (default: medium)
    if (options?.speed) {
      formData.append("speed", options.speed);
    }

    // Add speaker method preference if provided (for experimental mode)
    if (options?.speakerMethod) {
      formData.append("speaker_method", options.speakerMethod);
    }

    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.UPLOAD}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      // Try to extract error message from response body
      let errorMessage = `Upload failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // If JSON parsing fails, use the status text
        console.warn("Could not parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Check processing status
  async getStatus(jobId: string): Promise<APIStatusResponse> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.STATUS}/${jobId}`
    );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get final results
  async getResult(jobId: string): Promise<APIResultResponse> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.RESULT}/${jobId}`
    );

    if (!response.ok) {
      throw new Error(`Get result failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Cancel a running job
  async cancelJob(jobId: string): Promise<{job_id: string, status: string, message: string}> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.CANCEL}/${jobId}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      throw new Error(`Cancel job failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get list of completed jobs
  async getCompletedJobs(): Promise<CompletedJobsResponse> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.COMPLETED_JOBS}`
    );

    if (!response.ok) {
      throw new Error(`Get completed jobs failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Utility method to poll status until completion
  async waitForCompletion(
    jobId: string,
    onProgress?: (status: APIStatusResponse) => void,
    maxAttempts: number = 240, // 20 minutes
    intervalMs: number = 5000 // 5 seconds
  ): Promise<APIResultResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.getStatus(jobId);

        if (onProgress) {
          onProgress(status);
        }

        if (status.status === "completed") {
          return await this.getResult(jobId);
        }

        if (status.status === "error") {
          const errorInfo = {
            message: status.error || "Processing failed",
            type: status.error_type || "general_error",
            details: status.error_details || undefined,
          };
          const error = new Error(errorInfo.message);
          (error as any).errorInfo = errorInfo;
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        console.error("Status check error:", error);
        attempts++;

        if (attempts >= maxAttempts) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error("Processing timeout - maximum attempts reached");
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get available speed options
  async getSpeedOptions(): Promise<SpeedOptionsResponse> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.SPEED_OPTIONS}`
    );

    if (!response.ok) {
      throw new Error(`Get speed options failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Regenerate summary for existing job
  async regenerateSummary(jobId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.REGENERATE_SUMMARY}/${jobId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Summary regeneration failed: ${response.statusText} - ${errorData}`
      );
    }

    return response.json();
  }
}

// Utility function to convert API result to frontend format
// Helper function to convert seconds to MM:SS format
function formatSecondsToTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

export function convertAPIResultToFrontendFormat(apiResult: APIResultResponse) {
  // Safely extract values with defaults
  const duration = typeof apiResult.duration === 'string' ? apiResult.duration : 
                   typeof apiResult.duration === 'number' ? formatSecondsToTimestamp(apiResult.duration) : "0:00";
  const wordCount = apiResult.word_count || 0;
  const speakers = apiResult.speakers || ["Speaker 1"];
  
  return {
    transcript: (apiResult.transcript || []).map((segment) => ({
      id: segment.id || 0,
      start: typeof segment.start === 'number' ? formatSecondsToTimestamp(segment.start) : segment.start,
      end: typeof segment.end === 'number' ? formatSecondsToTimestamp(segment.end) : segment.end,
      speakerName: segment.speakerName || segment.speaker_name || segment.speaker || "Speaker 1",
      speaker: segment.speaker || "Speaker 1",
      text: segment.text || "",
      tags: segment.tags || [],
      confidence: segment.confidence || 0.95,
    })),
    summary: {
      overview: apiResult.summary || "Transcription completed successfully.",
      keyDecisions: apiResult.enhanced_key_decisions || apiResult.key_decisions || apiResult.keyDecisions || [],
      tags: apiResult.tags || [],
      participants: apiResult.participants || speakers,
      meetingType: apiResult.meeting_type || "conversation",
      sentiment: apiResult.sentiment || "neutral",
      duration: duration,
      wordCount: wordCount,
      language: apiResult.language || "en",
    },
    analytics: {
      speakerDistribution: speakers.map((speaker) => ({
        speaker,
        percentage: Math.round(100 / speakers.length),  // Equal distribution for now
        segments: Math.round((apiResult.transcript?.length || 0) / speakers.length),
      })),
      sentimentAnalysis: {
        overall: apiResult.sentiment || "neutral",
        positive: 50,
        neutral: 50,
        negative: 0,
      },
      topTopics: (apiResult.tags || []).slice(0, 5),
      engagementMetrics: {
        totalWords: wordCount,
        averageWordsPerMinute: Math.round(wordCount / Math.max(1, speakers.length)),
        totalSpeakers: speakers.length,
        meetingDuration: duration,
      },
    },
    duration: duration,
    jobId: apiResult.job_id,
  };
}

// Engine Configuration Methods
export class EngineAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Get current engine configuration
  async getConfig(): Promise<EngineConfig> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.CONFIG}`
    );

    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all available engines
  async getEngines(): Promise<EnginesResponse> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.ENGINES}`
    );

    if (!response.ok) {
      throw new Error(`Engines fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Switch transcription engine
  async setEngine(engine: TranscriptionEngine): Promise<EngineChangeResponse> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.SET_ENGINE}?engine=${engine}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || `Engine change failed: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Regenerate summary for existing job
  async regenerateSummary(jobId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.REGENERATE_SUMMARY}/${jobId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Summary regeneration failed: ${response.statusText} - ${errorData}`
      );
    }

    return response.json();
  }
}

// Export singleton instance
export const aiAPI = new AITranscriptionAPI();
