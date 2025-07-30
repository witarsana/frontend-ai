import React, { useState, useEffect } from "react";
import { ProcessingState } from "./types";
import { aiAPI, EngineAPI } from "./services/api";
import newLogoTranskribo from "./assets/new-logo-transkribo.png";

import UploadSection from "./components/UploadSection";
import SessionTranscriptionCard from "./components/SessionTranscriptionCard";

const App: React.FC = () => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    status: "",
  });

  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [sessionTranscriptions, setSessionTranscriptions] = useState<any[]>([]);

  // Check API connection on mount
  useEffect(() => {
    checkAPIConnection();
  }, []);

  const checkAPIConnection = async () => {
    try {
      const isConnected = await aiAPI.healthCheck();
      setApiConnected(isConnected);
      if (!isConnected) {
        console.warn("AI API not available, using sample data");
      }
    } catch (error) {
      console.error("API health check failed:", error);
      setApiConnected(false);
    }
  };

  const handleFileSelect = async (
    file: File,
    options?: { language?: string; engine?: string }
  ) => {
    console.log("File selected:", file.name, "Size:", file.size);
    console.log("Upload options:", options);

    // Add file to session transcriptions immediately with processing status
    const newTranscription = {
      id: Date.now().toString(),
      filename: file.name,
      status: "processing" as const,
      uploadTime: new Date(),
      text: "",
      duration: null,
    };

    setSessionTranscriptions((prev) => [newTranscription, ...prev]);

    // Use real API if connected, otherwise simulate
    if (apiConnected) {
      try {
        await processFileWithAPI(newTranscription.id, file, options);
      } catch (error) {
        console.error("API processing failed:", error);

        // Extract error information if available
        const errorInfo = (error as any).errorInfo || {
          message: error instanceof Error ? error.message : "Upload failed",
          type: "general_error",
        };

        // Set processing state to show error
        setProcessingState({
          isProcessing: false,
          progress: 0,
          status: "Error",
          error: {
            message: errorInfo.message,
            type: errorInfo.type,
            details: errorInfo.details,
          },
        });

        // Update transcription to error state
        setSessionTranscriptions((prev) =>
          prev.map((t) =>
            t.id === newTranscription.id
              ? { ...t, status: "error" as const }
              : t
          )
        );
      }
    } else {
      // Fall back to simulation
      simulateProcessing(newTranscription.id, file);
    }
  };

  const processFileWithAPI = async (
    transcriptionId: string,
    file: File,
    options?: { language?: string; engine?: string }
  ) => {
    try {
      // Set engine if specified
      if (options?.engine) {
        const engineAPI = new EngineAPI();
        await engineAPI.setEngine(
          options.engine as "faster-whisper" | "deepgram"
        );
      }

      // Upload and start processing
      const uploadResponse = await aiAPI.uploadAndProcess(file);
      console.log("Upload response:", uploadResponse);

      // Poll for status updates with progress callback
      const result = await aiAPI.waitForCompletion(
        uploadResponse.job_id,
        (status) => {
          // Update processing state for visual feedback
          setProcessingState({
            isProcessing: true,
            progress: status.progress,
            status: status.message || `Status: ${status.status}`,
          });
        }
      );

      console.log("Processing result:", result);

      // Update transcription with real results
      setSessionTranscriptions((prev) =>
        prev.map((t) =>
          t.id === transcriptionId
            ? {
                ...t,
                status: "completed" as const,
                text: result.transcript
                  ? result.transcript.map((seg) => seg.text).join(" ")
                  : "No transcript available",
                duration: result.duration || null,
              }
            : t
        )
      );

      // Reset processing state
      setProcessingState({
        isProcessing: false,
        progress: 100,
        status: "Complete",
      });
    } catch (error) {
      console.error("Real API processing failed:", error);

      // Extract error information if available
      const errorInfo = (error as any).errorInfo || {
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        type: "general_error",
      };

      // Set processing state to show error
      setProcessingState({
        isProcessing: false,
        progress: 0,
        status: "Error",
        error: {
          message: errorInfo.message,
          type: errorInfo.type,
          details: errorInfo.details,
        },
      });

      // Update transcription to error state
      setSessionTranscriptions((prev) =>
        prev.map((t) =>
          t.id === transcriptionId ? { ...t, status: "error" as const } : t
        )
      );
    }
  };

  const simulateProcessing = async (transcriptionId: string, file: File) => {
    const processingStatuses = [
      "Uploading file...",
      "Converting audio...",
      "Transcribing speech...",
      "Identifying speakers...",
      "Generating summary...",
      "Applying auto-tags...",
      "Finalizing results...",
    ];

    setProcessingState({
      isProcessing: true,
      progress: 0,
      status: processingStatuses[0],
    });

    let currentStep = 0;
    const interval = setInterval(() => {
      const progress = ((currentStep + 1) / processingStatuses.length) * 100;

      setProcessingState({
        isProcessing: true,
        progress: Math.round(progress),
        status: processingStatuses[currentStep],
      });

      currentStep++;

      if (currentStep >= processingStatuses.length) {
        clearInterval(interval);
        setTimeout(() => {
          setProcessingState({
            isProcessing: false,
            progress: 100,
            status: "Complete",
          });

          // Update the transcription with completed data
          const sampleText = `This is a sample transcription for ${file.name}. 

In a real application, this would contain the actual transcribed text from your audio or video file. The AI would have processed the speech, identified different speakers, and provided accurate timestamps.

Key points discussed:
- Important topic 1
- Decision made on topic 2  
- Action items assigned
- Next meeting scheduled

This demonstrates how transcriptions will appear in your session feed once processing is complete.`;

          setSessionTranscriptions((prev) =>
            prev.map((t) =>
              t.id === transcriptionId
                ? {
                    ...t,
                    status: "completed" as const,
                    text: sampleText,
                    duration: 180,
                  }
                : t
            )
          );
        }, 1000);
      }
    }, 1500);
  };

  // Session transcription handlers
  const copyTranscriptionText = (id: string) => {
    const transcription = sessionTranscriptions.find((t) => t.id === id);
    if (transcription) {
      navigator.clipboard.writeText(transcription.text);
      // Could add toast notification here
    }
  };

  const downloadTranscription = (id: string) => {
    const transcription = sessionTranscriptions.find((t) => t.id === id);
    if (transcription) {
      const blob = new Blob([transcription.text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${transcription.filename}_transcript.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const clearTranscription = (id: string) => {
    setSessionTranscriptions((prev) => prev.filter((t) => t.id !== id));
  };

  const viewTranscriptionDetails = (id: string) => {
    // Could navigate to detailed view or expand card
    console.log("View details for:", id);
  };

  return (
    <div className="two-panel-workspace">
      {/* Left Panel - Control Center */}
      <div className="control-panel">
        {/* Brand Header */}
        <div className="brand-header">
          <img
            src={newLogoTranskribo}
            alt="Transkribo Mascot"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
              marginBottom: "8px",
              display: "block",
              margin: "0 auto 8px auto",
            }}
          />
          <h1
            style={{
              fontSize: "2.2em",
              fontWeight: "700",
              color: "#2c3e50",
              margin: "0 0 4px 0",
              textAlign: "center",
              letterSpacing: "-0.5px",
            }}
          >
            Transkribo
          </h1>
          <p
            style={{
              fontSize: "1.1em",
              color: "#7c3aed",
              fontStyle: "italic",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              margin: "0 0 16px 0",
              textAlign: "center",
              lineHeight: "1.3",
            }}
          >
            Because good meetings aren't good enough
          </p>
        </div>

        {/* Upload Section */}
        <div className="uploader-section">
          <UploadSection onFileSelect={handleFileSelect} />
        </div>

        {/* API Status */}
        <div
          className="api-status-mini"
          style={{
            marginTop: "16px",
            padding: "10px",
            textAlign: "center",
            fontSize: "11px",
            color: apiConnected ? "#7c3aed" : "#d97706",
            backgroundColor: apiConnected ? "#f3e8ff" : "#fef3c7",
            borderRadius: "8px",
            border: `1px solid ${apiConnected ? "#ddd6fe" : "#fde68a"}`,
          }}
        >
          <span style={{ fontSize: "10px", marginRight: "6px" }}>
            {apiConnected ? "🟢" : "🟡"}
          </span>
          {apiConnected ? "API Connected" : "Sample Mode"}
        </div>
      </div>

      {/* Right Panel - Session Feed */}
      <div className="session-feed">
        {/* Only show session header if there are transcriptions */}
        {sessionTranscriptions.length > 0 && (
          <div className="session-header">
            <h2
              style={{
                fontSize: "1.5em",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0 0 8px 0",
              }}
            >
              Current Session
            </h2>
            <p
              style={{
                color: "#6b7280",
                margin: "0 0 24px 0",
                fontSize: "14px",
              }}
            >
              Your transcriptions from this session will appear here
            </p>
          </div>
        )}

        {/* Session Content */}
        {sessionTranscriptions.length === 0 && !processingState.isProcessing ? (
          <div className="session-empty-state">
            <h3
              style={{
                fontSize: "1.4em",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0 0 12px 0",
                textAlign: "center",
              }}
            >
              Ready to transcribe!
            </h3>
            <p
              style={{
                color: "#6b7280",
                fontSize: "16px",
                lineHeight: "1.5",
                textAlign: "center",
                maxWidth: "400px",
                margin: "0 auto 20px auto",
              }}
            >
              Drop an audio or video file to the left to get started. Your
              transcriptions will appear here as cards that you can copy,
              download, or clear.
            </p>
            <div
              style={{
                marginTop: "20px",
                padding: "12px 16px",
                backgroundColor: "#f3e8ff",
                borderRadius: "8px",
                color: "#7c3aed",
                fontSize: "14px",
                fontWeight: "500",
                textAlign: "center",
                maxWidth: "400px",
                margin: "0 auto",
              }}
            >
              💡 Supports MP3, WAV, MP4, MOV and more - up to 1GB
            </div>
          </div>
        ) : (
          <div className="session-cards">
            {sessionTranscriptions.map((transcription) => (
              <SessionTranscriptionCard
                key={transcription.id}
                transcription={transcription}
                onCopy={() => copyTranscriptionText(transcription.id)}
                onDownload={() => downloadTranscription(transcription.id)}
                onClear={() => clearTranscription(transcription.id)}
                onViewDetails={() => viewTranscriptionDetails(transcription.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
