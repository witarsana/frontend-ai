import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, FileText, Clock, User, Settings, Database } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { API_CONFIG } from '../services/api';

interface ChatMessage {
  id: string;
  query: string;
  response: string;
  sources: Array<{
    type: string;
    similarity_score?: number;
    chunk_id?: string;
    context_chunks?: number;
  }>;
  timestamp: string;
  confidence: number;
  model_used?: string;
  cost?: number;
  tokens_used?: number;
  response_time?: number;
  reason?: string;
}

interface CompletedJob {
  job_id: string;
  filename: string;
  duration: number;
  word_count: number;
  processed_at: string;
  summary_preview?: string;
}

interface ChatTabProps {
  currentFileId?: string;
  isTranscriptionReady: boolean;
}

const ChatTab: React.FC<ChatTabProps> = ({ currentFileId, isTranscriptionReady }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions] = useState<string[]>([
    "Siapa saja speaker dalam meeting ini?",
    "Apa topik utama yang dibahas?", 
    "Keputusan apa yang dibuat?",
    "Apa action items yang disebutkan?"
  ]);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('faiss'); // Default ke FAISS (offline)
  // Note: These variables are reserved for future enhanced chat features
  const [_useEnhancedChat, _setUseEnhancedChat] = useState(true);
  const [_chatStats, _setChatStats] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // New state for history management
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadedJobInfo, setLoadedJobInfo] = useState<CompletedJob | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

    // Load transcript when file ID changes
  useEffect(() => {
    if (currentFileId && isTranscriptionReady) {
      loadTranscriptForChat();
    }
  }, [currentFileId, isTranscriptionReady]);

  // Load completed jobs for history
  useEffect(() => {
    loadCompletedJobs();
  }, []);

  const loadCompletedJobs = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/jobs/completed`);
      const data = await response.json();
      setCompletedJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to load completed jobs:', error);
    }
  };

  const loadTranscriptForChat = async () => {
    if (!currentFileId) return;
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/chat/load/${currentFileId}`);
      const data = await response.json();
      
      if (data.status === 'success' && data.job_info) {
        const jobInfo = data.job_info;
        const completedJob: CompletedJob = {
          job_id: currentFileId || '',
          filename: jobInfo.filename || `file_${currentFileId}`,
          duration: jobInfo.duration || 0,
          word_count: jobInfo.word_count || 0,
          processed_at: new Date().toISOString(),
          summary_preview: jobInfo.summary_preview
        };
        setLoadedJobInfo(completedJob);
        console.log('Transcript loaded for chat:', data);
      }
    } catch (error) {
      console.error('Failed to load transcript for chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentQuery.trim() || isLoading) return;

    const userQuery = currentQuery;
    setCurrentQuery('');
    setIsLoading(true);

    try {
      // Pilih endpoint berdasarkan model yang dipilih
      let endpoint = '';
      let requestBody: any = {};

      // Gunakan enhanced chat untuk semua model
      endpoint = `${API_CONFIG.BASE_URL}/api/chat/enhanced`;
      requestBody = {
        query: userQuery,
        session_id: sessionId,
        model_preference: selectedModel, // Selalu gunakan model yang dipilih (faiss atau mistral)
        use_smart_routing: false,  // Tidak perlu smart routing karena user sudah pilih model
        job_id: currentFileId  // Tambahkan job_id untuk load transcript yang benar
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chat API');
      }

      const chatResponse = await response.json();
      
      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        query: userQuery,
        response: chatResponse.response,
        sources: chatResponse.sources || [],
        timestamp: chatResponse.timestamp,
        confidence: chatResponse.confidence || 0.5,
        model_used: chatResponse.model_used || selectedModel,
        cost: chatResponse.cost || 0,
        tokens_used: chatResponse.tokens_used || 0,
        response_time: chatResponse.response_time || 0,
        reason: chatResponse.reason || ''
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        query: userQuery,
        response: 'Maaf, terjadi error. Silakan coba lagi.',
        sources: [],
        timestamp: new Date().toISOString(),
        confidence: 0,
        model_used: 'error',
        cost: 0,
        tokens_used: 0
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentQuery(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleJobSelect = async (jobId: string) => {
    setSelectedJobId(jobId);
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/chat/load/${jobId}`);
      const data = await response.json();
      
      if (data.success) {
        const selectedJob = completedJobs.find(job => job.job_id === jobId);
        if (selectedJob) {
          setLoadedJobInfo(selectedJob);
        }
        // Optionally clear current messages and load chat history for this job
        setMessages([]);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isTranscriptionReady) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Upload dan process audio file terlebih dahulu untuk mulai chat</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '600px',
      border: '1px solid #e1e5e9',
      borderRadius: '8px',
      backgroundColor: '#ffffff'
    }}>
      {/* Chat Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <MessageCircle size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>AI Meeting Assistant</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                {loadedJobInfo ? 
                  `🟢 ${loadedJobInfo}` :
                  currentFileId ? 
                  `🟢 Connected to transcript: ${currentFileId.substring(0, 20)}...` : 
                  'Tanya apa saja tentang isi meeting ini'
                }
              </p>
            </div>
          </div>
          
          {/* History Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Load previous transcripts"
            >
              <Database size={16} />
              <span style={{ fontSize: '12px' }}>History</span>
            </button>
          </div>
          
          {/* Model Selector and Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {_useEnhancedChat && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="faiss" style={{ color: 'black' }}>� FAISS (Offline Free)</option>
                <option value="mistral" style={{ color: 'black' }}>🧠 Mistral AI</option>
              </select>
            )}
            
            <button
              onClick={() => setShowSettings(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Chat Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* History Dropdown */}
      {showHistory && (
        <div style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          padding: '16px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Select Transcript History
          </h4>
          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Loading history...
            </div>
          ) : completedJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No completed transcripts found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {completedJobs.map((job) => (
                <div
                  key={job.job_id}
                  onClick={() => handleJobSelect(job.job_id)}
                  style={{
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedJobId === job.job_id ? '#e3f2fd' : 'white',
                    borderColor: selectedJobId === job.job_id ? '#2196f3' : '#e0e0e0',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedJobId !== job.job_id) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedJobId !== job.job_id) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{ 
                      fontWeight: '500', 
                      fontSize: '14px',
                      color: '#333'
                    }}>
                      {job.filename}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      backgroundColor: '#f0f0f0',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {job.word_count} words
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#888',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>ID: {job.job_id}</span>
                    <span>{new Date(job.processed_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Current Selection Info */}
          {loadedJobInfo && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#e8f5e8',
              borderRadius: '6px',
              border: '1px solid #4caf50'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#2e7d32', marginBottom: '4px' }}>
                Currently Loaded: {loadedJobInfo.filename}
              </div>
              <div style={{ fontSize: '12px', color: '#388e3c' }}>
                {loadedJobInfo.word_count} words • ID: {loadedJobInfo.job_id}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#f8f9fa'
      }}>
        {messages.map((message) => (
          <div key={message.id} style={{ marginBottom: '16px' }}>
            {/* User Query */}
            {message.query && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <div style={{
                  backgroundColor: '#007acc',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '18px 18px 4px 18px',
                  maxWidth: '70%',
                  wordWrap: 'break-word'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <User size={14} />
                    <span style={{ fontSize: '12px', opacity: 0.9 }}>You</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px' }}>{message.query}</p>
                </div>
              </div>
            )}

            {/* AI Response */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e1e5e9',
                padding: '12px 16px',
                borderRadius: '18px 18px 18px 4px',
                maxWidth: '70%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: message.model_used?.includes('mistral') 
                      ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)'
                      : message.model_used?.includes('deepseek')
                      ? 'linear-gradient(135deg, #a55eea 0%, #8b5cf6 100%)'
                      : message.model_used?.includes('faiss')
                      ? 'linear-gradient(135deg, #26de81 0%, #20bf6b 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>
                      {message.model_used?.includes('mistral') ? 'M' :
                       message.model_used?.includes('deepseek') ? 'D' :
                       message.model_used?.includes('faiss') ? 'F' : 'AI'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                    {message.model_used?.includes('mistral') ? 'Mistral AI' :
                     message.model_used?.includes('deepseek') ? 'DeepSeek AI' :
                     message.model_used?.includes('faiss') ? 'FAISS Search' : 'Assistant'}
                  </span>
                  
                  {/* Cost indicator */}
                  {message.cost !== undefined && message.cost > 0 && (
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#ff6b6b',
                      backgroundColor: '#fff5f5',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      fontWeight: '500'
                    }}>
                      ${message.cost.toFixed(6)}
                    </span>
                  )}
                  
                  {/* Speed indicator */}
                  {message.response_time !== undefined && (
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#10b981',
                      backgroundColor: '#ecfdf5',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      fontWeight: '500'
                    }}>
                      {message.response_time.toFixed(1)}s
                    </span>
                  )}
                  
                  <span style={{ fontSize: '10px', color: '#999', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Clock size={10} />
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#333'
                }}>
                  {message.response}
                </div>
                
                {/* Sources */}
                {message.sources.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid #e1e5e9'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      fontSize: '11px', 
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      <FileText size={11} />
                      <span>Sources ({message.sources.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {message.sources.map((source, idx) => (
                        <span 
                          key={idx}
                          style={{
                            fontSize: '10px',
                            backgroundColor: '#f0f2f5',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            color: '#666'
                          }}
                        >
                          {source.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#999' }}>Confidence:</div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: level <= message.confidence * 5 ? '#10b981' : '#e5e7eb'
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    {Math.round(message.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e1e5e9',
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" />
                <span style={{ fontSize: '14px', color: '#666' }}>AI sedang berpikir...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 1 && suggestions.length > 0 && (
        <div style={{
          padding: '12px',
          borderTop: '1px solid #e1e5e9',
          backgroundColor: 'white'
        }}>
          <p style={{ 
            fontSize: '12px', 
            color: '#666', 
            margin: '0 0 8px 0',
            fontWeight: '500'
          }}>
            💡 Pertanyaan cepat:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {suggestions.slice(0, 4).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#f0f8ff',
                  color: '#1976d2',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid #e3f2fd',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f8ff';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e1e5e9',
        backgroundColor: 'white',
        borderRadius: '0 0 8px 8px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tanya apa saja tentang meeting ini..."
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #e1e5e9',
              borderRadius: '24px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#007acc';
              e.target.style.boxShadow = '0 0 0 2px rgba(0,122,204,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e1e5e9';
              e.target.style.boxShadow = 'none';
            }}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!currentQuery.trim() || isLoading}
            style={{
              backgroundColor: currentQuery.trim() && !isLoading ? '#007acc' : '#ccc',
              color: 'white',
              padding: '12px',
              borderRadius: '50%',
              border: 'none',
              cursor: currentQuery.trim() && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
};

export default ChatTab;
