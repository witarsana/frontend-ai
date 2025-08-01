import React, { useState } from "react";
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
  
  // Use backend-provided clean data directly
  const cleanSummary = transcription.fullResult?.clean_summary || transcription.summary || '';
  const speakerPoints = transcription.fullResult?.speaker_points || [];

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
        
        /* Custom scrollbar for AI Chat container if needed */
        .ai-chat-container::-webkit-scrollbar {
          width: 6px;
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
      `}</style>
      
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e5e7eb",
          marginBottom: "0", // Removed excessive margin
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column"
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
        <div style={{ padding: "0" }}>
          {/* Enhanced Tab Navigation */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#f8fafc",
              margin: "0",
              borderBottom: "1px solid #e5e7eb"
            }}
          >
            {(["segments", "summary", "chat"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  border: "none",
                  background: activeTab === tab ? "white" : "transparent",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: activeTab === tab ? "#3b82f6" : "#6b7280",
                  borderBottom: activeTab === tab ? "3px solid #3b82f6" : "3px solid transparent",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
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
            style={{
              backgroundColor: "#ffffff",
              padding: "0", // Remove padding to give more space
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {activeTab === "segments" && (
              <div style={{ 
                height: "100%", 
                display: "flex", 
                flexDirection: "column",
                overflow: "hidden"
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
                      flexShrink: 0,
                      gap: "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}>
                      <h4 style={{
                        margin: "0",
                        fontSize: "16px",
                        color: "#374151"
                      }}>
                        💬 Conversation Transcript
                      </h4>
                      
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
                      flexShrink: 0,
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
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#c1c1c1 #f1f1f1'
                    }}
                    className="segments-main-scroll">
                      <style>
                        {`.segments-main-scroll::-webkit-scrollbar { 
                          width: 8px; 
                        }
                        .segments-main-scroll::-webkit-scrollbar-track { 
                          background: #f8fafc; 
                        }
                        .segments-main-scroll::-webkit-scrollbar-thumb { 
                          background: #cbd5e1; 
                          border-radius: 4px;
                        }
                        .segments-main-scroll::-webkit-scrollbar-thumb:hover { 
                          background: #94a3b8; 
                        }`}
                      </style>
                      {paginatedSegments.length > 0 ? (
                        paginatedSegments.map((segment, index) => (
                          <div
                            key={startIndex + index}
                            style={{
                              padding: "16px 20px",
                              borderBottom: index < paginatedSegments.length - 1 ? "1px solid #f3f4f6" : "none"
                            }}
                          >
                            <div style={{
                              display: "flex",
                              gap: "12px",
                              alignItems: "flex-start"
                            }}>
                              <div style={{
                                backgroundColor: "#f3f4f6",
                                color: "#374151",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                                minWidth: "fit-content"
                              }}>
                                {segment.speaker || `Speaker ${(startIndex + index) % 2 + 1}`}
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  margin: "0 0 4px 0",
                                  fontSize: "13px",
                                  lineHeight: "1.5",
                                  color: "#374151"
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
                                  <p style={{
                                    margin: "0",
                                    fontSize: "11px",
                                    color: "#9ca3af"
                                  }}>
                                    {segment.start !== undefined && segment.end !== undefined
                                      ? `${Math.round(segment.start)}s - ${Math.round(segment.end)}s`
                                      : ""}
                                  </p>
                                  <span style={{
                                    fontSize: "10px",
                                    color: "#cbd5e1",
                                    backgroundColor: "#f1f5f9",
                                    padding: "2px 6px",
                                    borderRadius: "10px"
                                  }}>
                                    #{startIndex + index + 1}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
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
                scrollbarWidth: 'thin',
                scrollbarColor: '#c1c1c1 #f1f1f1'
              }}
              className="summary-tab-scroll">
                <style>
                  {`.summary-tab-scroll::-webkit-scrollbar { 
                    width: 8px; 
                  }
                  .summary-tab-scroll::-webkit-scrollbar-track { 
                    background: #f8fafc; 
                  }
                  .summary-tab-scroll::-webkit-scrollbar-thumb { 
                    background: #cbd5e1; 
                    border-radius: 4px;
                  }
                  .summary-tab-scroll::-webkit-scrollbar-thumb:hover { 
                    background: #94a3b8; 
                  }`}
                </style>
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
                padding: "0",
                display: "flex",
                flexDirection: "column"
              }}>
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
