export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseTimeToSeconds = (timeString: string): number => {
  const [mins, secs] = timeString.split(':').map(Number);
  return mins * 60 + secs;
};

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const validTypes = ['audio/', 'video/'];
  if (!validTypes.some(type => file.type.startsWith(type))) {
    return { isValid: false, error: '❌ File format tidak didukung. Gunakan audio atau video file.' };
  }

  if (file.size > 100 * 1024 * 1024) { // 100MB
    return { isValid: false, error: '❌ File terlalu besar. Maksimal 100MB.' };
  }

  return { isValid: true };
};
