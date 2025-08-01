import React, { useState } from "react";

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
  onViewDetails: () => void;
}

const SessionTranscriptionCard: React.FC<SessionTranscriptionCardProps> = ({ 
  transcription, 
  onViewDetails 
}) => {
  const [activeTab, setActiveTab] = useState<"segments" | "summary">("summary");
  
  // Use backend-provided clean data directly
  const cleanSummary = transcription.fullResult?.clean_summary || transcription.summary || '';
  const speakerPoints = transcription.fullResult?.speaker_points || [];

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
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e7eb",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            📝 Session Transcription
          </h3>
          <p
            style={{
              margin: "0",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            Uploaded at {transcription.uploadTime.toLocaleTimeString()}
            {transcription.duration &&
              ` • ${Math.round(transcription.duration)}s`}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Content Area with Tabs */}
      {transcription.status === "completed" && (
        <div>
          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              borderBottom: "2px solid #e5e7eb",
              marginBottom: "16px",
            }}
          >
            {(["segments", "summary"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: activeTab === tab ? "#3b82f6" : "#6b7280",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid #3b82f6"
                      : "2px solid transparent",
                  marginBottom: "-2px",
                  textTransform: "capitalize",
                }}
              >
                {tab === "segments" ? "💬 Segments" : "📄 Summary"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div
            style={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {activeTab === "segments" && (
              <div>
                {transcription.segments && transcription.segments.length > 0 ? (
                  <div>
                    <h4
                      style={{
                        margin: "0 0 16px 0",
                        fontSize: "16px",
                        color: "#374151",
                      }}
                    >
                      💬 Conversation Transcript
                    </h4>
                    <div
                      style={{
                        maxHeight: "350px",
                        overflowY: "auto",
                        backgroundColor: "white",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {transcription.segments.map((segment, index) => (
                        <div
                          key={index}
                          style={{
                            padding: "12px",
                            borderBottom:
                              index < transcription.segments!.length - 1
                                ? "1px solid #f3f4f6"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "12px",
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                backgroundColor: "#f3f4f6",
                                color: "#374151",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                                minWidth: "fit-content",
                              }}
                            >
                              {segment.speaker || `Speaker ${index % 2 + 1}`}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p
                                style={{
                                  margin: "0 0 4px 0",
                                  fontSize: "13px",
                                  lineHeight: "1.5",
                                  color: "#374151",
                                }}
                              >
                                {segment.text}
                              </p>
                              <p
                                style={{
                                  margin: "0",
                                  fontSize: "11px",
                                  color: "#9ca3af",
                                }}
                              >
                                {segment.start !== undefined &&
                                segment.end !== undefined
                                  ? `${Math.round(segment.start)}s - ${Math.round(
                                      segment.end
                                    )}s`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                    No transcript segments available
                  </p>
                )}
              </div>
            )}

            {activeTab === "summary" && (
              <div>
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
      )}

      {/* View Full Details Button */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <button
          onClick={onViewDetails}
          style={{
            padding: "8px 16px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          📊 Open Full Analysis
        </button>
      </div>

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
  );
};

export default SessionTranscriptionCard;
