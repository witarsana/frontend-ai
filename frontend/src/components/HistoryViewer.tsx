import React, { useState } from 'react';
import HistorySelector from './HistorySelector';
import HistoryDetailViewer from './HistoryDetailViewer';

interface CompletedJob {
  job_id: string;
  filename: string;
  duration: number;
  word_count: number;
  processed_at: string;
  summary_preview?: string;
}

const HistoryViewer: React.FC = () => {
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);

  const handleSelectHistory = (jobId: string, jobInfo: CompletedJob) => {
    console.log('Selected job:', jobId);
    setSelectedJob(jobInfo);
  };

  const handleBackToHistory = () => {
    setSelectedJob(null);
  };

  // Jika ada job yang dipilih, tampilkan HistoryDetailViewer
  if (selectedJob) {
    return (
      <HistoryDetailViewer 
        selectedJob={selectedJob}
        onBackToHistory={handleBackToHistory}
      />
    );
  }

  // Jika belum ada job yang dipilih, tampilkan HistorySelector
  return (
    <HistorySelector onSelectHistory={handleSelectHistory} />
  );
};

export default HistoryViewer;
