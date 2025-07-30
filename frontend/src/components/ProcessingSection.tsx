import React from "react";
import { ProcessingState } from "../types";

interface ProcessingSectionProps {
  processingState: ProcessingState;
}

const ProcessingSection: React.FC<ProcessingSectionProps> = ({
  processingState,
}) => {
  if (!processingState.isProcessing && !processingState.error) {
    return null;
  }

  // Error state display
  if (processingState.error) {
    const getErrorIcon = (type?: string) => {
      switch (type) {
        case "quota_exceeded":
          return "💳";
        case "connection_error":
          return "🌐";
        case "api_error":
          return "⚠️";
        default:
          return "❌";
      }
    };

    const getErrorColor = (type?: string) => {
      switch (type) {
        case "quota_exceeded":
          return "#dc2626";
        case "connection_error":
          return "#ea580c";
        case "api_error":
          return "#d97706";
        default:
          return "#dc2626";
      }
    };

    const getErrorTitle = (type?: string) => {
      switch (type) {
        case "quota_exceeded":
          return "API Quota Exceeded";
        case "connection_error":
          return "Connection Error";
        case "api_error":
          return "API Error";
        default:
          return "Processing Error";
      }
    };

    const getErrorSuggestion = (type?: string) => {
      switch (type) {
        case "quota_exceeded":
          return "Check your OpenAI account billing and usage limits. You may need to upgrade your plan or wait for quota reset.";
        case "connection_error":
          return "Check your internet connection and try again. The API service might be temporarily unavailable.";
        case "api_error":
          return "There was an issue with the AI service. Please try again or contact support if the problem persists.";
        default:
          return "Please try uploading your file again. If the problem continues, contact support.";
      }
    };

    return (
      <div
        className="processing error-state"
        style={{ backgroundColor: "#fee2e2", border: "2px solid #fecaca" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "15px",
            color: getErrorColor(processingState.error.type),
          }}
        >
          <span style={{ fontSize: "24px", marginRight: "12px" }}>
            {getErrorIcon(processingState.error.type)}
          </span>
          <h3
            style={{
              margin: 0,
              color: getErrorColor(processingState.error.type),
            }}
          >
            {getErrorTitle(processingState.error.type)}
          </h3>
        </div>

        <div
          style={{
            marginBottom: "15px",
            padding: "12px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px 0",
              fontWeight: "bold",
              color: getErrorColor(processingState.error.type),
            }}
          >
            {processingState.error.message}
          </p>

          {processingState.error.details && (
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "14px",
                color: "#7f1d1d",
                fontFamily: "monospace",
                backgroundColor: "#fee2e2",
                padding: "8px",
                borderRadius: "4px",
              }}
            >
              {processingState.error.details}
            </p>
          )}

          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#7f1d1d",
              lineHeight: "1.4",
            }}
          >
            💡 <strong>Suggestion:</strong>{" "}
            {getErrorSuggestion(processingState.error.type)}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "15px",
          }}
        >
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: getErrorColor(processingState.error.type),
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Normal processing state display
  return (
    <div className="processing active">
      <div className="spinner"></div>
      <h3>⚙️ AI sedang memproses...</h3>
      <p>{processingState.status}</p>

      {/* Auto-fallback notification */}
      {processingState.autoFallback && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "18px", marginRight: "8px" }}>🚀</span>
            <strong style={{ color: "#92400e" }}>Engine Auto-Switch</strong>
          </div>
          <p
            style={{ margin: "0 0 8px 0", color: "#92400e", lineHeight: "1.4" }}
          >
            {processingState.autoFallback.message}
          </p>
          {processingState.autoFallback.details && (
            <div
              style={{
                fontSize: "12px",
                color: "#78350f",
                marginBottom: "8px",
              }}
            >
              <div>
                📊 File: {processingState.autoFallback.details.file_size_mb}MB,{" "}
                {processingState.autoFallback.details.duration_minutes} min
              </div>
              <div>
                ⚡ Limits: {processingState.autoFallback.details.max_size_mb}MB,{" "}
                {processingState.autoFallback.details.max_duration_min} min
              </div>
            </div>
          )}
          {processingState.autoFallback.recommendation && (
            <div
              style={{
                fontSize: "12px",
                color: "#059669",
                fontStyle: "italic",
              }}
            >
              💡 {processingState.autoFallback.recommendation}
            </div>
          )}
        </div>
      )}

      {/* Timeout fallback notification */}
      {processingState.timeoutFallback && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            backgroundColor: "#fecaca",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "18px", marginRight: "8px" }}>🔄</span>
            <strong style={{ color: "#dc2626" }}>Timeout Fallback</strong>
          </div>
          <p style={{ margin: "0", color: "#dc2626", lineHeight: "1.4" }}>
            {processingState.timeoutFallback.message}
          </p>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <div
          style={{ background: "#e2e8f0", height: "6px", borderRadius: "3px" }}
        >
          <div
            style={{
              background: "#4facfe",
              height: "100%",
              width: `${processingState.progress}%`,
              borderRadius: "3px",
              transition: "width 0.5s",
            }}
          />
        </div>
        <p style={{ marginTop: "10px", color: "#6b7280" }}>
          {Math.round(processingState.progress)}%
        </p>
      </div>
    </div>
  );
};

export default ProcessingSection;
