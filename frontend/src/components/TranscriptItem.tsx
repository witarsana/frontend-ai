import React, { useState } from "react";
import { TranscriptItem } from "../types";
import {
  parseTimeToSeconds,
  getSpeakerClass,
  formatConfidence,
} from "../utils/helpers";

interface TranscriptItemProps {
  item: TranscriptItem;
  onSeekToTime: (seconds: number) => void;
  currentTime?: number; // Current audio time to highlight active segment
}

const TranscriptItemComponent: React.FC<TranscriptItemProps> = ({
  item,
  onSeekToTime,
  currentTime = 0,
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const startSeconds = parseTimeToSeconds(item.start);
  const endSeconds = parseTimeToSeconds(item.end);
  const isActive = currentTime >= startSeconds && currentTime <= endSeconds;

  const handleTimestampClick = () => {
    setIsClicked(true);

    // Visual feedback
    setTimeout(() => setIsClicked(false), 1000);

    const startSeconds = parseTimeToSeconds(item.start);
    onSeekToTime(startSeconds);
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "#6b7280";
    if (confidence >= 0.9) return "#059669"; // Green
    if (confidence >= 0.8) return "#d97706"; // Orange
    return "#dc2626"; // Red
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const percentage = Math.round(confidence * 100);
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "2px 6px",
          borderRadius: "10px",
          backgroundColor: getConfidenceColor(confidence) + "20",
          color: getConfidenceColor(confidence),
          fontWeight: "600",
          marginLeft: "8px",
        }}
        title={`Transcription confidence: ${percentage}%`}
      >
        {percentage}%
      </span>
    );
  };

  return (
    <div className={`transcript-item ${isActive ? "active-segment" : ""}`}>
      <div className="speaker-info">
        <div className={`speaker-avatar ${getSpeakerClass(item.speakerName)}`}>
          {item.speakerName[0]}
        </div>
        <div>
          <strong>{item.speakerName}</strong>
          {getConfidenceBadge(item.confidence)}
          <span
            className={`timestamp ${isClicked ? "clicked" : ""} ${
              isActive ? "playing" : ""
            }`}
            onClick={handleTimestampClick}
            title="Click to jump to this time in audio"
          >
            {isActive ? "🔊" : "🎵"} {item.start} - {item.end}
          </span>
        </div>
      </div>
      <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>{item.text}</p>
      <div className="tags">
        {item.tags &&
          item.tags.map((tag, index) => (
            <span key={index} className={`tag ${tag}`}>
              #{tag.replace("-", "")}
            </span>
          ))}
        {item.id !== undefined && (
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "10px",
              backgroundColor: "#f3f4f6",
              color: "#6b7280",
              fontWeight: "600",
              marginLeft: "8px",
            }}
            title="Segment ID"
          >
            #{item.id}
          </span>
        )}
        {item.confidence && (
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "10px",
              backgroundColor: "#fef3c7",
              color: "#d97706",
              fontWeight: "600",
            }}
            title={`Transcription accuracy: ${formatConfidence(
              item.confidence
            )}`}
          >
            {formatConfidence(item.confidence)}
          </span>
        )}
      </div>
    </div>
  );
};

export default TranscriptItemComponent;
