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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false); // Control auto scroll
  const [messageIdCounter, setMessageIdCounter] = useState(0); // Add counter for unique IDs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Session Storage Keys
  const STORAGE_KEY = `chat_session_${sessionId}`;
  const MODEL_KEY = `chat_model_${sessionId}`;

  // Generate unique ID for messages
  const generateUniqueId = () => {
    const timestamp = Date.now();
    const counter = messageIdCounter;
    const random = Math.floor(Math.random() * 1000);
    setMessageIdCounter(prev => prev + 1);
    return `${sessionId}_${timestamp}_${counter}_${random}`;
  };

  // Clear all messages
  const clearAllMessages = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    // Don't reinitialize with welcome message, just clear
  };

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
    // Only auto scroll when user sends message or receives response, not on initial load
    if (shouldAutoScroll) {
      scrollToBottom();
      setShouldAutoScroll(false); // Reset after scrolling
    }
  }, [messages, shouldAutoScroll]);

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

    // Add event listener for clear chat
    const handleClearChat = () => {
      clearAllMessages();
    };

    const chatContainer = document.querySelector('.chat-interface-container');
    if (chatContainer) {
      chatContainer.addEventListener('clearChat', handleClearChat);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('clearChat', handleClearChat);
      }
    };
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
        
        // Don't add welcome message, let empty state handle suggestions
        setMessages([]);
      } else {
        throw new Error('Failed to load chat data');
      }
    } catch (error) {
      console.error('❌ Error loading chat data:', error);
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

  const getChatStatus = async () => {
    try {
      const response = await fetch('/api/chat/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const status = await response.json();
        setChatStatus(status);
        console.log('📊 Chat status:', status);
      }
    } catch (error) {
      console.log('📊 Chat status unavailable (using defaults)');
      // Set default status
      setChatStatus({
        available: true,
        models: ['faiss', 'mistral'],
        system_ready: true
      });
    }
  };

  const getAvailableModels = async () => {
    try {
      const response = await fetch('/api/chat/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const models = await response.json();
        console.log('📋 Available models:', models);
      }
    } catch (error) {
      console.log('📋 Using default models (API unavailable)');
      // Keep default models
    }
  };

  const getChatSuggestions = async () => {
    try {
      // Try to get smart suggestions based on session
      console.log(`🎯 Getting suggestions for session: ${sessionId}`);
      
      // Use fallback suggestions immediately while trying API
      const intelligentSuggestions = [
        "Who were the main speakers?",
        "What decisions were made?", 
        "Summarize this meeting",
        "What action items were mentioned?",
        "Any important deadlines?",
        "What topics were discussed?"
      ];
      
      setSuggestions(intelligentSuggestions);
      
      // Try API in background
      try {
        const response = await fetch(`/api/chat/suggestions/${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.suggestions && result.suggestions.length > 0) {
            console.log('💡 Loaded API suggestions:', result.suggestions);
            setSuggestions(result.suggestions);
          }
        }
      } catch (apiError) {
        console.log('📝 Using fallback suggestions (API unavailable)');
        // Keep fallback suggestions
      }
      
    } catch (error) {
      console.error('❌ Error in suggestions:', error);
      // Set intelligent fallback suggestions
      setSuggestions([
        "Who spoke the most?",
        "What decisions were made?", 
        "Summarize this meeting",
        "What are the next steps?",
        "Any important dates mentioned?",
        "What problems were discussed?"
      ]);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    
    if (!textToSend) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateUniqueId(),
      message: textToSend,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShouldAutoScroll(true); // Enable auto scroll when user sends message

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
          id: generateUniqueId(),
          message: result.response || "Sorry, I couldn't generate a response.",
          isUser: false,
          timestamp: new Date(),
          sources: result.sources,
          confidence: result.confidence,
          model_used: result.model_used || 'unknown'
        };

        setMessages(prev => [...prev, aiMessage]);
        setShouldAutoScroll(true); // Enable auto scroll when AI responds
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
      setShouldAutoScroll(true); // Enable auto scroll for error messages too
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
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)'
            }}>
              🤖
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 8px 0'
            }}>
              Ready to Analyze
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 20px 0',
              maxWidth: '320px',
              lineHeight: '1.5'
            }}>
              Ask me about this transcript. Here are some suggested questions:
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
              gap: '12px',
              alignItems: 'flex-start',
              margin: message.isUser ? '0 0 0 15%' : '0 15% 0 0',
              opacity: 0,
              animation: `fadeInUp 0.3s ease forwards ${index * 0.05}s`
            }}
          >
            {/* Compact Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: message.isUser 
                ? '#3b82f6' 
                : '#ffffff',
              border: message.isUser 
                ? 'none' 
                : '1px solid rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <span>
                {message.isUser ? '👤' : getModelIcon(message.model_used)}
              </span>
            </div>
            
            {/* Compact Message Bubble */}
            <div style={{
              flex: 1,
              position: 'relative'
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: message.isUser 
                  ? '16px 16px 4px 16px' 
                  : '16px 16px 16px 4px',
                backgroundColor: message.isUser 
                  ? '#3b82f6'
                  : '#ffffff',
                color: message.isUser ? 'white' : '#374151',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: message.isUser 
                  ? 'none' 
                  : '1px solid rgba(59, 130, 246, 0.08)'
              }}>
                {message.message}
              </div>
              
              {/* Compact metadata */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                gap: '6px',
                marginTop: '4px',
                paddingLeft: message.isUser ? '0' : '16px',
                paddingRight: message.isUser ? '16px' : '0'
              }}>
                <span style={{
                  fontSize: '11px',
                  color: '#9ca3af'
                }}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                
                {!message.isUser && message.model_used && message.model_used !== 'error' && (
                  <>
                    <span style={{ color: '#d1d5db', fontSize: '8px' }}>•</span>
                    <span style={{
                      fontSize: '10px',
                      color: '#6b7280',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}>
                      {message.model_used === 'faiss' ? 'FAISS' : 
                       message.model_used === 'mistral' ? 'MISTRAL' : 
                       message.model_used.toUpperCase()}
                    </span>
                  </>
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
            opacity: 1,
            animation: 'fadeInUp 0.3s ease forwards'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
            }}>
              <span style={{ animation: 'spin 1s linear infinite' }}>🤖</span>
            </div>
            <div style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(59, 130, 246, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                color: '#6b7280',
                fontSize: '14px',
                fontStyle: 'italic',
                marginBottom: '4px'
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
                      width: '6px',
                      height: '6px',
                      backgroundColor: '#3b82f6',
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
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid rgba(59, 130, 246, 0.1)',
            padding: '2px',
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
              placeholder={isLoading ? "Please wait..." : "Type your message here..."}
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: '44px',
                maxHeight: '120px',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                backgroundColor: isLoading ? '#f9fafb' : 'transparent',
                color: '#374151',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
                lineHeight: '1.4',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overflow: 'hidden'
              }}
              onFocus={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  parent.style.backgroundColor = '#ffffff';
                }
              }}
              onBlur={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.borderColor = 'rgba(59, 130, 246, 0.1)';
                  parent.style.backgroundColor = '#f8fafc';
                }
              }}
              rows={1}
            />
          </div>
          
          {/* Send Button */}
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: isLoading || !inputMessage.trim() ? '#e5e7eb' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              fontSize: '16px',
              flexShrink: 0
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
          marginTop: '8px',
          fontSize: '11px',
          color: '#9ca3af'
        }}>
          <span>⏎ Send • ⇧⏎ New line</span>
          <span style={{
            color: inputMessage.length > 800 ? '#ef4444' : '#9ca3af'
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
            transform: translateY(10px); 
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
        
        /* Custom scrollbar for messages container */
        .messages-container::-webkit-scrollbar {
          width: 4px;
        }
        
        .messages-container::-webkit-scrollbar-track {
          background: rgba(248, 250, 252, 0.5);
          border-radius: 2px;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4));
          border-radius: 2px;
          transition: all 0.2s ease;
        }
        
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(147, 51, 234, 0.6));
        }
        
        /* Hide scrollbar for textarea */
        textarea::-webkit-scrollbar {
          display: none;
        }
        
        /* Responsive design improvements */
        @media (max-width: 768px) {
          .chat-container {
            height: 100vh !important;
            border-radius: 0 !important;
            border: none !important;
          }
          
          .messages-container {
            padding: 12px 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;
