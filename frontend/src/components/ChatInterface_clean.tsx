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

  // Load saved messages
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
    
    loadTranscriptAndSuggestions();
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

  const getChatSuggestions = async (sessionId: string) => {
    console.log(`🎯 Getting suggestions for session: ${sessionId}`);
    
    // Return fallback suggestions immediately and try API in background
    const fallbackSuggestions = [
      "Who were the main speakers?",
      "What were the key decisions?",
      "Summarize the meeting",
      "What topics were discussed?",
      "What action items were mentioned?",
      "Any important deadlines discussed?"
    ];
    
    setSuggestions(fallbackSuggestions);
    
    // Try to get API suggestions in the background
    try {
      const response = await fetch(`/api/chat/suggestions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const apiSuggestions = await response.json();
        if (apiSuggestions && Array.isArray(apiSuggestions) && apiSuggestions.length > 0) {
          console.log('💡 Loaded API suggestions');
          setSuggestions(apiSuggestions);
        }
      }
    } catch (error) {
      console.log('📝 Using fallback suggestions');
    }
    
    return fallbackSuggestions;
  };

  const loadTranscriptAndSuggestions = async () => {
    try {
      await getChatSuggestions(sessionId);
      
      const response = await fetch(`/api/transcript/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to load transcript');
      }
    } catch (error) {
      console.error('❌ Error loading transcript:', error);
      const errorMessage: ChatMessage = {
        id: generateUniqueId(),
        message: "⚠️ Sorry, I couldn't load the transcript data for this session. The chat functionality may not work properly.",
        isUser: false,
        timestamp: new Date(),
        confidence: 0.0,
        model_used: "error"
      };
      setMessages([errorMessage]);
    }
  };

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: textToSend,
          session_id: sessionId,
          model: selectedModel,
          chat_history: messages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.message
          }))
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const aiMessage: ChatMessage = {
          id: generateUniqueId(),
          message: result.answer || result.response || "I received your message but couldn't generate a proper response.",
          isUser: false,
          timestamp: new Date(),
          sources: result.sources,
          confidence: result.confidence,
          model_used: result.model_used || 'unknown'
        };

        setMessages(prev => [...prev, aiMessage]);
        setShouldAutoScroll(true);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: generateUniqueId(),
        message: "😔 Oops! I'm having trouble connecting to my brain right now. This could be a temporary network issue.\n\n💡 **What you can try:**\n• Check your internet connection\n• Refresh the page\n• Try asking your question again in a moment\n\nI'm usually quite reliable, so this should resolve quickly!",
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Messages Area - Premium Design */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)',
        scrollBehavior: 'smooth',
        position: 'relative',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(102, 126, 234, 0.4) transparent',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px 20px 0 0',
        margin: '4px 4px 0 4px'
      }}
      className="messages-container"
      >
        {/* Smart Empty state with suggestions - Premium Design */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '350px',
            textAlign: 'center',
            opacity: 1,
            padding: '32px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              animation: 'glow 2s ease-in-out infinite alternate'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #ffffff, #f1f5f9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '48px'
              }}>💬</span>
            </div>
            
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #1e293b, #475569)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px',
              letterSpacing: '-0.5px'
            }}>
              Start Your Conversation
            </h3>
            
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              marginBottom: '32px',
              maxWidth: '400px',
              lineHeight: '1.6',
              fontWeight: '500'
            }}>
              I'm ready to help you analyze and understand your voice notes. Ask me anything!
            </p>
            
            {/* Show loading indicator for suggestions */}
            {suggestions.length === 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#94a3b8',
                fontSize: '14px',
                marginBottom: '24px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '3px solid rgba(102, 126, 234, 0.2)',
                  borderTop: '3px solid #667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}>
                </div>
                Loading smart suggestions...
              </div>
            )}
            
            {/* Dynamic suggestions from API or fallback - Premium Design */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              maxWidth: '480px'
            }}>
              {(suggestions.length > 0 ? suggestions : [
                "Who were the main speakers?",
                "What were the key decisions?", 
                "Summarize the meeting",
                "What topics were discussed?",
                "What action items were mentioned?",
                "Any important deadlines discussed?"
              ]).slice(0, 6).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '25px',
                    fontSize: '14px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontWeight: '600',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    (e.target as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
                    (e.target as HTMLElement).style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.3)';
                    (e.target as HTMLElement).style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)';
                    (e.target as HTMLElement).style.transform = 'translateY(0px) scale(1)';
                    (e.target as HTMLElement).style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.15)';
                    (e.target as HTMLElement).style.color = '#475569';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: message.isUser ? 'row-reverse' : 'row',
              gap: '16px',
              alignItems: 'flex-start',
              margin: message.isUser ? '0 0 0 10%' : '0 10% 0 0',
              opacity: 0,
              animation: `fadeInUp 0.4s ease forwards ${index * 0.05}s`
            }}
          >
            {/* Premium Avatar */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: message.isUser 
                ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                : 'linear-gradient(135deg, #ffffff, #f8fafc)',
              border: message.isUser 
                ? 'none' 
                : '2px solid rgba(102, 126, 234, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
              boxShadow: message.isUser 
                ? '0 8px 25px rgba(102, 126, 234, 0.3)' 
                : '0 4px 15px rgba(102, 126, 234, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              {message.isUser ? '👤' : getModelIcon(message.model_used)}
            </div>

            {/* Message Bubble */}
            <div style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: message.isUser ? '24px 24px 8px 24px' : '24px 24px 24px 8px',
              background: message.isUser 
                ? 'linear-gradient(135deg, #667eea, #764ba2)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.98))',
              color: message.isUser ? '#ffffff' : '#1e293b',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: message.isUser 
                ? '0 8px 25px rgba(102, 126, 234, 0.3)' 
                : '0 4px 15px rgba(102, 126, 234, 0.1)',
              border: message.isUser 
                ? 'none' 
                : '1px solid rgba(102, 126, 234, 0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                fontSize: '15px',
                lineHeight: '1.6',
                fontWeight: message.isUser ? '500' : '400',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {message.message}
              </div>
              
              {/* Metadata */}
              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                opacity: 0.7,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {!message.isUser && message.model_used && (
                  <span style={{
                    backgroundColor: message.isUser ? 'rgba(255,255,255,0.2)' : 'rgba(102, 126, 234, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {message.model_used}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            margin: '0 10% 0 0',
            opacity: 1,
            animation: 'fadeInUp 0.3s ease forwards'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
              border: '2px solid rgba(102, 126, 234, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ animation: 'spin 1s linear infinite' }}>🤖</span>
            </div>
            <div style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '24px 24px 24px 8px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.98))',
              border: '1px solid rgba(102, 126, 234, 0.15)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                color: '#64748b',
                fontSize: '14px',
                fontStyle: 'italic',
                marginBottom: '8px'
              }}>
                AI is thinking...
              </div>
              
              {/* Animated thinking dots */}
              <div style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#667eea',
                      borderRadius: '50%',
                      animation: `bounce 1.4s infinite ease-in-out ${i * 0.2}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area - Premium Design */}
      <div style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)',
        borderTop: '1px solid rgba(102, 126, 234, 0.2)',
        position: 'relative',
        backdropFilter: 'blur(20px)',
        borderRadius: '0 0 20px 20px',
        margin: '0 4px 4px 4px'
      }}>
        {/* Input Container */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end'
        }}>
          {/* Text Input Area */}
          <div style={{
            flex: 1,
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.95))',
            borderRadius: '20px',
            border: '2px solid rgba(102, 126, 234, 0.2)',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.1)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}>
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your voice notes..."
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px 20px',
                border: 'none',
                borderRadius: '18px',
                fontSize: '15px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#1e293b',
                minHeight: '24px',
                maxHeight: '120px',
                lineHeight: '1.5',
                scrollbarWidth: 'none'
              }}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
          </div>
          
          {/* Send Button */}
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              border: 'none',
              background: inputMessage.trim() && !isLoading 
                ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
              color: '#ffffff',
              cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
              boxShadow: inputMessage.trim() && !isLoading 
                ? '0 8px 25px rgba(102, 126, 234, 0.3)' 
                : '0 2px 8px rgba(148, 163, 184, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
              backdropFilter: 'blur(10px)'
            }}
          >
            <span>
              {isLoading ? '⏳' : '🚀'}
            </span>
          </button>
        </div>
        
        {/* Compact Helper Text */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          <span>⏎ Send • ⇧⏎ New line</span>
          <span style={{
            color: inputMessage.length > 800 ? '#ef4444' : '#94a3b8'
          }}>
            {inputMessage.length}/1000
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes glow {
          from {
            box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
          }
          to {
            box-shadow: 0 25px 50px rgba(102, 126, 234, 0.5);
          }
        }
        
        /* Custom scrollbar for messages container */
        .messages-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .messages-container::-webkit-scrollbar-track {
          background: rgba(248, 250, 252, 0.3);
          border-radius: 3px;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.4), rgba(118, 75, 162, 0.4));
          border-radius: 3px;
          transition: all 0.2s ease;
        }
        
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.6), rgba(118, 75, 162, 0.6));
        }
        
        /* Hide scrollbar for textarea */
        textarea::-webkit-scrollbar {
          display: none;
        }
        
        /* Responsive design improvements */
        @media (max-width: 768px) {
          .chat-interface-container {
            border-radius: 16px !important;
            margin: 2px !important;
          }
          
          .messages-container {
            padding: 16px 20px !important;
            margin: 2px 2px 0 2px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;
