import React, { useState, useEffect } from 'react';
import { Database, FileText, Clock, ChevronRight, Search, Filter } from 'lucide-react';
import { API_CONFIG } from '../services/api';

interface CompletedJob {
  job_id: string;
  filename: string;
  duration: number;
  word_count: number;
  processed_at: string;
  summary_preview?: string;
}

interface HistorySelectorProps {
  onSelectHistory: (jobId: string, jobInfo: CompletedJob) => void;
}

const HistorySelector: React.FC<HistorySelectorProps> = ({ onSelectHistory }) => {
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'filename' | 'duration'>('date');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompletedJobs();
  }, []);

  const loadCompletedJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/jobs/completed`);
      const data = await response.json();
      
      if (data.jobs) {
        setCompletedJobs(data.jobs);
      } else {
        setError('No completed jobs found');
      }
    } catch (error) {
      console.error('Failed to load completed jobs:', error);
      setError('Failed to load history. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedJobs = completedJobs
    .filter(job => 
      job.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime();
        case 'filename':
          return a.filename.localeCompare(b.filename);
        case 'duration':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#666'
      }}>
        <Database size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <p>Loading transcription history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#666'
      }}>
        <Database size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <p style={{ color: '#dc3545', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={loadCompletedJobs}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Database size={32} />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>
            Transcription History
          </h1>
        </div>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
          Select a completed transcription to view summary, segments, and chat with AI
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }}
          />
          <input
            type="text"
            placeholder="Search by filename or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={20} style={{ color: '#666' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'filename' | 'duration')}
            style={{
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="filename">Sort by Filename</option>
            <option value="duration">Sort by Duration</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div style={{
        marginBottom: '16px',
        color: '#666',
        fontSize: '14px'
      }}>
        Showing {filteredAndSortedJobs.length} of {completedJobs.length} transcriptions
      </div>

      {/* Jobs Grid */}
      {filteredAndSortedJobs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#666'
        }}>
          {searchTerm ? (
            <>
              <Search size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No transcriptions found matching "{searchTerm}"</p>
            </>
          ) : (
            <>
              <Database size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No completed transcriptions available</p>
            </>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '16px'
        }}>
          {filteredAndSortedJobs.map((job) => (
            <div
              key={job.job_id}
              onClick={() => onSelectHistory(job.job_id, job)}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = '#007acc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    wordBreak: 'break-word'
                  }}>
                    {job.filename}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#666',
                    fontFamily: 'monospace'
                  }}>
                    ID: {job.job_id}
                  </p>
                </div>
                <ChevronRight size={20} style={{ color: '#007acc', flexShrink: 0 }} />
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <Clock size={16} />
                  <span>{formatDuration(job.duration)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <FileText size={16} />
                  <span>{job.word_count.toLocaleString()} words</span>
                </div>
              </div>

              {/* Summary Preview */}
              {job.summary_preview && (
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#555',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {job.summary_preview}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#888'
              }}>
                <span>{formatDate(job.processed_at)}</span>
                <div style={{
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  Completed
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistorySelector;
