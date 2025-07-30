import React from "react";

interface SessionTranscriptionCardProps {
  transcription: {
    id: string;
    filename: string;
    status: "processing" | "completed" | "error";
    uploadTime: Date;
    text: string;
    duration?: number | null;
  };
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
  onViewDetails: () => void;
}

export const SessionTranscriptionCard: React.FC<
  SessionTranscriptionCardProps
> = ({ transcription, onCopy, onDownload, onClear, onViewDetails }) => {
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

      {/* Content Area */}
      {transcription.status === "completed" && transcription.text && (
        <div
          style={{
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#7c3aed";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f3e8ff";
              e.currentTarget.style.color = "#7c3aed";
            }}
          >
            📋 Copy Text
          </button>

          <button
            onClick={onDownload}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f0f9ff",
              color: "#0369a1",
              border: "1px solid #bae6fd",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0369a1";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f9ff";
              e.currentTarget.style.color = "#0369a1";
            }}
          >
            💾 Download
          </button>

          <button
            onClick={onClear}
            style={{
              padding: "8px 16px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#fef2f2";
              e.currentTarget.style.color = "#dc2626";
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
