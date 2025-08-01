import React, { useState, useEffect } from 'react';
import SessionTranscriptionCard from './SessionTranscriptionCard';
import { API_CONFIG } from '../services/api';

interface CompletedJob {
  job_id: string;
  filename: string;
  duration: number;
  word_count: number;
  processed_at: string;
  summary_preview?: string;
}

interface HistoryDetailViewerProps {
  selectedJob: CompletedJob;
  onBackToHistory: () => void;
}

const HistoryDetailViewer: React.FC<HistoryDetailViewerProps> = ({ selectedJob, onBackToHistory }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [transcriptionData, setTranscriptionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFullTranscriptionData();
  }, [selectedJob.job_id]);

  const loadFullTranscriptionData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the new result endpoint to get full data
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/jobs/${selectedJob.job_id}/result`);
      
      if (!response.ok) {
        throw new Error(`Failed to load transcription data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.result) {
        const result = data.result;
        
        // Extract transcript text from segments
        const fullText = result.transcript?.map((segment: any) => segment.text).join(' ') || '';
        
        // Convert backend data to SessionTranscriptionCard format
        const fullData = {
          id: selectedJob.job_id,
          filename: selectedJob.filename,
          status: 'completed' as const,
          uploadTime: new Date(selectedJob.processed_at),
          text: fullText,
          segments: result.transcript || [],
          summary: result.summary || null,
          actionItems: result.action_items || null,
          keyDecisions: result.key_decisions || null,
          sentiment: result.sentiment || null,
          participants: result.participants || null,
          duration: selectedJob.duration,
          fullResult: result,
          audioUrl: `${API_CONFIG.BASE_URL}/api/audio/${selectedJob.job_id}` // Corrected audio endpoint
        };
        
        setTranscriptionData(fullData);
      } else {
        throw new Error(data.message || 'Failed to load transcription data');
      }
    } catch (error) {
      console.error('Failed to load full transcription data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      
      // Fallback to basic data
      const basicData = {
        id: selectedJob.job_id,
        filename: selectedJob.filename,
        status: 'completed' as const,
        uploadTime: new Date(selectedJob.processed_at),
        text: '',
        duration: selectedJob.duration,
        word_count: selectedJob.word_count,
        audioUrl: `${API_CONFIG.BASE_URL}/api/audio/${selectedJob.job_id}` // Corrected audio endpoint for fallback too
      };
      setTranscriptionData(basicData);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#f8fafc'
      }}>
        {/* Loading State with Integrated Back Button */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px',
          color: '#64748b'
        }}>
          {/* Back Button at Top */}
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '24px'
          }}>
            <button
              onClick={onBackToHistory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e0f2fe';
                e.currentTarget.style.borderColor = '#0ea5e9';
                e.currentTarget.style.color = '#0369a1';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(14, 165, 233, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <span style={{ fontSize: '16px' }}>←</span>
              <span>Back to History</span>
            </button>
          </div>

          {/* Loading Content */}
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '24px'
          }} />
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#334155'
          }}>
            Loading transcription data...
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            opacity: 0.8,
            backgroundColor: '#ffffff',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {selectedJob.filename}
          </p>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !transcriptionData) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#fef2f2'
      }}>
        {/* Error State with Integrated Back Button */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px'
        }}>
          {/* Back Button at Top */}
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '24px'
          }}>
            <button
              onClick={onBackToHistory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e0f2fe';
                e.currentTarget.style.borderColor = '#0ea5e9';
                e.currentTarget.style.color = '#0369a1';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(14, 165, 233, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <span style={{ fontSize: '16px' }}>←</span>
              <span>Back to History</span>
            </button>
          </div>

          {/* Error Content */}
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            border: '3px solid #fecaca'
          }}>
            <span style={{ fontSize: '24px', color: '#dc2626' }}>⚠️</span>
          </div>
          
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#dc2626'
          }}>
            Failed to load transcription data
          </h3>
          
          <p style={{ 
            margin: '0 0 32px 0', 
            fontSize: '14px', 
            textAlign: 'center',
            color: '#7f1d1d',
            backgroundColor: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            maxWidth: '400px'
          }}>
            {error}
          </p>
          
          <button
            onClick={loadFullTranscriptionData}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
            }}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#f8fafc'
    }}>
      {/* Error Warning (if any) */}
      {error && (
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#fef3c7',
          borderBottom: '1px solid #f59e0b',
          color: '#92400e',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0
        }}>
          <span>⚠️</span>
          <span>Some data could not be loaded: {error}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Session Transcription Card */}
        {transcriptionData && (
          <div style={{
            flex: 1,
            overflow: 'hidden'
          }}>
            <SessionTranscriptionCard 
              transcription={transcriptionData}
              onBack={onBackToHistory} // Pass the back handler to SessionTranscriptionCard
              onCopy={() => {
                if (transcriptionData.text) {
                  navigator.clipboard.writeText(transcriptionData.text);
                } else {
                  navigator.clipboard.writeText(selectedJob.filename);
                }
              }}
              onDownload={() => {
                // Create downloadable content
                const content = `
Filename: ${transcriptionData.filename}
Duration: ${transcriptionData.duration}s
Processed: ${transcriptionData.uploadTime.toLocaleString()}

TRANSCRIPT:
${transcriptionData.text || 'No transcript available'}

${transcriptionData.summary ? `SUMMARY:\n${transcriptionData.summary}` : ''}

${transcriptionData.actionItems && transcriptionData.actionItems.length > 0 ? 
  `ACTION ITEMS:\n${transcriptionData.actionItems.map((item: any, idx: number) => 
    `${idx + 1}. ${typeof item === 'string' ? item : item.task}`
  ).join('\n')}` : ''}
                `.trim();
                
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${transcriptionData.filename.replace(/\.[^/.]+$/, "")}_transcript.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              onClear={() => {
                console.log('Clear not implemented for history view');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryDetailViewer;
