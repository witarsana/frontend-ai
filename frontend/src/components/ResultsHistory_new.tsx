import React, { useState, useEffect } from "react";
import { aiAPI } from "../services/api";
import transkriboLogo from "../assets/Transkribo.png";

interface HistoryItem {
  job_id: string;
  filename: string;
  processed_at: string;
  duration: number;
  word_count: number;
  summary_preview?: string;
  status?: "completed" | "processing" | "failed";
}

interface ResultsHistoryProps {
  onSelectJob: (jobId: string) => void;
  currentJobId?: string;
}

const ResultsHistory: React.FC<ResultsHistoryProps> = ({
  onSelectJob,
  currentJobId,
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await aiAPI.getCompletedJobs();
      setHistoryItems(response.jobs || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load history:", err);
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string = "completed") => {
    const statusConfig = {
      completed: {
        color: "#10b981",
        bg: "#d1fae5",
        text: "✅ Completed",
        icon: "✅",
      },
      processing: {
        color: "#f59e0b",
        bg: "#fef3c7",
        text: "⌛ Processing",
        icon: "⌛",
      },
      failed: {
        color: "#ef4444",
        bg: "#fee2e2",
        text: "❌ Failed",
        icon: "❌",
      },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.completed;

    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: "600",
          color: config.color,
          backgroundColor: config.bg,
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {config.text}
      </span>
    );
  };

  const getFileTypeIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const audioExts = ["mp3", "wav", "m4a", "flac", "ogg"];
    const videoExts = ["mp4", "mkv", "avi", "mov"];

    if (audioExts.includes(ext || "")) return "🎵";
    if (videoExts.includes(ext || "")) return "🎬";
    return "📁";
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e5e7eb",
            borderTop: "4px solid #7c3aed",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <span style={{ color: "#6b7280", fontSize: "14px" }}>
          Loading your transcriptions...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          color: "#ef4444",
          backgroundColor: "#fee2e2",
          borderRadius: "12px",
          border: "1px solid #fecaca",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</div>
        <div style={{ fontWeight: "600", marginBottom: "4px" }}>
          Failed to load history
        </div>
        <div style={{ fontSize: "14px", color: "#b91c1c" }}>{error}</div>
        <button
          onClick={loadHistory}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="results-history">
      {historyItems.length === 0 ? (
        <div
          className="empty-state"
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "linear-gradient(135deg, #fefbff 0%, #f8faff 100%)",
            borderRadius: "16px",
            border: "2px dashed #ddd6fe",
          }}
        >
          <img
            src={transkriboLogo}
            alt="Transkribo"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
              marginBottom: "24px",
              opacity: "0.8",
              filter: "drop-shadow(0 4px 12px rgba(124,58,237,0.2))",
            }}
          />
          <h3
            style={{
              fontSize: "1.5em",
              fontWeight: "600",
              color: "#2c3e50",
              margin: "0 0 8px 0",
            }}
          >
            No transcriptions yet
          </h3>
          <p
            style={{
              color: "#6b7280",
              fontSize: "16px",
              margin: "0 0 24px 0",
              lineHeight: "1.5",
            }}
          >
            Click the <strong>"New Upload"</strong> button in the sidebar to get
            started with your first transcription.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              backgroundColor: "#f3e8ff",
              borderRadius: "8px",
              color: "#7c3aed",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            💡 Tip: Supports MP3, WAV, MP4, and more formats up to 1GB
          </div>
        </div>
      ) : (
        <div className="history-list">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              paddingBottom: "12px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "1.2em",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0",
              }}
            >
              Recent Transcriptions
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  padding: "4px 12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "12px",
                }}
              >
                {historyItems.length}{" "}
                {historyItems.length === 1 ? "item" : "items"}
              </span>
              <button
                onClick={loadHistory}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {historyItems.map((item, index) => (
            <div
              key={item.job_id}
              className="history-item"
              onClick={() => onSelectJob(item.job_id)}
              style={{
                padding: "20px",
                border:
                  currentJobId === item.job_id
                    ? "2px solid #7c3aed"
                    : "1px solid #e5e7eb",
                borderRadius: "12px",
                marginBottom: "12px",
                cursor: "pointer",
                backgroundColor:
                  currentJobId === item.job_id ? "#f8faff" : "white",
                transition: "all 0.2s ease",
                boxShadow:
                  currentJobId === item.job_id
                    ? "0 4px 12px rgba(124,58,237,0.15)"
                    : "0 2px 4px rgba(0,0,0,0.05)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (currentJobId !== item.job_id) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)";
                  e.currentTarget.style.borderColor = "#7c3aed";
                }
              }}
              onMouseLeave={(e) => {
                if (currentJobId !== item.job_id) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 4px rgba(0,0,0,0.05)";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }
              }}
            >
              {/* Gradient accent for active item */}
              {currentJobId === item.job_id && (
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "4px",
                    height: "100%",
                    background:
                      "linear-gradient(180deg, #7c3aed 0%, #a855f7 100%)",
                  }}
                ></div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div style={{ flex: 1 }}>
                  {/* File Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>
                      {getFileTypeIcon(item.filename)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#2c3e50",
                          fontSize: "16px",
                          marginBottom: "4px",
                        }}
                      >
                        {item.filename.length > 40
                          ? `${item.filename.substring(0, 37)}...`
                          : item.filename}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        <span>🕒 {getRelativeTime(item.processed_at)}</span>
                        <span>⏱️ {formatDuration(item.duration)}</span>
                        <span>📝 {item.word_count.toLocaleString()} words</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Preview */}
                  {item.summary_preview && (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#4b5563",
                        lineHeight: "1.4",
                        backgroundColor: "#f9fafb",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #f3f4f6",
                      }}
                    >
                      "
                      {item.summary_preview.length > 100
                        ? `${item.summary_preview.substring(0, 97)}...`
                        : item.summary_preview}
                      "
                    </div>
                  )}
                </div>

                {/* Status and Actions */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "8px",
                    minWidth: "120px",
                  }}
                >
                  {getStatusBadge(item.status)}

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      textAlign: "right",
                    }}
                  >
                    ID: {item.job_id.slice(-8)}
                  </div>

                  {currentJobId === item.job_id && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#7c3aed",
                        fontWeight: "600",
                        padding: "4px 8px",
                        backgroundColor: "#f3e8ff",
                        borderRadius: "6px",
                      }}
                    >
                      Currently viewing
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsHistory;
