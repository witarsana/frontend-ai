// API configuration for connecting to Python FastAPI backend
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8002', // FFmpeg-free backend
  ENDPOINTS: {
    UPLOAD: '/api/upload-and-process',
    STATUS: '/api/status',
    RESULT: '/api/result'
  }
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
  status: 'pending' | 'preprocessing' | 'transcribing' | 'generating_summary' | 'completed' | 'error';
  progress: number;
  message?: string;
  error?: string;
  word_count?: number;
  duration?: number;
}

export interface APIResultResponse {
  job_id: string;
  filename: string;
  transcript: Array<{
    start: number;
    end: number;
    text: string;
    speaker: string;
    speaker_name: string;
    confidence: number;
    tags: string[];
  }>;
  summary: string;
  action_items: string[];
  key_decisions: string[];
  tags: string[];
  speakers: string[];
  participants: string[];
  meeting_type: string;
  sentiment: string;
  duration: number;
  language: string;
  word_count: number;
  audio_info: {
    sample_rate: number;
    duration: number;
    samples: number;
    channels: number;
  };
  processed_at: string;
}

// API service class
export class AITranscriptionAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Upload and start processing
  async uploadAndProcess(file: File): Promise<APIUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.UPLOAD}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Check processing status
  async getStatus(jobId: string): Promise<APIStatusResponse> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.STATUS}/${jobId}`);

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get final results
  async getResult(jobId: string): Promise<APIResultResponse> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.RESULT}/${jobId}`);

    if (!response.ok) {
      throw new Error(`Get result failed: ${response.statusText}`);
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

        if (status.status === 'completed') {
          return await this.getResult(jobId);
        }

        if (status.status === 'error') {
          throw new Error(status.error || 'Processing failed');
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;

      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error('Processing timeout - maximum attempts reached');
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
}

// Export singleton instance
export const aiAPI = new AITranscriptionAPI();

// Utility function to convert API result to frontend format
export function convertAPIResultToFrontendFormat(apiResult: APIResultResponse) {
  return {
    transcript: apiResult.transcript.map(segment => ({
      start: segment.start.toString(),
      end: segment.end.toString(),
      speakerName: segment.speaker_name,
      speaker: segment.speaker,
      text: segment.text,
      tags: segment.tags
    })),
    summary: {
      overview: apiResult.summary,
      actionItems: apiResult.action_items,
      keyDecisions: apiResult.key_decisions,
      tags: apiResult.tags,
      participants: apiResult.participants,
      meetingType: apiResult.meeting_type,
      sentiment: apiResult.sentiment,
      duration: apiResult.duration,
      wordCount: apiResult.word_count,
      language: apiResult.language
    },
    analytics: {
      speakerDistribution: apiResult.speakers.map(speaker => ({
        speaker,
        percentage: Math.round((apiResult.transcript.filter(s => s.speaker_name === speaker).length / apiResult.transcript.length) * 100),
        segments: apiResult.transcript.filter(s => s.speaker_name === speaker).length
      })),
      sentimentAnalysis: {
        overall: apiResult.sentiment,
        positive: apiResult.sentiment === 'positive' ? 70 : 30,
        neutral: apiResult.sentiment === 'neutral' ? 70 : 30,
        negative: apiResult.sentiment === 'negative' ? 70 : 30
      },
      topTopics: apiResult.tags.slice(0, 5),
      engagementMetrics: {
        totalWords: apiResult.word_count,
        averageWordsPerMinute: Math.round(apiResult.word_count / (apiResult.duration / 60)),
        totalSpeakers: apiResult.speakers.length,
        meetingDuration: `${Math.floor(apiResult.duration / 60)} minutes ${Math.floor(apiResult.duration % 60)} seconds`
      }
    }
  };
}
