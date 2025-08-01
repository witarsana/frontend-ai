import React, { useState, useEffect } from "react";
import ChatInterface from "./ChatInterface";

interface Segment {
  id?: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speaker_name?: string;
  confidence?: number;
  tags?: string[];
  assigned_speaker?: number;
}

interface ActionItem {
  task?: string;
  assignee?: string;
  deadline?: string;
  priority?: string;
  due_date?: string;
}

interface KeyDecision {
  decision?: string;
  impact?: string;
}

interface FullResult {
  summary?: string;
  clean_summary?: string;
  speaker_points?: Array<{
    speaker: string;
    points: string[];
  }>;
  conclusions?: string[];
}

interface Transcription {
  id: string;
  text: string;
  summary?: string;
  uploadTime: Date;
  duration?: number;
  status: "processing" | "completed" | "error";
  actionItems?: (string | ActionItem)[];
  keyDecisions?: (string | KeyDecision)[];
  speakers?: string[];
  segments?: Segment[];
  fullResult?: FullResult;
  audioUrl?: string; // URL to the audio file for playback
  filename?: string; // Original filename
}

interface SessionTranscriptionCardProps {
  transcription: Transcription;
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
  onBack?: () => void; // Optional back button handler
}

const SessionTranscriptionCard: React.FC<SessionTranscriptionCardProps> = ({ 
  transcription,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<"segments" | "summary" | "chat">("summary");
  
  // Pagination and search states for segments
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Show 10 segments per page by default
  
  // Audio player states
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingSegmentIndex, setPlayingSegmentIndex] = useState<number | null>(null);
  
  // Use backend-provided clean data directly
  const cleanSummary = transcription.fullResult?.clean_summary || transcription.summary || '';
  const speakerPoints = transcription.fullResult?.speaker_points || [];

  // Auto-detect current segment based on audio time
  const getCurrentSegmentIndex = (): number | null => {
    if (!transcription.segments || !isPlaying || currentTime === 0) return null;
    
    for (let i = 0; i < transcription.segments.length; i++) {
      const segment = transcription.segments[i];
      if (currentTime >= segment.start && currentTime <= segment.end) {
        // Only log when segment changes to avoid spam
        if (i !== playingSegmentIndex) {
          console.log(`🎯 Auto-detected segment ${i} at time ${currentTime.toFixed(2)}s (${segment.start}-${segment.end})`);
        }
        return i;
      }
    }
    return null;
  };

  // Current active segment index (auto-detected or manually set)
  const activeSegmentIndex = getCurrentSegmentIndex() ?? playingSegmentIndex;

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Jump to specific time in audio
  const jumpToTime = (startTime: number, segmentIndex: number) => {
    console.log('🎯 jumpToTime called with startTime:', startTime, 'segmentIndex:', segmentIndex);
    if (audioRef) {
      console.log('🎵 Audio element exists, current time before:', audioRef.currentTime);
      console.log('🎵 Audio readyState:', audioRef.readyState);
      console.log('🎵 Audio duration:', audioRef.duration);
      
      // Set segment index first
      setPlayingSegmentIndex(segmentIndex);
      
      // Check seekable ranges
      console.log('🎵 Audio seekable ranges:', audioRef.seekable.length > 0 ? 
        `start: ${audioRef.seekable.start(0)}, end: ${audioRef.seekable.end(0)}` : 'none');
      
      // Check if audio is ready and seekable
      if (audioRef.readyState >= 2 && !isNaN(audioRef.duration) && audioRef.seekable.length > 0) {
        // Audio is ready and seekable
        console.log('✅ Audio ready and seekable, seeking immediately');
        performSeek();
      } else {
        // Audio not fully ready or not seekable, force reload and wait
        console.log('⏳ Audio not ready or not seekable, forcing full load...');
        
        // Force preload all data
        audioRef.preload = 'auto';
        
        const waitForSeekable = () => {
          const checkSeekable = () => {
            if (!audioRef) return;
            
            console.log('🔍 Checking seekable status...');
            console.log('🎵 ReadyState:', audioRef.readyState, 'Seekable ranges:', audioRef.seekable.length);
            
            if (audioRef.seekable.length > 0 && audioRef.readyState >= 2) {
              console.log('✅ Audio now seekable, performing seek');
              performSeek();
            } else {
              console.log('⏳ Still not seekable, waiting more...');
              setTimeout(checkSeekable, 200);
            }
          };
          
          // Start checking
          checkSeekable();
        };
        
        // Listen for progress events to know when more data is available
        const onProgress = () => {
          console.log('📊 Audio progress event fired');
          if (audioRef && audioRef.seekable.length > 0) {
            console.log('✅ Audio became seekable after progress');
            audioRef.removeEventListener('progress', onProgress);
            performSeek();
          }
        };
        
        const onCanPlayThrough = () => {
          console.log('✅ Audio canplaythrough event fired');
          audioRef.removeEventListener('canplaythrough', onCanPlayThrough);
          performSeek();
        };
        
        audioRef.addEventListener('progress', onProgress);
        audioRef.addEventListener('canplaythrough', onCanPlayThrough);
        
        // Force reload
        audioRef.load();
        
        // Fallback timeout
        setTimeout(waitForSeekable, 100);
      }
      
      function performSeek() {
        if (!audioRef) return;
        
        try {
          console.log('🎯 Performing seek to:', startTime);
          console.log('🎵 Before seek - currentTime:', audioRef.currentTime, 'duration:', audioRef.duration);
          console.log('🎵 Audio seekable ranges:', audioRef.seekable.length > 0 ? 
            `start: ${audioRef.seekable.start(0)}, end: ${audioRef.seekable.end(0)}` : 'none');
          
          // Check if the time is within seekable range
          if (audioRef.seekable.length > 0) {
            const seekableStart = audioRef.seekable.start(0);
            const seekableEnd = audioRef.seekable.end(0);
            
            if (startTime < seekableStart || startTime > seekableEnd) {
              console.warn(`⚠️ Time ${startTime} is outside seekable range ${seekableStart}-${seekableEnd}`);
              // Try to seek to a safe position within range
              const safeTime = Math.max(seekableStart, Math.min(startTime, seekableEnd));
              console.log(`🔧 Adjusting to safe time: ${safeTime}`);
              performActualSeek(safeTime);
              return;
            }
          }
          
          performActualSeek(startTime);
          
        } catch (error) {
          console.error('❌ Error during seek:', error);
        }
      }
      
      function performActualSeek(targetTime: number) {
        if (!audioRef) return;
        
        // Pause first
        const wasPlaying = !audioRef.paused;
        audioRef.pause();
        
        // Try setting currentTime with validation
        const validatedTime = Math.max(0, Math.min(targetTime, audioRef.duration || targetTime));
        console.log('🎯 Setting currentTime to validated time:', validatedTime);
        
        // Set current time
        audioRef.currentTime = validatedTime;
        console.log('✅ currentTime set, immediately after:', audioRef.currentTime);
        
        // Wait for seek to complete
        const onSeeked = () => {
          if (!audioRef) return;
          console.log('✅ Seek completed successfully at:', audioRef.currentTime);
          audioRef.removeEventListener('seeked', onSeeked);
          
          // Start playing if needed
          if (wasPlaying || !isPlaying) {
            audioRef.play().then(() => {
              setIsPlaying(true);
              if (audioRef) {
                console.log('✅ Audio playing from:', audioRef.currentTime);
              }
            }).catch(console.error);
          }
        };
        
        audioRef.addEventListener('seeked', onSeeked);
        
        // Fallback check after a short delay
        setTimeout(() => {
          if (audioRef && Math.abs(audioRef.currentTime - validatedTime) > 1) {
            console.log('🔄 Fallback: seeking again as it may have failed');
            audioRef.currentTime = validatedTime;
          }
        }, 200);
      }
      
    } else {
      console.error('❌ No audio element available');
    }
  };

  // Initialize audio element
  useEffect(() => {
    if (transcription.audioUrl && !audioRef) {
      console.log('🎵 Initializing audio with URL:', transcription.audioUrl);
      const audio = new Audio(transcription.audioUrl);
      
      // Force preload all data to enable seeking
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous'; // In case of CORS issues
      
      audio.addEventListener('loadedmetadata', () => {
        console.log('🎵 Audio metadata loaded, duration:', audio.duration);
        setDuration(audio.duration);
      });
      
      audio.addEventListener('progress', () => {
        console.log('📊 Audio progress, seekable ranges:', audio.seekable.length > 0 ? 
          `${audio.seekable.start(0)}-${audio.seekable.end(0)}` : 'none');
      });
      
      audio.addEventListener('canplaythrough', () => {
        console.log('✅ Audio can play through, should be fully seekable now');
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlayingSegmentIndex(null);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('🎵 Audio error:', e);
      });
      
      setAudioRef(audio);
    } else if (!transcription.audioUrl) {
      console.log('🎵 No audio URL provided');
    }

    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = '';
      }
    };
  }, [transcription.audioUrl, audioRef]);

  // Filter segments based on search term
  const filteredSegments = transcription.segments?.filter(segment => 
    segment.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (segment.speaker && segment.speaker.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Calculate pagination
  const totalPages = Math.ceil(filteredSegments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSegments = filteredSegments.slice(startIndex, endIndex);

  // Reset pagination when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset pagination when items per page changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Auto-scroll to current segment when playing
  React.useEffect(() => {
    if (activeSegmentIndex !== null && isPlaying && activeTab === "segments") {
      // Check if current segment is in the visible page
      const isInCurrentPage = activeSegmentIndex >= startIndex && activeSegmentIndex < endIndex;
      
      if (!isInCurrentPage) {
        // Calculate which page contains the active segment
        const targetPage = Math.floor(activeSegmentIndex / itemsPerPage) + 1;
        console.log(`📍 Auto-scrolling to page ${targetPage} for segment ${activeSegmentIndex}`);
        setCurrentPage(targetPage);
      } else {
        // Scroll to the specific segment within the current page
        setTimeout(() => {
          const segmentElement = document.getElementById(`segment-${activeSegmentIndex}`);
          if (segmentElement) {
            segmentElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 100);
      }
    }
  }, [activeSegmentIndex, isPlaying, activeTab, startIndex, endIndex, itemsPerPage]);

  const getStatusBadge = () => {
    const statusStyles = {
      processing: {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        text: "🔄 Processing",
      },
      completed: {
        backgroundColor: "#d1fae5",
        color: "#065f46",
        text: "✅ Completed",
      },
      error: {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        text: "❌ Error",
      },
    };

    const style = statusStyles[transcription.status];
    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          backgroundColor: style.backgroundColor,
          color: style.color,
        }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <>
      <style>{`
        /* Hide scrollbar for segments container */
        .segments-container::-webkit-scrollbar {
          display: none;
        }
        
        /* Main segments scroll - single scrollbar INSIDE content */
        .segments-main-scroll {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: #cbd5e1 #f8fafc; /* Firefox */
        }
        .segments-main-scroll::-webkit-scrollbar { 
          width: 12px; /* Slightly wider to be more visible inside content */
        }
        .segments-main-scroll::-webkit-scrollbar-track { 
          background: #f8fafc;
          border-radius: 6px;
          margin: 4px 0; /* Add some margin from top/bottom */
        }
        .segments-main-scroll::-webkit-scrollbar-thumb { 
          background: #cbd5e1; 
          border-radius: 6px;
          border: 2px solid #f8fafc; /* Create space around thumb */
        }
        .segments-main-scroll::-webkit-scrollbar-thumb:hover { 
          background: #94a3b8; 
        }
        .segments-main-scroll::-webkit-scrollbar-corner {
          background: #f8fafc;
        }
        
        /* Summary tab scroll - INSIDE content */
        .summary-tab-scroll {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: #cbd5e1 #f8fafc; /* Firefox */
        }
        .summary-tab-scroll::-webkit-scrollbar { 
          width: 12px; 
        }
        .summary-tab-scroll::-webkit-scrollbar-track { 
          background: #f8fafc; 
          border-radius: 6px;
          margin: 4px 0;
        }
        .summary-tab-scroll::-webkit-scrollbar-thumb { 
          background: #cbd5e1; 
          border-radius: 6px;
          border: 2px solid #f8fafc;
        }
        .summary-tab-scroll::-webkit-scrollbar-thumb:hover { 
          background: #94a3b8; 
        }
        
        /* Custom scrollbar for AI Chat container */
        .ai-chat-container::-webkit-scrollbar {
          width: 8px;
        }
        .ai-chat-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .ai-chat-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 3px;
        }
        .ai-chat-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
        }
        
        /* Ensure outer containers don't scroll */
        .main-card-container {
          overflow: hidden !important; /* Paksa hidden untuk container utama */
        }
        
        /* Hide any other scrollbars that might interfere */
        .tab-content-container {
          scrollbar-width: none !important;
          overflow: hidden !important; /* Paksa hidden untuk tab content */
        }
        .tab-content-container::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        /* Ensure main container never scrolls */
        body, html {
          overflow: hidden !important; /* Paksa hidden untuk mencegah scroll di browser */
          margin: 0;
          padding: 0;
        }
        
        /* Ensure root div also fits */
        #root {
          height: 100vh;
          width: 100vw;
          overflow: hidden !important; /* Paksa hidden untuk mencegah scroll di root */
          margin: 0;
          padding: 0;
        }
      `}</style>
      
      <div
        className="main-card-container"
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e5e7eb",
          margin: "8px", // Tambah margin untuk tidak full screen
          overflow: "hidden",
          height: "calc(100vh - 16px)", // Kurangi height untuk margin
          width: "calc(100vw - 16px)", // Kurangi width untuk margin
          maxWidth: "100%", // Pastikan tidak overflow
          display: "flex",
          flexDirection: "column",
          position: "fixed", // Fixed position untuk kontrol penuh
          top: "8px",
          left: "8px"
        }}
      >
      {/* Compact Header with Back Button */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Enhanced Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "12px",
                color: "white",
                padding: "10px 16px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
            >
              <span style={{ fontSize: "16px" }}>←</span>
              <span>Back to History</span>
            </button>
          )}
          
          <div>
            <h3
              style={{
                margin: "0",
                fontSize: "20px",
                fontWeight: "700",
              }}
            >
              📝 Session Transcription
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "13px",
                opacity: 0.9,
              }}
            >
              Uploaded at {transcription.uploadTime.toLocaleTimeString()}
              {transcription.duration &&
                ` • ${Math.round(transcription.duration)}s`}
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div style={{
          background: "rgba(255,255,255,0.1)",
          padding: "6px 12px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          {getStatusBadge()}
        </div>
      </div>

      {/* Content Area with Tabs */}
      {transcription.status === "completed" && (
        <div style={{ 
          padding: "0",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden", // Paksa hidden untuk content area
          minHeight: 0 // Izinkan shrinking
        }}>
          {/* Enhanced Tab Navigation */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#f8fafc",
              margin: "0",
              borderBottom: "1px solid #e5e7eb",
              flexShrink: 0,
              width: "100%", // Pastikan lebar penuh
              overflowX: "auto", // Izinkan scroll horizontal jika perlu
              minHeight: "60px" // Berikan tinggi minimum yang cukup
            }}
          >
            {(["segments", "summary", "chat"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: "1 1 33.33%", // Bagi rata 3 tab dengan lebar yang sama
                  minWidth: "120px", // Lebar minimum untuk memastikan text terlihat
                  padding: "12px 16px", // Kurangi padding untuk efisiensi ruang
                  border: "none",
                  background: activeTab === tab ? "white" : "transparent",
                  cursor: "pointer",
                  fontSize: "13px", // Sedikit kecilkan font untuk muat semua
                  fontWeight: "600",
                  color: activeTab === tab ? "#3b82f6" : "#6b7280",
                  borderBottom: activeTab === tab ? "3px solid #3b82f6" : "3px solid transparent",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px", // Kurangi gap untuk menghemat ruang
                  whiteSpace: "nowrap" // Cegah text wrap
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {tab === "segments" 
                  ? <>💬 <span>Segments</span></> 
                  : tab === "summary" 
                  ? <>📄 <span>Summary</span></> 
                  : <>🤖 <span>AI Chat</span></>}
              </button>
            ))}
          </div>

          {/* Tab Content with Better Spacing */}
          <div
            className="tab-content-container"
            style={{
              backgroundColor: "#ffffff",
              padding: "0",
              flex: 1,
              overflow: "hidden", // Paksa hidden untuk mencegah scroll di tab content
              display: "flex",
              flexDirection: "column",
              minHeight: 0 // Izinkan shrinking
            }}
          >
            {activeTab === "segments" && (
              <div style={{ 
                height: "100%", 
                display: "flex", 
                flexDirection: "column",
                overflow: "hidden", // Paksa hidden di segments container
                flex: 1,
                minHeight: 0 // Izinkan shrinking
              }}>
                {transcription.segments && transcription.segments.length > 0 ? (
                  <>
                    {/* Header with Search and Items Per Page - FIXED POSITION */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      backgroundColor: "#ffffff",
                      borderBottom: "1px solid #e5e7eb",
                      flexShrink: 0, // Don't allow this to shrink
                      gap: "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <h4 style={{
                          margin: "0",
                          fontSize: "16px",
                          color: "#374151"
                        }}>
                          💬 Conversation Transcript
                        </h4>
                        
                        {/* Audio Player Controls */}
                        {transcription.audioUrl ? (
                          audioRef && (
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#f8fafc",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb"
                            }}>
                              <button
                                onClick={() => {
                                  if (isPlaying) {
                                    audioRef.pause();
                                    setIsPlaying(false);
                                  } else {
                                    audioRef.play().then(() => setIsPlaying(true)).catch(console.error);
                                  }
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  fontSize: "14px",
                                  cursor: "pointer",
                                  padding: "2px"
                                }}
                                title={isPlaying ? "Pause" : "Play"}
                              >
                                {isPlaying ? "⏸️" : "▶️"}
                              </button>
                              <span style={{
                                fontSize: "11px",
                                color: "#6b7280",
                                minWidth: "80px"
                              }}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                              </span>
                            </div>
                          )
                        ) : (
                          <div style={{
                            padding: "6px 12px",
                            backgroundColor: "#fef3c7",
                            borderRadius: "8px",
                            border: "1px solid #f59e0b",
                            fontSize: "11px",
                            color: "#92400e"
                          }}>
                            🎵 Audio not available
                          </div>
                        )}
                      </div>
                      
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px"
                      }}>
                        {/* Items Per Page Selector */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <span style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            whiteSpace: "nowrap"
                          }}>
                            Show:
                          </span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "12px",
                              backgroundColor: "#ffffff",
                              color: "#374151",
                              cursor: "pointer",
                              outline: "none"
                            }}
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>

                        {/* Search Input */}
                        <div style={{
                          position: "relative",
                          width: "250px"
                        }}>
                          <input
                            type="text"
                            placeholder="Search in conversation..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 36px 8px 12px",
                              border: "2px solid #e5e7eb",
                              borderRadius: "8px",
                              fontSize: "14px",
                              outline: "none",
                              transition: "all 0.2s ease",
                              backgroundColor: "#f9fafb"
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLInputElement).style.borderColor = "#3b82f6";
                              (e.target as HTMLInputElement).style.backgroundColor = "#ffffff";
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLInputElement).style.borderColor = "#e5e7eb";
                              (e.target as HTMLInputElement).style.backgroundColor = "#f9fafb";
                            }}
                          />
                          <div style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#9ca3af",
                            fontSize: "16px"
                          }}>
                            🔍
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Results Info & Pagination Controls - COMBINED IN ONE BAR */}
                    <div style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexShrink: 0, // Don't allow this to shrink
                      padding: "12px 20px",
                      backgroundColor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0"
                    }}>
                      {/* Left side - Results Info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span>
                          {searchTerm 
                            ? `Found ${filteredSegments.length} of ${transcription.segments.length} segments`
                            : `Total: ${filteredSegments.length} segments`
                          }
                        </span>
                        <span style={{ color: "#3b82f6", fontWeight: "500" }}>
                          Showing {Math.min(itemsPerPage, filteredSegments.length - startIndex)} of {filteredSegments.length}
                        </span>
                        {totalPages > 1 && (
                          <span style={{ color: "#059669", fontWeight: "500" }}>
                            Page {currentPage} of {totalPages}
                          </span>
                        )}
                      </div>

                      {/* Center - Pagination Controls (when multiple pages) */}
                      {totalPages > 1 && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          {/* First Page */}
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                              color: currentPage === 1 ? "#9ca3af" : "#374151",
                              cursor: currentPage === 1 ? "not-allowed" : "pointer",
                              fontSize: "10px",
                              transition: "all 0.2s",
                              fontWeight: "500"
                            }}
                            onMouseEnter={(e) => {
                              if (currentPage !== 1) {
                                (e.target as HTMLElement).style.backgroundColor = "#f3f4f6";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== 1) {
                                (e.target as HTMLElement).style.backgroundColor = "#ffffff";
                              }
                            }}
                            title="Go to first page"
                          >
                            ⏮ First
                          </button>

                          {/* Previous */}
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                              color: currentPage === 1 ? "#9ca3af" : "#374151",
                              cursor: currentPage === 1 ? "not-allowed" : "pointer",
                              fontSize: "10px",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              if (currentPage !== 1) {
                                (e.target as HTMLElement).style.backgroundColor = "#f3f4f6";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== 1) {
                                (e.target as HTMLElement).style.backgroundColor = "#ffffff";
                              }
                            }}
                          >
                            ← Prev
                          </button>
                          
                          {/* Page Numbers (condensed) */}
                          <div style={{
                            display: "flex",
                            gap: "2px"
                          }}>
                            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage <= 2) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 1) {
                                pageNum = totalPages - 2 + i;
                              } else {
                                pageNum = currentPage - 1 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "4px",
                                    backgroundColor: currentPage === pageNum ? "#3b82f6" : "#ffffff",
                                    color: currentPage === pageNum ? "#ffffff" : "#374151",
                                    cursor: "pointer",
                                    fontSize: "10px",
                                    fontWeight: "500",
                                    transition: "all 0.2s"
                                  }}
                                  onMouseEnter={(e) => {
                                    if (currentPage !== pageNum) {
                                      (e.target as HTMLElement).style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (currentPage !== pageNum) {
                                      (e.target as HTMLElement).style.backgroundColor = "#ffffff";
                                    }
                                  }}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          {/* Next */}
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              backgroundColor: currentPage === totalPages ? "#f9fafb" : "#ffffff",
                              color: currentPage === totalPages ? "#9ca3af" : "#374151",
                              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                              fontSize: "10px",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              if (currentPage !== totalPages) {
                                (e.target as HTMLElement).style.backgroundColor = "#f3f4f6";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== totalPages) {
                                (e.target as HTMLElement).style.backgroundColor = "#ffffff";
                              }
                            }}
                          >
                            Next →
                          </button>

                          {/* Last Page */}
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              backgroundColor: currentPage === totalPages ? "#f9fafb" : "#ffffff",
                              color: currentPage === totalPages ? "#9ca3af" : "#374151",
                              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                              fontSize: "10px",
                              transition: "all 0.2s",
                              fontWeight: "500"
                            }}
                            onMouseEnter={(e) => {
                              if (currentPage !== totalPages) {
                                (e.target as HTMLElement).style.backgroundColor = "#f3f4f6";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== totalPages) {
                                (e.target as HTMLElement).style.backgroundColor = "#ffffff";
                              }
                            }}
                            title="Go to last page"
                          >
                            Last ⏭
                          </button>
                        </div>
                      )}

                      {/* Right side - Search clear or Quick jump */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm("")}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#3b82f6",
                              cursor: "pointer",
                              fontSize: "12px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}
                          >
                            Clear search
                          </button>
                        )}
                        {totalPages > 1 && (
                          <div style={{
                            fontSize: "11px",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}>
                            <span>Jump:</span>
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={currentPage}
                              onChange={(e) => {
                                const page = parseInt(e.target.value);
                                if (page >= 1 && page <= totalPages) {
                                  setCurrentPage(page);
                                }
                              }}
                              style={{
                                width: "45px",
                                padding: "2px 4px",
                                border: "1px solid #d1d5db",
                                borderRadius: "3px",
                                fontSize: "10px",
                                textAlign: "center",
                                outline: "none"
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const page = parseInt((e.target as HTMLInputElement).value);
                                  if (page >= 1 && page <= totalPages) {
                                    setCurrentPage(page);
                                  }
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Segments List - SINGLE SCROLLABLE AREA */}
                    <div style={{
                      flex: 1,
                      overflowY: "auto",
                      backgroundColor: "white",
                      margin: "0", // Remove any margin
                      paddingRight: "16px", // Add padding to keep content away from scrollbar
                      paddingLeft: "8px",
                      marginRight: "0",
                      boxSizing: "border-box" // Include padding in width calculation
                    }}
                    className="segments-main-scroll">
                      {paginatedSegments.length > 0 ? (
                        paginatedSegments.map((segment, index) => {
                          const globalIndex = startIndex + index;
                          const isCurrentlyPlaying = activeSegmentIndex === globalIndex;
                          
                          return (
                            <div
                              key={globalIndex}
                              id={`segment-${globalIndex}`}
                              style={{
                                padding: "16px 20px",
                                borderBottom: index < paginatedSegments.length - 1 ? "1px solid #f3f4f6" : "none",
                                backgroundColor: isCurrentlyPlaying ? "#f0f9ff" : "transparent",
                                borderLeft: isCurrentlyPlaying ? "4px solid #3b82f6" : "4px solid transparent",
                                transition: "all 0.3s ease",
                                transform: isCurrentlyPlaying ? "translateX(4px)" : "translateX(0)",
                                boxShadow: isCurrentlyPlaying ? "0 2px 8px rgba(59, 130, 246, 0.1)" : "none"
                              }}
                            >
                              <div style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "flex-start"
                              }}>
                                <div style={{
                                  backgroundColor: isCurrentlyPlaying ? "#3b82f6" : "#f3f4f6",
                                  color: isCurrentlyPlaying ? "white" : "#374151",
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  minWidth: "fit-content",
                                  transition: "all 0.3s ease",
                                  boxShadow: isCurrentlyPlaying ? "0 2px 4px rgba(59, 130, 246, 0.3)" : "none"
                                }}>
                                  {segment.speaker || `Speaker ${(globalIndex) % 2 + 1}`}
                                  {isCurrentlyPlaying && <span style={{ marginLeft: "4px" }}>🔊</span>}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{
                                    margin: "0 0 4px 0",
                                    fontSize: "13px",
                                    lineHeight: "1.5",
                                    color: isCurrentlyPlaying ? "#1e40af" : "#374151",
                                    fontWeight: isCurrentlyPlaying ? "500" : "normal",
                                    transition: "all 0.3s ease"
                                  }}>
                                    {searchTerm ? (
                                      <span dangerouslySetInnerHTML={{
                                        __html: segment.text.replace(
                                          new RegExp(searchTerm, 'gi'),
                                          (match) => `<mark style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px;">${match}</mark>`
                                        )
                                      }} />
                                    ) : (
                                      segment.text
                                    )}
                                  </p>
                                  <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                  }}>
                                    {/* Clickable timestamp for audio playback */}
                                    <button
                                      onClick={() => {
                                        console.log('🎯 Timestamp clicked - segment.start:', segment.start, 'segmentIndex:', globalIndex);
                                        console.log('🎯 Segment data:', segment);
                                        if (transcription.audioUrl) {
                                          jumpToTime(segment.start, globalIndex);
                                        }
                                      }}
                                      disabled={!transcription.audioUrl}
                                      style={{
                                        background: "none",
                                        border: `1px solid ${isCurrentlyPlaying ? "#3b82f6" : "#e5e7eb"}`,
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        color: !transcription.audioUrl 
                                          ? "#d1d5db" 
                                          : isCurrentlyPlaying ? "#3b82f6" : "#9ca3af",
                                        cursor: !transcription.audioUrl ? "not-allowed" : "pointer",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        backgroundColor: isCurrentlyPlaying ? "#eff6ff" : "transparent",
                                        opacity: !transcription.audioUrl ? 0.5 : 1,
                                        fontWeight: isCurrentlyPlaying ? "600" : "normal"
                                      }}
                                      onMouseEnter={(e) => {
                                        if (transcription.audioUrl) {
                                          (e.target as HTMLElement).style.borderColor = "#3b82f6";
                                          (e.target as HTMLElement).style.color = "#3b82f6";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (transcription.audioUrl && !isCurrentlyPlaying) {
                                          (e.target as HTMLElement).style.borderColor = "#e5e7eb";
                                          (e.target as HTMLElement).style.color = "#9ca3af";
                                        }
                                      }}
                                      title={
                                        !transcription.audioUrl 
                                          ? "Audio not available" 
                                          : "Click to play from this timestamp"
                                      }
                                    >
                                      {!transcription.audioUrl ? (
                                        <span style={{ fontSize: "10px" }}>🔇</span>
                                      ) : isCurrentlyPlaying && isPlaying ? (
                                        <span style={{ fontSize: "10px" }}>🔊</span>
                                      ) : (
                                        <span style={{ fontSize: "10px" }}>▶️</span>
                                      )}
                                      {segment.start !== undefined && segment.end !== undefined
                                        ? `${formatTime(segment.start)} - ${formatTime(segment.end)}`
                                        : ""}
                                    </button>
                                    <span style={{
                                      fontSize: "10px",
                                      color: isCurrentlyPlaying ? "#3b82f6" : "#cbd5e1",
                                      backgroundColor: isCurrentlyPlaying ? "#dbeafe" : "#f1f5f9",
                                      padding: "2px 6px",
                                      borderRadius: "10px",
                                      fontWeight: isCurrentlyPlaying ? "600" : "normal",
                                      transition: "all 0.3s ease"
                                    }}>
                                      #{globalIndex + 1}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{
                          padding: "40px",
                          textAlign: "center",
                          color: "#9ca3af"
                        }}>
                          {searchTerm ? (
                            <>
                              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
                              <p style={{ margin: "0", fontSize: "14px" }}>
                                No segments found for "{searchTerm}"
                              </p>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: "24px", marginBottom: "8px" }}>💬</div>
                              <p style={{ margin: "0", fontSize: "14px" }}>
                                No conversation segments available
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "20px" }}>
                    <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                      No transcript segments available
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "summary" && (
              <div style={{
                height: "100%",
                overflow: "auto",
                padding: "20px",
                paddingRight: "16px", // Add padding to keep content away from scrollbar
                paddingLeft: "8px",
                boxSizing: "border-box", // Include padding in width calculation
                flex: 1,
                minHeight: 0 // Allow flex child to shrink below content size
              }}
              className="summary-tab-scroll">
                {/* Narrative Summary Section */}
                {cleanSummary ? (
                  <div style={{ marginBottom: "24px" }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "16px",
                        color: "#374151",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      📄 Meeting Summary
                    </h4>
                    <div
                      style={{
                        fontSize: "13px",
                        lineHeight: "1.6",
                        color: "#374151",
                        whiteSpace: "pre-wrap",
                        backgroundColor: "white",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {cleanSummary}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                    No summary available
                  </p>
                )}

                {/* Speaker Points Section */}
                {speakerPoints && speakerPoints.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "16px",
                        color: "#374151",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      🗣️ Key Points by Speaker
                    </h4>
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {speakerPoints.map((speakerData: any, speakerIndex: number) => (
                        <div
                          key={speakerIndex}
                          style={{
                            marginBottom: speakerIndex < speakerPoints.length - 1 ? "16px" : "0",
                            padding: "12px",
                            backgroundColor: "#f8fafc",
                            borderRadius: "6px",
                            borderLeft: "3px solid #8b5cf6",
                          }}
                        >
                          <h5
                            style={{
                              margin: "0 0 8px 0",
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#374151",
                            }}
                          >
                            👤 {speakerData.speaker}
                          </h5>
                          {speakerData.points.map((point: string, pointIndex: number) => (
                            <div
                              key={pointIndex}
                              style={{
                                marginBottom: pointIndex < speakerData.points.length - 1 ? "6px" : "0",
                                padding: "6px",
                                backgroundColor: "white",
                                borderRadius: "4px",
                                fontSize: "13px",
                                lineHeight: "1.5",
                                color: "#374151",
                              }}
                            >
                              <span style={{ marginRight: "6px", color: "#8b5cf6" }}>•</span>
                              {point}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Decisions/Insights Section */}
                {transcription.keyDecisions && transcription.keyDecisions.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "16px",
                        color: "#374151",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      🎯 Key Insights & Decisions
                    </h4>
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {transcription.keyDecisions.map((decision, index) => {
                        const decisionText = typeof decision === "object" && decision !== null && "decision" in decision
                          ? decision.decision
                          : typeof decision === "string"
                          ? decision
                          : "Unknown decision";
                        const impact = typeof decision === "object" && decision !== null && "impact" in decision
                          ? decision.impact
                          : null;

                        return (
                          <div key={index} style={{
                            marginBottom: index < transcription.keyDecisions!.length - 1 ? "12px" : "0",
                            padding: "12px",
                            backgroundColor: "#f0f9ff",
                            borderRadius: "8px",
                            border: "1px solid #e0f2fe",
                            borderLeft: "4px solid #3b82f6",
                          }}>
                            <div style={{
                              fontSize: "13px",
                              lineHeight: "1.5",
                              color: "#374151",
                              marginBottom: impact ? "8px" : "0",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px"
                            }}>
                              <span style={{ color: "#3b82f6", fontSize: "14px", fontWeight: "bold", marginTop: "2px" }}>💡</span>
                              <span>{decisionText}</span>
                            </div>
                            {impact && (
                              <div style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                fontStyle: "italic",
                                marginLeft: "22px"
                              }}>
                                <strong>📊 Impact:</strong> {impact}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Items Section */}
                {transcription.actionItems &&
                  transcription.actionItems.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: "16px",
                          color: "#374151",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        ✅ Action Items
                      </h4>
                      <div
                        style={{
                          backgroundColor: "white",
                          padding: "12px",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        {transcription.actionItems.map((item, index) => {
                          // Extract action item details with proper type checking
                          const task =
                            typeof item === "object" &&
                            item !== null &&
                            "task" in item
                              ? item.task
                              : typeof item === "string"
                              ? item
                              : "Unknown task";
                          const assignee =
                            typeof item === "object" &&
                            item !== null &&
                            "assignee" in item
                              ? item.assignee
                              : null;
                          const deadline =
                            typeof item === "object" &&
                            item !== null &&
                            "deadline" in item
                              ? item.deadline
                              : null;

                          return (
                            <div
                              key={index}
                              style={{
                                marginBottom: "12px",
                                padding: "12px",
                                backgroundColor: "#f0fdf4",
                                borderRadius: "8px",
                                border: "1px solid #dcfce7",
                                borderLeft: "4px solid #10b981",
                                fontSize: "13px",
                                lineHeight: "1.4",
                              }}
                            >
                              <div style={{ marginBottom: "8px" }}>
                                <span
                                  style={{
                                    color: "#059669",
                                    marginRight: "8px",
                                    fontSize: "14px",
                                  }}
                                >
                                  ✅
                                </span>
                                <span
                                  style={{
                                    fontWeight: "600",
                                    color: "#374151",
                                  }}
                                >
                                  {task}
                                </span>
                              </div>

                              {(assignee || deadline) && (
                                <div
                                  style={{
                                    marginBottom: "8px",
                                    fontSize: "12px",
                                    color: "#6b7280",
                                  }}
                                >
                                  {assignee && (
                                    <span style={{ marginRight: "12px" }}>
                                      👤 <strong>Assignee:</strong> {assignee}
                                    </span>
                                  )}
                                  {deadline && (
                                    <span>
                                      📅 <strong>Deadline:</strong> {deadline}
                                    </span>
                                  )}
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  // Create Notion URL with task details
                                  const notionUrl = `https://www.notion.so/`;

                                  // Copy task details to clipboard for easy pasting in Notion
                                  const taskDetails = `${task}${
                                    assignee ? `\nAssignee: ${assignee}` : ""
                                  }${
                                    deadline ? `\nDeadline: ${deadline}` : ""
                                  }`;
                                  navigator.clipboard
                                    .writeText(taskDetails)
                                    .then(() => {
                                      console.log(
                                        "Task details copied to clipboard"
                                      );
                                    });

                                  // Try to open Notion app first, fallback to web
                                  const notionAppUrl = `notion://www.notion.so/`;
                                  window.open(notionAppUrl, "_blank") ||
                                    window.open(notionUrl, "_blank");
                                }}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#000000",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = "#1f1f1f";
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = "#000000";
                                  e.currentTarget.style.transform = "translateY(0px)";
                                }}
                              >
                                <span style={{ fontSize: "12px" }}>📝</span>
                                Add to Notion
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {activeTab === "chat" && (
              <div className="ai-chat-container" style={{ 
                height: "100%", 
                overflow: "hidden",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0, // Allow flex child to shrink below content size
                backgroundColor: "#f8fafc"
              }}>
                {/* Debug header */}
                <div style={{
                  padding: "16px",
                  backgroundColor: "#e0e7ff",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "2px solid #3b82f6"
                }}>
                  <h3 style={{ margin: "0 0 8px 0", color: "#1e40af" }}>🤖 AI Chat Interface</h3>
                  <p style={{ margin: "0", fontSize: "14px", color: "#3730a3" }}>
                    Session ID: {transcription.id}
                  </p>
                </div>
                <ChatInterface sessionId={transcription.id} />
              </div>
            )}

            {/* Fallback for plain text */}
            {!transcription.segments && (
              <p
                style={{
                  margin: "0",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                }}
              >
                {transcription.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fallback for plain text */}
      {!transcription.segments && (
        <p
          style={{
            margin: "0",
            fontSize: "14px",
            lineHeight: "1.5",
            color: "#374151",
            whiteSpace: "pre-wrap",
          }}
        >
          {transcription.text}
        </p>
      )}
    </div>
    </>
  );
};

export default SessionTranscriptionCard;
