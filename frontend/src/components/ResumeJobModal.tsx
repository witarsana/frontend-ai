import React, { useState, useEffect } from 'react';
import { AITranscriptionAPI } from '../services/api';

interface ActiveJob {
  jobId: string;
  startTime: number;
  timestamp: number;
  status?: string;
  progress?: number;
  message?: string;
}

interface ResumeJobModalProps {
  onResumeJob?: (jobId: string) => void;
  onIgnore?: () => void;
}

const ResumeJobModal: React.FC<ResumeJobModalProps> = ({ onResumeJob, onIgnore }) => {
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [jobStatus, setJobStatus] = useState<any>(null);

  const api = new AITranscriptionAPI();

  useEffect(() => {
    checkForActiveJob();
  }, []);

  const checkForActiveJob = async () => {
    try {
      // Check localStorage for active job
      const storedJob = localStorage.getItem('currentProcessingJob');
      if (!storedJob) return;

      const job: ActiveJob = JSON.parse(storedJob);
      
      // Check if job is not too old (max 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - job.timestamp > maxAge) {
        localStorage.removeItem('currentProcessingJob');
        return;
      }

      setActiveJob(job);
      setIsChecking(true);

      // Check job status from backend
      try {
        const status = await api.getStatus(job.jobId);
        setJobStatus(status);
        
        // If job is completed or error, remove from localStorage
        if (status.status === 'completed' || status.status === 'error') {
          localStorage.removeItem('currentProcessingJob');
          setActiveJob(null);
        }
      } catch (error) {
        console.log('Job may not exist anymore:', error);
        localStorage.removeItem('currentProcessingJob');
        setActiveJob(null);
      }
      
      setIsChecking(false);
    } catch (error) {
      console.error('Error checking active job:', error);
      setIsChecking(false);
    }
  };

  const handleResumeJob = () => {
    if (activeJob && onResumeJob) {
      onResumeJob(activeJob.jobId);
    }
  };

  const handleIgnoreJob = () => {
    localStorage.removeItem('currentProcessingJob');
    setActiveJob(null);
    if (onIgnore) onIgnore();
  };

  const formatElapsedTime = (startTime: number) => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      case 'processing': 
      case 'transcribing': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (!activeJob || isChecking) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '24px', marginRight: '12px' }}>🔄</span>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Continue Processing?
          </h3>
        </div>

        <p style={{
          margin: '0 0 16px 0',
          color: '#6b7280',
          lineHeight: '1.5'
        }}>
          You have a job that was processing when you left. Would you like to continue monitoring it?
        </p>

        {/* Job Info */}
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontWeight: '500', color: '#374151' }}>Job ID:</span>
            <code style={{
              backgroundColor: '#e5e7eb',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {activeJob.jobId}
            </code>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontWeight: '500', color: '#374151' }}>Elapsed:</span>
            <span style={{ color: '#6b7280' }}>
              {formatElapsedTime(activeJob.startTime)}
            </span>
          </div>

          {jobStatus && (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>Status:</span>
                <span style={{
                  color: getStatusColor(jobStatus.status),
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>
                  {jobStatus.status} ({jobStatus.progress}%)
                </span>
              </div>
              
              {jobStatus.message && (
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  marginTop: '8px'
                }}>
                  "{jobStatus.message}"
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleIgnoreJob}
            style={{
              padding: '10px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Ignore
          </button>
          
          <button
            onClick={handleResumeJob}
            style={{
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔄 Continue Monitoring
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeJobModal;
