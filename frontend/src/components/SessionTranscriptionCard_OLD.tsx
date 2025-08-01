import React, { useState } from "react";
import { TranscriptItem } from "../types";
import ChatTab from "./ChatTab";

interface SessionTranscriptionCardProps {
  transcription: {
    id: string;
    filename: string;
    status: "processing" | "completed" | "error";
    uploadTime: Date;
    text: string;
    segments?: TranscriptItem[];
    summary?: string | null;
    actionItems?:
      | (string | { task: string; assignee?: string; deadline?: string })[]
      | null;
    keyDecisions?:
      | (string | { decision: string; reasoning?: string; impact?: string })[]
      | null;
    clean_summary?: string | null;
    speaker_points?: Array<{
      speaker: string;
      points: string[];
    }> | null;
    conclusions?: string[] | null;
    sentiment?: string | null;
    participants?: string[] | null;
    duration?: number | null;
    fullResult?: any;
  };
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
  onViewDetails: () => void;
}

export const SessionTranscriptionCard: React.FC<
  SessionTranscriptionCardProps
> = ({ transcription, onCopy, onDownload, onClear, onViewDetails }) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "segments" | "summary" | "decisions" | "speakers" | "chat"
  >("overview");

  // Use backend-provided clean data directly
  const cleanSummary = transcription.fullResult?.clean_summary || transcription.summary || '';
  const speakerPoints = transcription.fullResult?.speaker_points || [];

  const getStatusBadge = () => {
    switch (transcription.status) {
      case "processing":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              backgroundColor: "#fef3c7",
              color: "#d97706",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <div
              className="loading-spinner-small"
              style={{
                width: "12px",
                height: "12px",
                border: "2px solid #fde68a",
                borderTop: "2px solid #d97706",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            Processing...
          </div>
        );
      case "completed":
        return (
          <div
            style={{
              padding: "4px 12px",
              backgroundColor: "#dcfce7",
              color: "#166534",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            ✅ Completed
          </div>
        );
      case "error":
        return (
          <div
            style={{
              padding: "4px 12px",
              backgroundColor: "#fecaca",
              color: "#dc2626",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            ❌ Error
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "16px",
              fontWeight: "600",
              color: "#2c3e50",
            }}
          >
            {transcription.filename}
          </h3>
          <p
            style={{
              margin: "0",
              fontSize: "12px",
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

      {/* Comprehensive Summary View */}
      {transcription.status === "completed" && (
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
            {activeTab === "overview" && (
              <div>
                {/* Statistics */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      backgroundColor: "white",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#3b82f6",
                      }}
                    >
                      {transcription.segments?.length || 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      Segments
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      backgroundColor: "white",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#059669",
                      }}
                    >
                      {transcription.participants?.length || 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      Speakers
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      backgroundColor: "white",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#7c3aed",
                      }}
                    >
                      {transcription.duration
                        ? `${Math.round(transcription.duration)}s`
                        : "N/A"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      Duration
                    </div>
                  </div>
                  {transcription.sentiment && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        backgroundColor: "white",
                        borderRadius: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#d97706",
                        }}
                      >
                        {transcription.sentiment}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        Sentiment
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Summary */}
                {transcription.summary && (
                  <div style={{ marginBottom: "12px" }}>
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      📄 Summary Preview
                    </h4>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "13px",
                        lineHeight: "1.4",
                        color: "#6b7280",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {transcription.summary
                        .replace(/^#.*$/gm, "")
                        .replace(/\*\*/g, "")
                        .substring(0, 200)}
                      ...
                    </p>
                  </div>
                )}

                {/* Action Items Preview */}
                {transcription.actionItems &&
                  transcription.actionItems.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <h4
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "14px",
                          color: "#374151",
                        }}
                      >
                        ✅ Action Items ({transcription.actionItems.length})
                      </h4>
                      <ul
                        style={{
                          margin: "0",
                          paddingLeft: "16px",
                          fontSize: "12px",
                          color: "#6b7280",
                        }}
                      >
                        {transcription.actionItems
                          .slice(0, 2)
                          .map((item, index) => {
                            const task =
                              typeof item === "object" &&
                              item !== null &&
                              "task" in item
                                ? item.task
                                : typeof item === "string"
                                ? item
                                : "Unknown task";
                            return (
                              <li key={index} style={{ marginBottom: "4px" }}>
                                {task.length > 80
                                  ? `${task.substring(0, 80)}...`
                                  : task}
                              </li>
                            );
                          })}
                        {transcription.actionItems.length > 2 && (
                          <li style={{ fontStyle: "italic" }}>
                            +{transcription.actionItems.length - 2} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {activeTab === "segments" &&
              transcription.segments &&
              transcription.segments.length > 0 && (
                <div>
                  <div
                    style={{
                      marginBottom: "12px",
                      padding: "8px 12px",
                      backgroundColor: "#e0f2fe",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#0369a1",
                      fontWeight: "600",
                    }}
                  >
                    📊 {transcription.segments.length} segments •{" "}
                    {transcription.segments.filter((s) => s.speakerName)
                      .length > 0
                      ? [
                          ...new Set(
                            transcription.segments.map((s) => s.speakerName)
                          ),
                        ].length + " speakers"
                      : "1 speaker"}
                    {transcription.duration &&
                      ` • ${Math.round(transcription.duration)}s`}
                  </div>
                  {transcription.segments.slice(0, 5).map((segment, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: "8px",
                        padding: "8px",
                        borderLeft: "3px solid #3b82f6",
                        backgroundColor: "white",
                        borderRadius: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          marginBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontWeight: "600" }}>
                          {segment.speakerName || "Speaker"}
                        </span>
                        <span>
                          {segment.start} - {segment.end}
                        </span>
                        {segment.confidence && (
                          <span
                            style={{
                              padding: "1px 4px",
                              borderRadius: "6px",
                              backgroundColor:
                                segment.confidence >= 0.9
                                  ? "#dcfce7"
                                  : segment.confidence >= 0.8
                                  ? "#fef3c7"
                                  : "#fecaca",
                              color:
                                segment.confidence >= 0.9
                                  ? "#166534"
                                  : segment.confidence >= 0.8
                                  ? "#d97706"
                                  : "#dc2626",
                              fontSize: "10px",
                            }}
                          >
                            {Math.round(segment.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: "0",
                          fontSize: "13px",
                          lineHeight: "1.4",
                          color: "#374151",
                        }}
                      >
                        {segment.text}
                      </p>
                    </div>
                  ))}
                  {transcription.segments.length > 5 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        color: "#6b7280",
                        fontSize: "12px",
                        fontStyle: "italic",
                      }}
                    >
                      +{transcription.segments.length - 5} more segments...
                    </div>
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
        </div>
      )}

      {/* Decisions Tab */}
      {activeTab === "decisions" && (
        <div>
          {transcription.keyDecisions && transcription.keyDecisions.length > 0 ? (
            <div>
              <h4 style={{ 
                margin: "0 0 16px 0", 
                fontSize: "16px", 
                color: "#374151",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                🎯 Key Decisions Made
              </h4>
              <div style={{
                backgroundColor: "white",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}>
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
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      borderLeft: "4px solid #3b82f6",
                    }}>
                      <div style={{
                        fontSize: "13px",
                        lineHeight: "1.5",
                        color: "#374151",
                        marginBottom: impact ? "8px" : "0"
                      }}>
                        {decisionText}
                      </div>
                      {impact && (
                        <div style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          fontStyle: "italic"
                        }}>
                          <strong>📊 Impact:</strong> {impact}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              color: "#6b7280", 
              fontStyle: "italic",
              padding: "32px" 
            }}>
              No key decisions were identified in this transcription.
            </div>
          )}
        </div>
      )}

      {/* Speakers Tab */}
      {activeTab === "speakers" && (
        <div>
          {speakerPoints && speakerPoints.length > 0 ? (
            <div>
              <h4 style={{ 
                margin: "0 0 16px 0", 
                fontSize: "16px", 
                color: "#374151",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                🗣️ Important Points by Speaker
              </h4>
              <div style={{
                backgroundColor: "white",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}>
                {speakerPoints.map((speakerData: any, speakerIndex: number) => (
                  <div key={speakerIndex} style={{
                    marginBottom: speakerIndex < speakerPoints.length - 1 ? "20px" : "0",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    borderLeft: "4px solid #8b5cf6",
                  }}>
                    <h5 style={{
                      margin: "0 0 12px 0",
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      👤 {speakerData.speaker}
                    </h5>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {speakerData.points.map((point: string, pointIndex: number) => (
                        <div key={pointIndex} style={{
                          padding: "10px",
                          backgroundColor: "white",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                          fontSize: "13px",
                          lineHeight: "1.6",
                          color: "#374151",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px"
                        }}>
                          <span style={{ 
                            color: "#8b5cf6", 
                            fontSize: "14px", 
                            fontWeight: "bold",
                            marginTop: "2px"
                          }}>
                            •
                          </span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              color: "#6b7280", 
              fontStyle: "italic",
              padding: "32px" 
            }}>
              No speaker-specific points were identified in this transcription.
            </div>
          )}
        </div>
      )}

      {/* AI Chat Tab */}
      {activeTab === "chat" && transcription.status === "completed" && (
        <div>
          <ChatTab 
            currentFileId={transcription.id}
            isTranscriptionReady={true}
          />
        </div>
      )}

      {/* Action Buttons */}
      {transcription.status === "completed" && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCopy}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f3e8ff",
              color: "#7c3aed",
              border: "1px solid #ddd6fe",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            📋 Copy Text
          </button>
          <button
            onClick={onDownload}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            📁 Download
          </button>
          <button
            onClick={onClear}
            style={{
              padding: "8px 16px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            🗑️ Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionTranscriptionCard;
