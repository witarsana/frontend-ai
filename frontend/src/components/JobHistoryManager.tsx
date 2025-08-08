import React, { useState, useEffect } from 'react';

interface JobHistoryItem {
  jobId: string;
  filename: string;
  status: 'completed' | 'error';
  progress: number;
  timestamp: number;
  completedAt?: number;
  duration?: string | number;
  fileSize?: number;
  result?: any;
  wordCount?: number;
  summaryPreview?: string;
}

interface JobHistoryManagerProps {
  onViewResult?: (result: any) => void;
}

const JobHistoryManager: React.FC<JobHistoryManagerProps> = ({ 
  onViewResult 
}) => {
  const [completedJobs, setCompletedJobs] = useState<JobHistoryItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadCompletedJobs();
    // Auto-refresh completed jobs every 10 seconds
    const interval = setInterval(loadCompletedJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadCompletedJobs = async () => {
    try {
      // Fetch from backend instead of localStorage
      const response = await fetch('http://localhost:8000/api/jobs/completed');
      if (response.ok) {
        const data = await response.json();
        const jobs = data.jobs.map((job: any) => ({
          jobId: job.job_id,
          filename: job.filename,
          status: 'completed' as const,
          progress: 100,
          timestamp: new Date(job.processed_at).getTime(),
          completedAt: new Date(job.processed_at).getTime(),
          duration: job.duration,
          fileSize: 0, // Backend doesn't provide this currently
          wordCount: job.word_count,
          summaryPreview: job.summary_preview
        }));
        setCompletedJobs(jobs);
        console.log('✅ Loaded completed jobs from backend:', jobs.length);
      } else {
        console.error('Failed to load completed jobs from backend');
        // Fallback to localStorage if backend fails
        loadCompletedJobsFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading completed jobs from backend:', error);
      // Fallback to localStorage if backend fails
      loadCompletedJobsFromLocalStorage();
    }
  };

  const loadCompletedJobsFromLocalStorage = () => {
    try {
      const storedJobs = localStorage.getItem('completedJobs');
      if (storedJobs) {
        const jobs: JobHistoryItem[] = JSON.parse(storedJobs);
        // Sort by completion time (newest first)
        const sortedJobs = jobs.sort((a, b) => (b.completedAt || b.timestamp) - (a.completedAt || a.timestamp));
        setCompletedJobs(sortedJobs);
      } else {
        setCompletedJobs([]);
      }
    } catch (error) {
      console.error('Error loading completed jobs from localStorage:', error);
      setCompletedJobs([]);
    }
  };

  const removeJob = async (jobId: string, filename: string) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `⚠️ Delete this transcript data?\n\n` +
      `File: ${filename}\n` +
      `Job ID: ${jobId.slice(-8)}\n\n` +
      `Data will be permanently deleted from server and cannot be recovered.`
    );
    
    if (!confirmDelete) {
      return; // User cancelled
    }

    try {
      // Delete from backend first
      const response = await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Job deleted from backend:', result);
        
        // Remove from local state
        const filtered = completedJobs.filter(job => job.jobId !== jobId);
        setCompletedJobs(filtered);
        
        // Clean up localStorage as well (for fallback data)
        const storedJobs = localStorage.getItem('completedJobs');
        if (storedJobs) {
          const jobs = JSON.parse(storedJobs);
          const filteredStored = jobs.filter((job: any) => job.jobId !== jobId);
          localStorage.setItem('completedJobs', JSON.stringify(filteredStored));
        }
        
        // Also clean up any related localStorage data
        localStorage.removeItem(`job_progress_${jobId}`);
        localStorage.removeItem(`job_result_${jobId}`);
        
        // Show success confirmation
        alert(`✅ Transcript data "${filename}" successfully deleted from system.`);
      } else {
        const error = await response.json();
        console.error('Failed to delete job from backend:', error);
        alert('❌ Failed to delete data from server. Please try again.');
      }
    } catch (error) {
      console.error('Error removing job:', error);
      alert('❌ Error deleting data. Please check your internet connection and try again.');
    }
  };

  const clearAllJobs = async () => {
    // Enhanced confirmation dialog
    const confirmClear = window.confirm(
      `⚠️ WARNING: Delete ALL transcript data?\n\n` +
      `Total data: ${completedJobs.length} transcripts will be deleted\n` +
      `All transcript files and audio will be permanently deleted from server\n\n` +
      `⚠️ CANNOT BE RECOVERED!\n\n` +
      `Are you sure you want to continue?`
    );
    
    if (!confirmClear) {
      setShowClearConfirm(false);
      return; // User cancelled
    }

    try {
      // Delete all jobs from backend one by one
      const deletePromises = completedJobs.map(job => 
        fetch(`http://localhost:8000/api/jobs/${job.jobId}`, {
          method: 'DELETE'
        })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      
      console.log(`✅ Deleted ${successCount}/${completedJobs.length} jobs from backend`);
      
      // Clear local state
      setCompletedJobs([]);
      
      // Clear localStorage as well (for fallback data)
      localStorage.removeItem('completedJobs');
      
      // Clean up all job-related data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('job_progress_') || key.startsWith('job_result_')) {
          localStorage.removeItem(key);
        }
      });
      
      setShowClearConfirm(false);
      
      // Show success confirmation
      alert(`✅ Successfully deleted ${successCount} of ${completedJobs.length} transcript data.\n\nAll data has been permanently removed from the system.`);
    } catch (error) {
      console.error('Error clearing all jobs:', error);
      alert('❌ Error deleting data. Please check your internet connection and try again.');
    }
  };

  const viewJobResult = async (jobId: string, filename: string) => {
    try {
      // Fetch full result from backend
      const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/result`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && onViewResult) {
          onViewResult(data.result);
        } else {
          alert('❌ Transcript result data not found.');
        }
      } else {
        alert('❌ Failed to fetch transcript data from server.');
      }
    } catch (error) {
      console.error('Error fetching job result:', error);
      alert('❌ Error fetching transcript data. Please check your internet connection.');
    }
  };

  const formatDuration = (duration: string | number) => {
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}m ${seconds}s`;
    }
    return duration;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - timestamp) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Note: addCompletedJob can be accessed via the exported helper function

  if (completedJobs.length === 0) {
    return (
      <div style={{
        backgroundColor: '#f9fafb',
        border: '2px dashed #d1d5db',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Completed Jobs</h3>
        <p style={{ margin: '0', fontSize: '14px' }}>
          Upload and process some audio files to see your job history here
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            color: '#1f2937',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center'
          }}>
            ✅ Completed Jobs ({completedJobs.length})
          </h3>
          <p style={{ 
            margin: '0', 
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Successfully processed transcription jobs
          </p>
        </div>
        
        {completedJobs.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowClearConfirm(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🗑️ Clear All
            </button>
          </div>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: '#dc2626' }}>⚠️ Clear All Jobs?</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>
              This will permanently remove all {completedJobs.length} completed job(s) from history.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowClearConfirm(false)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={clearAllJobs}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              ✓ Clear All
            </button>
          </div>
        </div>
      )}

      {/* Job List */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {completedJobs.map((job, index) => (
          <div
            key={job.jobId}
            style={{
              padding: '16px 20px',
              borderBottom: index < completedJobs.length - 1 ? '1px solid #f3f4f6' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'white',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            {/* Job Info */}
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <span style={{ 
                  fontSize: '16px',
                  color: job.status === 'completed' ? '#10b981' : '#ef4444'
                }}>
                  {job.status === 'completed' ? '✅' : '❌'}
                </span>
                <span style={{
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '15px'
                }}>
                  {job.filename}
                </span>
                <span style={{
                  backgroundColor: job.status === 'completed' ? '#d1fae5' : '#fee2e2',
                  color: job.status === 'completed' ? '#065f46' : '#991b1b',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {job.status}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '13px',
                color: '#6b7280'
              }}>
                <span>📅 {formatTimestamp(job.completedAt || job.timestamp)}</span>
                {job.duration && <span>⏱️ {formatDuration(job.duration)}</span>}
                {job.fileSize && <span>📁 {formatFileSize(job.fileSize)}</span>}
                <span style={{ 
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '11px',
                  color: '#9ca3af'
                }}>
                  ID: {job.jobId.slice(-8)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* View Results Button - Always show for completed jobs */}
              {job.status === 'completed' && (
                <button
                  onClick={() => viewJobResult(job.jobId, job.filename)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={`View transcript results for ${job.filename}`}
                >
                  👁️ View Results
                </button>
              )}
              
              <button
                onClick={() => removeJob(job.jobId, job.filename)}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={`Remove ${job.filename}`}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export helper function for adding completed jobs
export const addCompletedJobToHistory = (jobData: Omit<JobHistoryItem, 'timestamp'>) => {
  try {
    const storedJobs = localStorage.getItem('completedJobs');
    const jobs: JobHistoryItem[] = storedJobs ? JSON.parse(storedJobs) : [];
    
    const jobWithTimestamp: JobHistoryItem = {
      ...jobData,
      timestamp: Date.now(),
      completedAt: Date.now()
    };
    
    // Remove if already exists
    const filtered = jobs.filter(job => job.jobId !== jobData.jobId);
    
    // Add to beginning
    const updated = [jobWithTimestamp, ...filtered];
    
    // Keep only last 50
    const limited = updated.slice(0, 50);
    
    localStorage.setItem('completedJobs', JSON.stringify(limited));
    
    console.log('✅ Added completed job to history:', jobData.jobId, jobData.filename);
  } catch (error) {
    console.error('Error adding completed job to history:', error);
  }
};

export default JobHistoryManager;
