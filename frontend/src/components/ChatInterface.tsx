import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  sources?: any[];
  confidence?: number;
  model_used?: string;
}

interface ChatInterfaceProps {
  sessionId: string;
}

type ChatModel = 'faiss' | 'mistral';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<ChatModel>('faiss');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const STORAGE_KEY = `chat_session_${sessionId}`;
  const MODEL_KEY = `chat_model_${sessionId}`;

  const generateUniqueId = () => {
    const timestamp = Date.now();
    const counter = messageIdCounter;
    const random = Math.floor(Math.random() * 1000);
    setMessageIdCounter(prev => prev + 1);
    return `${sessionId}_${timestamp}_${counter}_${random}`;
  };

  const clearAllMessages = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // Listen for clear chat events
  useEffect(() => {
    const handleClearChat = () => {
      clearAllMessages();
    };

    window.addEventListener('clearChat', handleClearChat);
    return () => window.removeEventListener('clearChat', handleClearChat);
  }, []);

  // Load saved messages and suggestions
  useEffect(() => {
    const savedMessages = sessionStorage.getItem(STORAGE_KEY);
    const savedModel = sessionStorage.getItem(MODEL_KEY) as ChatModel;
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Error parsing saved messages:', error);
      }
    }
    
    if (savedModel) {
      setSelectedModel(savedModel);
    }
    
    // Load fallback suggestions focused on transcript analysis
    const fallbackSuggestions = [
      "Show me conversation segments with speakers",
      "Analyze discussion patterns and insights", 
      "What were the main topics discussed?",
      "Who said what about each topic?",
      "Summarize key decisions and action items",
      "Identify communication dynamics",
      "Extract important quotes from speakers",
      "Timeline of conversation topics"
    ];
    setSuggestions(fallbackSuggestions);
  }, [sessionId]);

  // Auto scroll
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldAutoScroll(false);
    }
  }, [messages, shouldAutoScroll]);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, STORAGE_KEY]);

  // Save model
  useEffect(() => {
    sessionStorage.setItem(MODEL_KEY, selectedModel);
  }, [selectedModel, MODEL_KEY]);

  // Auto-load latest transcript when component mounts and check connection
  useEffect(() => {
    const loadLatestTranscript = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/chat/load/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Auto-loaded transcript:', result.job_id);
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        console.log('⚠️ Could not auto-load transcript:', error);
        setConnectionStatus('disconnected');
      }
    };

    loadLatestTranscript();
  }, []);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    setIsLoading(true);
    setInputMessage('');

    const userMessage: ChatMessage = {
      id: generateUniqueId(),
      message: textToSend,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setShouldAutoScroll(true);

    try {
      console.log('🚀 Sending message to backend:', textToSend);
      console.log('📋 Session ID:', sessionId);
      console.log('🤖 Selected model:', selectedModel);
      
      // Use enhanced endpoint for both with model preference
      const endpoint = 'http://localhost:8000/api/chat/enhanced';
      const payload = {
        query: textToSend,
        session_id: sessionId,
        model_preference: selectedModel,
        use_smart_routing: false
      };
      
      console.log('📡 Using endpoint:', endpoint);
      console.log('📦 Payload:', payload);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend response:', result);
        
        setConnectionStatus('connected');
        
        const aiMessage: ChatMessage = {
          id: generateUniqueId(),
          message: result.answer || result.response || "I received your message but couldn't generate a proper response.",
          isUser: false,
          timestamp: new Date(),
          sources: result.sources,
          confidence: result.confidence,
          model_used: result.model_used || selectedModel
        };

        setMessages(prev => [...prev, aiMessage]);
        setShouldAutoScroll(true);
      } else {
        setConnectionStatus('disconnected');
        const errorText = await response.text();
        console.error('❌ Backend error:', response.status, errorText);
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setConnectionStatus('disconnected');
      
      const errorMessage: ChatMessage = {
        id: generateUniqueId(),
        message: `😔 Connection error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 **Backend Status:**\n• Make sure backend server is running on port 8000\n• Check if FAISS and Mistral models are loaded\n• Try refreshing and trying again`,
        isUser: false,
        timestamp: new Date(),
        confidence: 0.0,
        model_used: "error"
      };

      setMessages(prev => [...prev, errorMessage]);
      setShouldAutoScroll(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getModelIcon = (model?: string) => {
    if (!model) return "🤖";
    if (model.includes('faiss') || model === 'faiss_offline') return "🔋";
    if (model.includes('mistral') || model.includes('multi')) return "🧠";
    if (model.includes('enhanced')) return "🚀";
    if (model.includes('error')) return "⚠️";
    if (model === 'system') return "ℹ️";
    return "🤖";
  };

  return (
    <div 
      className="chat-interface-container"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        flex: 1,
        minHeight: 0,
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}
    >
      {/* Chat Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#374151',
          margin: 0
        }}>
          AI Chat Assistant
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Model:</span>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value as ChatModel)}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              color: '#374151'
            }}
          >
            <option value="faiss">🔋 FAISS (Fast Search)</option>
            <option value="mistral">🧠 Mistral (Advanced Analysis)</option>
          </select>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'disconnected' ? '#ef4444' : '#f59e0b',
              borderRadius: '50%'
            }}></div>
            <span style={{ 
              fontSize: '12px', 
              color: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'disconnected' ? '#ef4444' : '#f59e0b'
            }}>
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'disconnected' ? 'Offline' : 'Checking...'}
            </span>
          </div>
          
          <button
            onClick={clearAllMessages}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#fafbfc',
        scrollBehavior: 'smooth'
      }}
      className="messages-container"
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '250px',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              💬
            </div>
            
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Start Your Conversation
            </h3>
            
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
              maxWidth: '280px',
              lineHeight: '1.4'
            }}>
              Analyze conversation segments, speakers, and meeting content:
            </p>
            
            {/* Simple suggestions */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              maxWidth: '350px'
            }}>
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = '#3b82f6';
                    (e.target as HTMLElement).style.color = '#ffffff';
                    (e.target as HTMLElement).style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = '#f3f4f6';
                    (e.target as HTMLElement).style.color = '#374151';
                    (e.target as HTMLElement).style.borderColor = '#d1d5db';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: message.isUser ? 'row-reverse' : 'row',
              gap: '10px',
              alignItems: 'flex-start',
              margin: message.isUser ? '0 0 0 15%' : '0 15% 0 0'
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: message.isUser ? '#3b82f6' : '#f3f4f6',
              border: message.isUser ? 'none' : '1px solid #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              flexShrink: 0
            }}>
              {message.isUser ? '👤' : getModelIcon(message.model_used)}
            </div>

            {/* Message Bubble */}
            <div style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: message.isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              backgroundColor: message.isUser ? '#3b82f6' : '#ffffff',
              color: message.isUser ? '#ffffff' : '#374151',
              border: message.isUser ? 'none' : '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {message.message}
              </div>
              
              {/* Timestamp */}
              <div style={{
                marginTop: '4px',
                fontSize: '10px',
                opacity: 0.6
              }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            margin: '0 15% 0 0'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              🤖
            </div>
            <div style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '14px 14px 14px 4px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                color: '#6b7280',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                AI is thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end'
        }}>
          <div style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #d1d5db'
          }}>
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about conversation segments, speakers, decisions..."
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: 'none',
                borderRadius: '11px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#374151',
                minHeight: '20px',
                maxHeight: '100px',
                lineHeight: '1.4'
              }}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
              }}
            />
          </div>
          
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: inputMessage.trim() && !isLoading ? '#3b82f6' : '#e5e7eb',
              color: '#ffffff',
              cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0
            }}
          >
            {isLoading ? '⏳' : '🚀'}
          </button>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
          fontSize: '11px',
          color: '#9ca3af'
        }}>
          <span>⏎ Send • ⇧⏎ New line</span>
          <span>{inputMessage.length}/1000</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .messages-container::-webkit-scrollbar {
          width: 4px;
        }
        
        .messages-container::-webkit-scrollbar-track {
          background: #f3f4f6;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
        
        textarea::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;
