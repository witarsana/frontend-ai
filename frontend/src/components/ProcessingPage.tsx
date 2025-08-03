import React, { useState, useEffect } from 'react';
import { AITranscriptionAPI } from '../services/api';

// Add CSS animation for spinning icon, pulse indicator, and shimmer effect
const spinKeyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// Inject the CSS into the document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}

interface ProcessingStatus {
  status: string;
  progress: number;
  stage_progress?: number;
  message: string;
  error?: string;
  result_available?: boolean;
  elapsed_time?: string;
  estimated_remaining?: string;
  current_stage?: string;
  stage_detail?: {
    name: string;
    progress: number;
    weight: number;
    description?: string;
  };
  processing_info?: {
    total_stages: number;
    current_stage_index: number;
    stage_start: number;
    stage_end: number;
  };
}

interface ProcessingPageProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
}

const ProcessingPage: React.FC<ProcessingPageProps> = ({ 
  jobId, 
  onComplete, 
  onError, 
  onBack 
}) => {
  const [status, setStatus] = useState<ProcessingStatus>({
    status: 'initializing',
    progress: 0,
    message: 'Starting processing...'
  });
  const [isPolling, setIsPolling] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [startTime] = useState(Date.now());

  const api = new AITranscriptionAPI();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    setLogs(prev => [...prev.slice(-10), `[${timestamp}] [${elapsed}s] ${message}`]);
  };

  const pollStatus = async () => {
    if (!jobId || !isPolling) return;

    try {
      const statusResponse = await api.getStatus(jobId);
      setStatus({
        status: statusResponse.status,
        progress: statusResponse.progress,
        stage_progress: (statusResponse as any).stage_progress,
        message: statusResponse.message || 'Processing...',
        error: statusResponse.error,
        result_available: (statusResponse as any).result_available,
        elapsed_time: (statusResponse as any).elapsed_time,
        estimated_remaining: (statusResponse as any).estimated_remaining,
        current_stage: (statusResponse as any).current_stage,
        stage_detail: (statusResponse as any).stage_detail,
        processing_info: (statusResponse as any).processing_info
      });
      
      // Enhanced logging with stage information
      const stageInfo = (statusResponse as any).stage_detail ? 
        ` [${(statusResponse as any).stage_detail.name}: ${(statusResponse as any).stage_progress || 0}%]` : '';
      addLog(`Status: ${statusResponse.status} (${statusResponse.progress}%)${stageInfo} - ${statusResponse.message || 'Processing...'}`);

      if (statusResponse.status === 'completed') {
        setIsPolling(false);
        addLog('✅ Processing completed successfully!');
        
        if (onComplete) {
          // Get the result and call onComplete
          try {
            const result = await api.getResult(jobId);
            onComplete(result);
          } catch (error) {
            addLog(`❌ Error getting result: ${error}`);
          }
        }
      } else if (statusResponse.status === 'error') {
        setIsPolling(false);
        const errorMsg = statusResponse.error || 'Unknown error';
        addLog(`❌ Error: ${errorMsg}`);
        if (onError) {
          onError(errorMsg);
        }
      }
    } catch (error) {
      addLog(`⚠️ Polling error: ${error}`);
      console.error('Polling error:', error);
    }
  };

  useEffect(() => {
    if (!jobId) {
      if (onBack) onBack();
      return;
    }

    addLog(`🚀 Starting to monitor job: ${jobId}`);
    
    // Save current job to localStorage for resume capability
    localStorage.setItem('currentProcessingJob', JSON.stringify({
      jobId,
      startTime,
      timestamp: Date.now()
    }));
    
    // Start polling immediately
    pollStatus();
    
    // Set up polling interval  
    const interval = setInterval(pollStatus, 1000); // Poll every 1 second for better responsiveness
    
    return () => {
      clearInterval(interval);
      setIsPolling(false);
      
      // Only clear localStorage if job is completed or error
      if (status.status === 'completed' || status.status === 'error') {
        localStorage.removeItem('currentProcessingJob');
      }
    };
  }, [jobId, status.status]);

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      case 'processing': 
      case 'transcribing': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'processing': 
      case 'transcribing': 
      case 'ai_analysis':
        return (
          <span style={{
            display: 'inline-block',
            animation: 'spin 1s linear infinite',
            fontSize: '24px'
          }}>
            ⚙️
          </span>
        );
      default: return '🔄';
    }
  };

  const elapsedTime = Math.round((Date.now() - startTime) / 1000);

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          color: '#1f2937',
          fontSize: '28px'
        }}>
          {getStatusIcon()} Processing Your Audio
          {(status.status === 'processing' || status.status === 'transcribing' || status.status === 'ai_analysis') && (
            <span style={{
              marginLeft: '12px',
              fontSize: '16px',
              color: '#10b981',
              fontWeight: 'normal'
            }}>
              - System Working...
            </span>
          )}
        </h1>
        <p style={{ 
          margin: '0', 
          color: '#6b7280',
          fontSize: '16px'
        }}>
          Job ID: <code style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>{jobId}</code>
        </p>
        <p style={{ 
          margin: '8px 0 0 0', 
          color: '#6b7280',
          fontSize: '14px'
        }}>
          Elapsed time: {elapsedTime}s
        </p>
      </div>

      {/* Progress Section */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            margin: '0', 
            color: '#1f2937',
            fontSize: '18px'
          }}>
            Progress
          </h3>
          <span style={{
            backgroundColor: getStatusColor(),
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {status.status}
          </span>
        </div>

        {/* Progress Bar with Enhanced Gradient Effect */}
        <div style={{
          width: '100%',
          height: '16px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '12px',
          position: 'relative'
        }}>
          <div style={{
            width: `${status.progress}%`,
            height: '100%',
            background: status.status === 'completed' 
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : status.status === 'error'
              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
              : 'linear-gradient(90deg, #3b82f6, #1d4ed8, #1e40af)',
            transition: 'width 0.5s ease-out',
            borderRadius: '8px',
            position: 'relative'
          }}>
            {/* Animated shimmer effect for active processing */}
            {(status.status === 'processing' || status.status === 'transcribing' || status.status === 'ai_analysis') && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 2s infinite',
                borderRadius: '8px'
              }} />
            )}
          </div>
          {/* Progress percentage overlay */}
          {status.progress > 10 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              {status.progress}%
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '8px'
        }}>
          <span>
            {status.message}
            {(status.status === 'processing' || status.status === 'transcribing' || status.status === 'ai_analysis') && (
              <span style={{
                marginLeft: '8px',
                color: '#10b981',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                ● ACTIVE
              </span>
            )}
            {status.estimated_remaining && (
              <span style={{
                marginLeft: '8px',
                color: '#9ca3af',
                fontSize: '12px'
              }}>
                (Est. {status.estimated_remaining} remaining)
              </span>
            )}
          </span>
          <span style={{ fontWeight: '600' }}>{status.progress}%</span>
        </div>

        {/* Current Stage Indicator */}
        {status.current_stage && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            fontSize: '13px',
            color: '#0369a1'
          }}>
            <strong>Current Stage:</strong> {status.current_stage}
            {status.stage_progress && (
              <span style={{ marginLeft: '8px', fontWeight: '600' }}>
                ({status.stage_progress}%)
              </span>
            )}
          </div>
        )}

        {/* Stage Progress Details */}
        {status.stage_detail && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontWeight: 'bold', color: '#374151' }}>
                {status.stage_detail.name}
              </span>
              <span style={{ 
                backgroundColor: getStatusColor(),
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px'
              }}>
                {status.stage_progress || status.stage_detail.progress}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#e2e8f0',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${status.stage_progress || status.stage_detail.progress}%`,
                height: '100%',
                backgroundColor: getStatusColor(),
                transition: 'width 0.3s ease',
                borderRadius: '3px'
              }} />
            </div>

            {status.processing_info && (
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '8px'
              }}>
                Stage {status.processing_info.current_stage_index} of {status.processing_info.total_stages}
                {status.elapsed_time && ` • Elapsed: ${status.elapsed_time}`}
                {status.estimated_remaining && status.estimated_remaining !== "Almost done!" && ` • Est. remaining: ${status.estimated_remaining}`}
              </div>
            )}
          </div>
        )}

        {/* Processing Steps Overview */}
        {(status.status === 'processing' || status.status === 'transcribing' || status.status === 'ai_analysis') && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#f59e0b',
                borderRadius: '50%',
                marginRight: '8px',
                animation: 'pulse 1.5s infinite'
              }} />
              <strong style={{ color: '#92400e' }}>
                System is actively processing your audio file
              </strong>
            </div>
            <div style={{
              fontSize: '13px',
              color: '#78350f',
              lineHeight: '1.4'
            }}>
              The AI is working on transcribing your audio and generating insights. 
              This process can take a few minutes depending on file length.
              {status.elapsed_time && (
                <span style={{ display: 'block', marginTop: '4px', fontWeight: '600' }}>
                  Processing time so far: {status.elapsed_time}
                </span>
              )}
            </div>
          </div>
        )}

        {status.error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626'
          }}>
            <strong>Error:</strong> {status.error}
          </div>
        )}
      </div>

      {/* Live Logs */}
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#f9fafb',
          fontSize: '16px'
        }}>
          📋 Live Processing Logs
        </h3>
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '8px',
          padding: '16px',
          maxHeight: '200px',
          overflowY: 'auto',
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '12px'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#9ca3af' }}>Waiting for logs...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ 
                color: '#f3f4f6',
                marginBottom: '4px',
                wordBreak: 'break-word'
              }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center'
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Back to Upload
          </button>
        )}
        
        {status.status === 'completed' && (
          <button
            onClick={() => {
              // This will be handled by onComplete callback
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ✅ Completed
          </button>
        )}

        {status.status === 'error' && (
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔄 Retry
          </button>
        )}
      </div>

      {/* Auto-refresh indicator */}
      {isPolling && (
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#6b7280',
          fontSize: '12px'
        }}>
          🔄 Auto-refreshing every 3 seconds...
        </div>
      )}
    </div>
  );
};

export default ProcessingPage;
