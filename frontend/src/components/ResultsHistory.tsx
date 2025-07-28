import React, { useState, useEffect } from 'react';
import { aiAPI } from '../services/api';

interface HistoryItem {
  job_id: string;
  filename: string;
  processed_at: string;
  duration: number;
  word_count: number;
  summary_preview?: string;
}

interface ResultsHistoryProps {
  onSelectJob: (jobId: string) => void;
  currentJobId?: string;
}

const ResultsHistory: React.FC<ResultsHistoryProps> = ({ onSelectJob, currentJobId }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await aiAPI.getCompletedJobs();
      setHistoryItems(response.jobs || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="results-history">
        <h3>📁 Riwayat Hasil</h3>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div className="loading-spinner">Memuat riwayat...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-history">
        <h3>📁 Riwayat Hasil</h3>
        <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
          ❌ {error}
          <button 
            onClick={loadHistory}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              fontSize: '12px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-history">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3>📁 Riwayat Hasil</h3>
        <button 
          onClick={loadHistory}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {historyItems.length === 0 ? (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#6c757d',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px dashed #dee2e6'
        }}>
          📝 Belum ada hasil transkrip.
          <br />
          <small>Upload file audio untuk memulai transkrip.</small>
        </div>
      ) : (
        <div className="history-list">
          {historyItems.map((item) => (
            <div 
              key={item.job_id}
              className={`history-item ${currentJobId === item.job_id ? 'active' : ''}`}
              onClick={() => onSelectJob(item.job_id)}
              style={{
                padding: '12px',
                border: currentJobId === item.job_id ? '2px solid #007bff' : '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                backgroundColor: currentJobId === item.job_id ? '#e7f3ff' : '#fff',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    📄 {item.filename}
                    {currentJobId === item.job_id && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '12px', 
                        color: '#007bff',
                        fontWeight: 'normal'
                      }}>
                        (sedang dilihat)
                      </span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                    🕒 {formatDate(item.processed_at)} • 
                    ⏱️ {formatDuration(item.duration)} • 
                    📝 {item.word_count.toLocaleString()} kata
                  </div>

                  {item.summary_preview && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#495057',
                      marginTop: '4px',
                      maxHeight: '40px',
                      overflow: 'hidden',
                      lineHeight: '1.3'
                    }}>
                      {item.summary_preview}...
                    </div>
                  )}
                </div>

                <div style={{ 
                  fontSize: '10px', 
                  color: '#6c757d',
                  textAlign: 'right',
                  minWidth: '80px'
                }}>
                  Job: {item.job_id.slice(-8)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsHistory;
