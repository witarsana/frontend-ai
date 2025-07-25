import React, { useState, useEffect } from 'react';
import { AppState, Tab, FilterType, ProcessingState } from './types';
import { sampleTranscript, processingStatuses } from './data/sampleData';

import UploadSection from './components/UploadSection';
import ProcessingSection from './components/ProcessingSection';
import AudioPlayer from './components/AudioPlayer';
import SummaryTab from './components/SummaryTab';
import TranscriptTab from './components/TranscriptTab';
import AnalyticsTab from './components/AnalyticsTab';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    showUpload: true,
    showProcessing: false,
    showResults: false,
    activeTab: 'summary',
    searchQuery: '',
    activeFilter: 'all',
    transcript: sampleTranscript,
    filteredTranscript: sampleTranscript
  });

  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    status: ''
  });

  // Filter transcript based on search and filter
  useEffect(() => {
    let filtered = appState.transcript;

    // Apply search filter
    if (appState.searchQuery) {
      filtered = filtered.filter(item => 
        item.text.toLowerCase().includes(appState.searchQuery.toLowerCase()) || 
        item.speakerName.toLowerCase().includes(appState.searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (appState.activeFilter !== 'all') {
      if (appState.activeFilter.startsWith('speaker-')) {
        filtered = filtered.filter(item => item.speaker === appState.activeFilter);
      } else {
        filtered = filtered.filter(item => item.tags.includes(appState.activeFilter));
      }
    }

    setAppState(prev => ({ ...prev, filteredTranscript: filtered }));
  }, [appState.searchQuery, appState.activeFilter, appState.transcript]);

  const handleFileSelect = (_file: File) => {
    setAppState(prev => ({ 
      ...prev, 
      showUpload: false, 
      showProcessing: true 
    }));
    simulateProcessing();
  };

  const simulateProcessing = () => {
    setProcessingState({
      isProcessing: true,
      progress: 0,
      status: processingStatuses[0]
    });

    let currentStep = 0;
    const interval = setInterval(() => {
      const progress = ((currentStep + 1) / processingStatuses.length) * 100;
      
      setProcessingState({
        isProcessing: true,
        progress: Math.round(progress),
        status: processingStatuses[currentStep]
      });

      currentStep++;

      if (currentStep >= processingStatuses.length) {
        clearInterval(interval);
        setTimeout(() => {
          setProcessingState({
            isProcessing: false,
            progress: 100,
            status: 'Complete'
          });
          setAppState(prev => ({ 
            ...prev, 
            showProcessing: false, 
            showResults: true 
          }));
        }, 1000);
      }
    }, 1500);
  };

  const handleTabChange = (tab: Tab) => {
    setAppState(prev => ({ ...prev, activeTab: tab }));
  };

  const handleSearchChange = (query: string) => {
    setAppState(prev => ({ ...prev, searchQuery: query }));
  };

  const handleFilterChange = (filter: FilterType) => {
    setAppState(prev => ({ ...prev, activeFilter: filter }));
  };

  const handleSeekToTime = (seconds: number) => {
    // This would integrate with the audio player to seek to specific time
    console.log('Seeking to time:', seconds);
  };

  const renderTabContent = () => {
    switch (appState.activeTab) {
      case 'summary':
        return <SummaryTab />;
      case 'transcript':
        return (
          <TranscriptTab
            transcript={appState.filteredTranscript}
            searchQuery={appState.searchQuery}
            activeFilter={appState.activeFilter}
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            onSeekToTime={handleSeekToTime}
          />
        );
      case 'analytics':
        return <AnalyticsTab />;
      default:
        return <SummaryTab />;
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>📄 AI Meeting Transcription</h1>
        <p>Upload audio/video → Transkrip dengan Speaker Diarization → Summary & Auto Tagging</p>
      </div>

      <div className="main-content">
        {appState.showUpload && (
          <UploadSection onFileSelect={handleFileSelect} />
        )}

        <ProcessingSection processingState={processingState} />

        {appState.showResults && (
          <div className="results active">
            <AudioPlayer onSeekToTime={handleSeekToTime} />

            <div className="tabs">
              <button 
                className={`tab ${appState.activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => handleTabChange('summary')}
              >
                📋 Summary
              </button>
              <button 
                className={`tab ${appState.activeTab === 'transcript' ? 'active' : ''}`}
                onClick={() => handleTabChange('transcript')}
              >
                📝 Transcript
              </button>
              <button 
                className={`tab ${appState.activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => handleTabChange('analytics')}
              >
                📊 Analytics
              </button>
            </div>

            {renderTabContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
