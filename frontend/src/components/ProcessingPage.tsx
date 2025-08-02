import React, { useState, useEffect } from 'react';
import { AITranscriptionAPI } from '../services/api';

interface ProcessingStatus {
  status: string;
  progress: number;
  message: string;
  error?: string;
  result_available?: boolean;
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
        message: statusResponse.message || 'Processing...',
        error: statusResponse.error,
        result_available: (statusResponse as any).result_available
      });
      
      addLog(`Status: ${statusResponse.status} (${statusResponse.progress}%) - ${statusResponse.message || 'Processing...'}`);

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
    const interval = setInterval(pollStatus, 3000); // Poll every 3 seconds
    
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
      case 'transcribing': return '⚙️';
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

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '12px',
          backgroundColor: '#e5e7eb',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
          <div style={{
            width: `${status.progress}%`,
            height: '100%',
            backgroundColor: getStatusColor(),
            transition: 'width 0.5s ease',
            borderRadius: '6px'
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <span>{status.message}</span>
          <span>{status.progress}%</span>
        </div>

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
