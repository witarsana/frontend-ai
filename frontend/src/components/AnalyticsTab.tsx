import React from 'react';

interface Segment {
  id?: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speaker_name?: string;
  confidence?: number;
}

interface Transcription {
  id: string;
  text: string;
  summary?: string;
  uploadTime: Date;
  duration?: number;
  status: "processing" | "completed" | "error";
  actionItems?: (string | any)[];
  keyDecisions?: (string | any)[];
  speakers?: string[];
  segments?: Segment[];
  fullResult?: any;
  audioUrl?: string;
  filename?: string;
  experimentalSpeakerData?: any;
  audioInfo?: any;
  detectedSpeakers?: number;
}

interface AnalyticsTabProps {
  transcription: Transcription;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ transcription }) => {
  // Calculate speaker statistics from actual transcription data
  const calculateSpeakerStats = () => {
    if (!transcription.segments || transcription.segments.length === 0) {
      return [];
    }

    const speakerData: { [key: string]: { duration: number; segments: number; words: number } } = {};
    let totalDuration = 0;

    transcription.segments.forEach(segment => {
      const speaker = segment.speaker_name || segment.speaker || `Speaker ${Math.floor(Math.random() * 3) + 1}`;
      const duration = segment.end - segment.start;
      const words = segment.text.split(' ').length;
      
      if (!speakerData[speaker]) {
        speakerData[speaker] = { duration: 0, segments: 0, words: 0 };
      }
      
      speakerData[speaker].duration += duration;
      speakerData[speaker].segments += 1;
      speakerData[speaker].words += words;
      totalDuration += duration;
    });

    return Object.entries(speakerData)
      .map(([speaker, data]) => ({
        speaker,
        duration: data.duration,
        percentage: totalDuration > 0 ? (data.duration / totalDuration) * 100 : 0,
        segments: data.segments,
        words: data.words
      }))
      .sort((a, b) => b.duration - a.duration);
  };

  // Calculate meeting insights from actual data
  const calculateInsights = () => {
    const totalDuration = transcription.duration || 0;
    const totalWords = transcription.segments?.reduce((sum, segment) => 
      sum + segment.text.split(' ').length, 0) || 0;
    const totalSegments = transcription.segments?.length || 0;
    const uniqueSpeakers = new Set(transcription.segments?.map(s => 
      s.speaker_name || s.speaker) || []).size;
    const actionItems = transcription.actionItems?.length || 0;
    const keyDecisions = transcription.keyDecisions?.length || 0;

    return {
      totalDuration: Math.round(totalDuration / 60), // Convert to minutes
      totalWords,
      totalSegments,
      uniqueSpeakers,
      actionItems,
      keyDecisions,
      avgWordsPerMinute: totalDuration > 0 ? Math.round(totalWords / (totalDuration / 60)) : 0
    };
  };

  const speakerStats = calculateSpeakerStats();
  const insights = calculateInsights();
  const mostActiveSpeaker = speakerStats[0];

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSpeakerColor = (index: number) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return colors[index % colors.length];
  };

  return (
    <div style={{
      height: "100%",
      overflow: "auto",
      padding: "16px",
      paddingRight: "16px",
      paddingLeft: "16px",
      boxSizing: "border-box",
      flex: 1,
      minHeight: 0,
      background: "rgba(255, 255, 255, 0.4)",
      backdropFilter: "blur(8px)"
    }}>
      {/* Futuristic Header Section */}
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{
          margin: "0 0 8px 0",
          fontSize: "20px",
          background: "linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontWeight: "600"
        }}>
          📊 Meeting Analytics
        </h4>
        <p style={{
          margin: "0",
          fontSize: "14px",
          color: "#64748b",
          fontWeight: "400"
        }}>
          Key insights and statistics from your conversation
        </p>
      </div>

      {/* Futuristic Overview Cards */}
            {/* Quick Overview Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "12px",
        marginBottom: "24px"
      }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <div style={{ 
            fontSize: "24px", 
            fontWeight: "700", 
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px" 
          }}>
            {insights.totalDuration} min
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Duration</div>
        </div>
        
        <div style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <div style={{ 
            fontSize: "24px", 
            fontWeight: "700", 
            background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px" 
          }}>
            {insights.totalWords.toLocaleString()}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Words</div>
        </div>
        
        <div style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <div style={{ 
            fontSize: "24px", 
            fontWeight: "700", 
            background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px" 
          }}>
            {insights.uniqueSpeakers}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Speakers</div>
        </div>
        
        <div style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <div style={{ 
            fontSize: "24px", 
            fontWeight: "700", 
            background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px" 
          }}>
            {insights.avgWordsPerMinute}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Words/Min</div>
        </div>
      </div>

      {/* Futuristic Speaker Participation */}
      {speakerStats.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h4 style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            background: "linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "600"
          }}>
            🎤 Speaker Participation
          </h4>
          
          <div style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(16px)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid rgba(59, 130, 246, 0.1)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)"
          }}>
            {speakerStats.map((speaker, index) => (
              <div key={speaker.speaker} style={{ 
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: index < speakerStats.length - 1 ? "16px" : "0",
                padding: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "6px",
                borderLeft: `3px solid ${getSpeakerColor(index)}`
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: getSpeakerColor(index),
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    marginRight: "12px"
                  }}>
                    {index + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      {speaker.speaker}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {speaker.segments} segments • {speaker.words.toLocaleString()} words
                    </div>
                  </div>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                    {speaker.percentage.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {formatDuration(speaker.duration)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meeting Summary Preview */}
      {(transcription.summary || transcription.fullResult?.clean_summary) && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            📄 Summary
          </h4>
          
          <div style={{
            backgroundColor: "white",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}>
            <div style={{
              fontSize: "13px",
              lineHeight: "1.6",
              color: "#374151",
              marginBottom: "8px"
            }}>
              {(transcription.fullResult?.clean_summary || transcription.summary || '').slice(0, 300)}
              {(transcription.fullResult?.clean_summary || transcription.summary || '').length > 300 && '...'}
            </div>
            
            {(transcription.fullResult?.clean_summary || transcription.summary || '').length > 300 && (
              <div style={{
                fontSize: "12px",
                color: "#3b82f6",
                fontStyle: "italic",
                textAlign: "center",
                padding: "8px",
                backgroundColor: "#f8fafc",
                borderRadius: "4px"
              }}>
                Read full summary in Summary tab
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Items */}
      {transcription.actionItems && transcription.actionItems.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            ✅ Action Items ({transcription.actionItems.length})
          </h4>
          
          <div style={{
            backgroundColor: "white",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}>
            {transcription.actionItems.slice(0, 4).map((item, index) => {
              const title = 
                typeof item === "object" && item !== null && "title" in item
                  ? String(item.title)
                  : typeof item === "object" && item !== null && "task" in item
                  ? String(item.task)
                  : typeof item === "string"
                  ? item
                  : "Unknown task";

              const priority = 
                typeof item === "object" && item !== null && "priority" in item
                  ? String(item.priority)
                  : null;

              const assignee =
                typeof item === "object" && item !== null && "assigned_to" in item
                  ? String(item.assigned_to)
                  : typeof item === "object" && item !== null && "assignee" in item
                  ? String(item.assignee)
                  : null;

              return (
                <div key={index} style={{
                  marginBottom: index < Math.min(4, transcription.actionItems!.length) - 1 ? "12px" : "0",
                  padding: "10px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  borderLeft: "3px solid #10b981"
                }}>
                  <div style={{
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "4px",
                    lineHeight: "1.4"
                  }}>
                    {title.length > 80 ? `${title.slice(0, 80)}...` : title}
                  </div>
                  
                  <div style={{
                    display: "flex",
                    gap: "8px",
                    fontSize: "11px"
                  }}>
                    {priority && (
                      <span style={{
                        color: priority.toLowerCase() === 'high' ? '#dc2626' : priority.toLowerCase() === 'medium' ? '#d97706' : '#059669',
                        fontWeight: "500"
                      }}>
                        Priority: {priority}
                      </span>
                    )}
                    
                    {assignee && (
                      <span style={{
                        color: "#6b7280",
                        fontWeight: "500"
                      }}>
                        Assigned: {assignee}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {transcription.actionItems.length > 4 && (
              <div style={{
                fontSize: "12px",
                color: "#3b82f6",
                fontStyle: "italic",
                textAlign: "center",
                padding: "8px",
                backgroundColor: "#f8fafc",
                borderRadius: "4px",
                marginTop: "8px"
              }}>
                +{transcription.actionItems.length - 4} more items in Summary tab
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Decisions */}
      {transcription.keyDecisions && transcription.keyDecisions.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            🎯 Key Decisions ({transcription.keyDecisions.length})
          </h4>
          
          <div style={{
            backgroundColor: "white",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}>
            {transcription.keyDecisions.slice(0, 3).map((decision, index) => {
              const title = 
                typeof decision === "object" && decision !== null && "title" in decision
                  ? String(decision.title)
                  : typeof decision === "object" && decision !== null && "decision" in decision
                  ? String(decision.decision)
                  : typeof decision === "string"
                  ? decision
                  : "Unknown decision";

              return (
                <div key={index} style={{
                  marginBottom: index < Math.min(3, transcription.keyDecisions!.length) - 1 ? "12px" : "0",
                  padding: "10px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  borderLeft: "3px solid #3b82f6"
                }}>
                  <div style={{
                    fontSize: "13px",
                    color: "#374151",
                    lineHeight: "1.4"
                  }}>
                    {title.length > 100 ? `${title.slice(0, 100)}...` : title}
                  </div>
                </div>
              );
            })}
            
            {transcription.keyDecisions.length > 3 && (
              <div style={{
                fontSize: "12px",
                color: "#3b82f6",
                fontStyle: "italic",
                textAlign: "center",
                padding: "8px",
                backgroundColor: "#f8fafc",
                borderRadius: "4px",
                marginTop: "8px"
              }}>
                +{transcription.keyDecisions.length - 3} more decisions in Summary tab
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Statistics */}
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{
          margin: "0 0 12px 0",
          fontSize: "16px",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          📈 Content Statistics
        </h4>
        
        <div style={{
          backgroundColor: "white",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px"
          }}>
            <div style={{
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "6px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                {insights.totalSegments}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Segments</div>
            </div>
            
            <div style={{
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "6px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                {insights.actionItems}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Action Items</div>
            </div>
            
            <div style={{
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "6px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                {insights.keyDecisions}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Key Decisions</div>
            </div>
            
            {mostActiveSpeaker && (
              <div style={{
                padding: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "6px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  {mostActiveSpeaker.speaker}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Most Active ({mostActiveSpeaker.percentage.toFixed(1)}%)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Experimental Data - If Available */}
      {transcription.experimentalSpeakerData && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            🧪 Advanced Analysis
          </h4>
          
          <div style={{
            backgroundColor: "white",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px"
            }}>
              {transcription.experimentalSpeakerData.analysis?.voice_activity_ratio && (
                <div style={{
                  padding: "12px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    {(transcription.experimentalSpeakerData.analysis.voice_activity_ratio * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Voice Activity</div>
                </div>
              )}
              
              {transcription.experimentalSpeakerData.analysis?.speaker_transitions && (
                <div style={{
                  padding: "12px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    {transcription.experimentalSpeakerData.analysis.speaker_transitions}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Speaker Changes</div>
                </div>
              )}
              
              <div style={{
                padding: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "6px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  {transcription.experimentalSpeakerData.method || 'AI Detection'}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Method Used
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
