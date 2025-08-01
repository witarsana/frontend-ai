export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const formatDuration = (timeString: string): string => {
  // Parse various time formats and return a human-readable duration
  const seconds = parseTimeToSeconds(timeString);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const getSpeakerClass = (speakerName: string): string => {
  // Generate consistent speaker classes based on speaker name
  const hash = speakerName.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const speakerIndex = (Math.abs(hash) % 4) + 1;
  return `speaker-${speakerIndex}`;
};

export const formatConfidence = (confidence?: number): string => {
  if (!confidence) return "N/A";
  return `${Math.round(confidence * 100)}%`;
};

export const parseTimeToSeconds = (timeString: string): number => {
  try {
    // Handle different time formats: "MM:SS", "H:MM:SS", "M:SS.MS", or just number string
    const cleanTime = timeString.split(" ")[0]; // Remove any extra text after space

    // If it's just a number string (like "2.9" from API), convert directly
    if (!cleanTime.includes(":")) {
      const seconds = parseFloat(cleanTime) || 0;
      return Math.floor(seconds);
    }

    const parts = cleanTime.split(":");

    if (parts.length === 2) {
      // MM:SS format
      const [mins, secs] = parts.map((str) => parseFloat(str) || 0);
      const totalSeconds = Math.floor(mins * 60 + secs);
      return totalSeconds;
    } else if (parts.length === 3) {
      // H:MM:SS format
      const [hours, mins, secs] = parts.map((str) => parseFloat(str) || 0);
      const totalSeconds = Math.floor(hours * 3600 + mins * 60 + secs);
      return totalSeconds;
    }

    // Fallback: assume it's just seconds
    const fallbackSeconds = Math.floor(parseFloat(timeString) || 0);
    return fallbackSeconds;
  } catch (error) {
    console.warn("Error parsing time string:", timeString, error);
    return 0;
  }
};

export const validateFile = (
  file: File
): { isValid: boolean; error?: string } => {
  const validTypes = ["audio/", "video/"];
  if (!validTypes.some((type) => file.type.startsWith(type))) {
    return {
      isValid: false,
      error: "❌ File format tidak didukung. Gunakan audio atau video file.",
    };
  }

  if (file.size > 1024 * 1024 * 1024) {
    // 1GB to match backend
    return { isValid: false, error: "❌ File terlalu besar. Maksimal 1GB." };
  }

  return { isValid: true };
};
