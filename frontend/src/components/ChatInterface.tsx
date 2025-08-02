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
  const [chatStatus, setChatStatus] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<ChatModel>('faiss');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Session Storage Keys
  const STORAGE_KEY = `chat_session_${sessionId}`;
  const MODEL_KEY = `chat_model_${sessionId}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Save messages to sessionStorage
  const saveMessagesToStorage = (messagesToSave: ChatMessage[]) => {
    try {
      const serializedMessages = messagesToSave.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString() // Convert Date to string
      }));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializedMessages));
      sessionStorage.setItem(MODEL_KEY, selectedModel);
      console.log(`💾 Saved ${messagesToSave.length} messages to session storage`);
    } catch (error) {
      console.error('❌ Error saving messages to storage:', error);
    }
  };

  // Load messages from sessionStorage
  const loadMessagesFromStorage = (): ChatMessage[] => {
    try {
      const savedMessages = sessionStorage.getItem(STORAGE_KEY);
      const savedModel = sessionStorage.getItem(MODEL_KEY);
      
      if (savedModel) {
        setSelectedModel(savedModel as ChatModel);
      }
      
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        const restoredMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp) // Convert string back to Date
        }));
        console.log(`📂 Loaded ${restoredMessages.length} messages from session storage`);
        return restoredMessages;
      }
    } catch (error) {
      console.error('❌ Error loading messages from storage:', error);
    }
    return [];
  };

  // Clear session storage when browser closes (handled automatically by sessionStorage)
  const clearSessionStorage = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(MODEL_KEY);
      console.log('🗑️ Cleared chat session storage');
    } catch (error) {
      console.error('❌ Error clearing session storage:', error);
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save messages to storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

  // Save selected model whenever it changes
  useEffect(() => {
    sessionStorage.setItem(MODEL_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    // Initialize chat when component mounts
    initializeChat();
    getChatStatus();
    getChatSuggestions();
    getAvailableModels();
  }, [sessionId]);

  const initializeChat = async () => {
    try {
      console.log(`🔄 Loading chat data for session: ${sessionId}`);
      
      // First, try to load from session storage
      const savedMessages = loadMessagesFromStorage();
      if (savedMessages.length > 0) {
        console.log(`📱 Restored ${savedMessages.length} messages from session storage`);
        setMessages(savedMessages);
        return; // Don't need to fetch from server if we have saved messages
      }
      
      const response = await fetch(`/api/chat/load/${sessionId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Chat data loaded:', result);
        
        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          message: "👋 Hi! I'm ready to help you explore this meeting transcript. You can:\n\n• Switch between AI models using the dropdown above\n• 🔋 FAISS: Fast offline semantic search\n• 🧠 Mistral: Advanced AI analysis\n\nAsk me questions about speakers, topics, decisions, or any other aspects of the conversation!",
          isUser: false,
          timestamp: new Date(),
          confidence: 1.0,
          model_used: "system"
        };
        setMessages([welcomeMessage]);
      } else {
        throw new Error('Failed to load chat data');
      }
    } catch (error) {
      console.error('❌ Error loading chat data:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: "⚠️ Sorry, I couldn't load the transcript data for this session. The chat functionality may not work properly.",
        isUser: false,
        timestamp: new Date(),
        confidence: 0.0,
        model_used: "error"
      };
      setMessages([errorMessage]);
    }
  };

  const getChatStatus = async () => {
    try {
      const response = await fetch('/api/chat/status');
      if (response.ok) {
        const status = await response.json();
        setChatStatus(status);
        console.log('📊 Chat status:', status);
      }
    } catch (error) {
      console.error('❌ Error getting chat status:', error);
    }
  };

  const getAvailableModels = async () => {
    try {
      const response = await fetch('/api/chat/models');
      if (response.ok) {
        const models = await response.json();
        console.log('📋 Available models:', models);
      }
    } catch (error) {
      console.error('❌ Error getting available models:', error);
      console.log('💡 Using default model options: FAISS, Mistral, Enhanced, Auto');
    }
  };

  const getChatSuggestions = async () => {
    try {
      const response = await fetch('/api/chat/suggestions');
      if (response.ok) {
        const result = await response.json();
        setSuggestions(result.suggestions || []);
      }
    } catch (error) {
      console.error('❌ Error getting suggestions:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    
    if (!textToSend) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: textToSend,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Choose the appropriate endpoint based on selected model
      let endpoint = '/api/chat/enhanced';
      let requestBody: any = {
        query: textToSend,
        session_id: sessionId,
        model_preference: selectedModel
      };

      // Use specific endpoints for specific models
      if (selectedModel === 'faiss') {
        requestBody.model_preference = 'faiss';
        requestBody.use_smart_routing = false;
      } else if (selectedModel === 'mistral') {
        requestBody.model_preference = 'mistral';
        requestBody.use_smart_routing = false;
      }

      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Fallback to basic chat
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: textToSend,
            session_id: sessionId
          }),
        });
      }

      if (response.ok) {
        const result = await response.json();
        
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: result.response || "Sorry, I couldn't generate a response.",
          isUser: false,
          timestamp: new Date(),
          sources: result.sources,
          confidence: result.confidence,
          model_used: result.model_used || 'unknown'
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: "⚠️ Sorry, I encountered an error while processing your message. Please try again.",
        isUser: false,
        timestamp: new Date(),
        confidence: 0.0,
        model_used: "error"
      };

      setMessages(prev => [...prev, errorMessage]);
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

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const getModelName = (model?: string) => {
    if (!model) return "AI";
    if (model.includes('faiss') || model === 'faiss_offline') return "FAISS";
    if (model.includes('mistral') || model.includes('multi')) return "Mistral";
    if (model.includes('enhanced')) return "Enhanced";
    if (model.includes('error')) return "Error";
    if (model === 'system') return "System";
    return "AI";
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: '300px', // Further reduced from 400px
      maxHeight: 'none', // Remove max height restriction
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      position: 'relative'
    }}>
      {/* Chat Header - Enhanced Design */}
      <div style={{
        padding: '12px 16px', // Reduced from 16px 20px
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '60px', // Reduced from 70px
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              backdropFilter: 'blur(10px)'
            }}>🤖</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '18px', lineHeight: '1.2' }}>
                AI Assistant
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px', fontWeight: '400' }}>
                {messages.length > 1 ? `${messages.length - 1} messages • Session active` : 'Ready to analyze your meeting'}
              </div>
            </div>
          </div>
          
          {/* Clear conversation button */}
          {messages.length > 1 && (
            <button
              onClick={() => {
                setMessages([]);
                clearSessionStorage();
                initializeChat(); // Reinitialize with welcome message
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.9)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              title="Clear conversation (will reset when browser closes)"
            >
              🗑️ Clear
            </button>
          )}
          
          {/* Model Selection Dropdown - Enhanced */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ChatModel)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.95)',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <option value="faiss">🔋 FAISS (Offline)</option>
            <option value="mistral">🧠 Mistral AI</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.95)',
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {selectedModel === 'faiss' && (
              <>
                <span style={{ fontSize: '14px' }}>🔋</span>
                <span>FAISS Mode</span>
              </>
            )}
            {selectedModel === 'mistral' && (
              <>
                <span style={{ fontSize: '14px' }}>🧠</span>
                <span>Mistral Mode</span>
              </>
            )}
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '6px', 
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px',
              borderRadius: '50%',
              backgroundColor: chatStatus?.available ? '#10b981' : '#ef4444',
              boxShadow: `0 0 6px ${chatStatus?.available ? '#10b981' : '#ef4444'}`,
              animation: chatStatus?.available ? 'pulse 2s infinite' : 'none'
            }}></div>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>
              {chatStatus?.available ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area - Enhanced Scrolling & Layout */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 16px', // Reduced from 20px
        display: 'flex',
        flexDirection: 'column',
        gap: '12px', // Reduced from 16px
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255,255,255,0.3) 1px, transparent 0)',
        backgroundSize: '50px 50px',
        scrollBehavior: 'smooth',
        position: 'relative',
        /* Hide scrollbar for cleaner look */
        scrollbarWidth: 'none', /* Firefox */
        msOverflowStyle: 'none'  /* Internet Explorer and Edge */
      }}
      className="messages-container"
      >
        {messages.map((message, index) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: message.isUser ? 'row-reverse' : 'row',
              gap: '12px',
              alignItems: 'flex-start',
              margin: message.isUser ? '0 0 0 15%' : '0 15% 0 0',
              opacity: 0,
              animation: `fadeInUp 0.3s ease forwards ${index * 0.1}s`
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: message.isUser ? '#3b82f6' : '#ffffff',
              border: message.isUser ? 'none' : '2px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {message.isUser && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '50%'
                }}></div>
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {message.isUser ? '👤' : getModelIcon(message.model_used)}
              </span>
            </div>
            
            <div style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: message.isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
              backgroundColor: message.isUser ? '#3b82f6' : '#ffffff',
              color: message.isUser ? 'white' : '#374151',
              fontSize: '15px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              boxShadow: message.isUser 
                ? '0 4px 20px rgba(59, 130, 246, 0.3)' 
                : '0 4px 20px rgba(0,0,0,0.1)',
              border: message.isUser ? 'none' : '1px solid #e5e7eb',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)'
            }}>
              {message.isUser && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  opacity: 0.9
                }}></div>
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {message.message}
              </div>
              
              {/* Message metadata - Enhanced Design */}
              <div style={{
                fontSize: '11px',
                marginTop: '10px',
                opacity: message.isUser ? 0.9 : 0.7,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `1px solid ${message.isUser ? 'rgba(255,255,255,0.3)' : '#f1f5f9'}`,
                paddingTop: '8px',
                position: 'relative',
                zIndex: 1
              }}>
                <span style={{ fontWeight: '500' }}>{formatTimestamp(message.timestamp)}</span>
                {!message.isUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {message.model_used && (
                      <span style={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {getModelName(message.model_used)}
                      </span>
                    )}
                    {message.confidence !== undefined && (
                      <span style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {Math.round(message.confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            margin: '0 15% 0 0',
            opacity: 0,
            animation: 'fadeInUp 0.3s ease forwards'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '2px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <span style={{ 
                animation: 'spin 1s linear infinite',
                display: 'inline-block'
              }}>⏳</span>
            </div>
            <div style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '20px 20px 20px 6px',
              backgroundColor: '#ffffff',
              color: '#6b7280',
              fontSize: '15px',
              fontStyle: 'italic',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s ease-in-out infinite',
              lineHeight: '1.6'
            }}>
              AI is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Suggestions - Enhanced Design */}
      {messages.length === 1 && suggestions.length > 0 && (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <span style={{ fontSize: '16px' }}>💡</span>
            <span>Quick Questions</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '10px'
          }}>
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                style={{
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: '#3b82f6',
                  backgroundColor: '#f8fafc',
                  border: '2px solid #e0f2fe',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'left',
                  fontWeight: '500',
                  lineHeight: '1.4',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0f2fe';
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e0f2fe';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area - Premium Design */}
      <div style={{
        padding: '12px 16px', // Reduced from 20px
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
          position: 'relative'
        }}>
          <div style={{ 
            flex: 1, 
            position: 'relative',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            backgroundColor: 'white',
            border: '2px solid #f1f5f9',
            transition: 'all 0.3s ease'
          }}>
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about this meeting..."
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: '52px',
                maxHeight: '140px',
                padding: '16px 20px',
                border: 'none',
                borderRadius: '16px',
                fontSize: '15px',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                backgroundColor: isLoading ? '#f9fafb' : 'transparent',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
                lineHeight: '1.5',
                /* Hide scrollbar for textarea */
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none',  /* Internet Explorer and Edge */
                overflow: 'hidden' /* Prevent scrollbar completely */
              }}
              onFocus={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.borderColor = '#3b82f6';
                  parent.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }
              }}
              onBlur={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.borderColor = '#f1f5f9';
                  parent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                }
              }}
              rows={1}
            />
          </div>
          
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            style={{
              width: '52px',
              height: '52px',
              backgroundColor: isLoading || !inputMessage.trim() ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              fontSize: '18px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!isLoading && inputMessage.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && inputMessage.trim()) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
              }
            }}
          >
            {(!isLoading && inputMessage.trim()) && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '16px'
              }}></div>
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>
              {isLoading ? '⏳' : '🚀'}
            </span>
          </button>
        </div>
        
        {/* Enhanced tips and character count */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
          padding: '0 4px'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: '500'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⏎</span>
              <span>Send</span>
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⇧⏎</span>
              <span>New line</span>
            </span>
          </div>
          <div style={{
            fontSize: '12px',
            color: inputMessage.length > 800 ? '#ef4444' : '#9ca3af',
            fontWeight: '600',
            backgroundColor: inputMessage.length > 800 ? '#fef2f2' : 'transparent',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}>
            {inputMessage.length}/1000
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
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
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.1); 
          }
        }
        
        /* Hide scrollbar for messages container */
        .messages-container::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for textarea */
        textarea::-webkit-scrollbar {
          display: none;
        }
        
        /* Custom scrollbar only for the main container when needed */
        .chat-main-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-main-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        
        .chat-main-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 3px;
        }
        
        .chat-main-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .chat-container {
            height: 100vh !important;
            border-radius: 0 !important;
            border: none !important;
          }
          
          .message-margin-user {
            margin: 0 5% 0 0 !important;
          }
          
          .message-margin-ai {
            margin: 0 5% 0 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;
