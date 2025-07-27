import React, { useState, useEffect } from 'react';
import { AppState, Tab, FilterType, ProcessingState } from './types';
import { sampleTranscript } from './data/sampleData';
import { aiAPI, convertAPIResultToFrontendFormat, APIStatusResponse } from './services/api';

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

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [useRealAPI, setUseRealAPI] = useState<boolean>(true);
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  // Check API connection on mount
  useEffect(() => {
    checkAPIConnection();
  }, []);

  // Auto-load latest completed job when API is connected
  useEffect(() => {
    if (apiConnected && useRealAPI) {
      loadLatestCompletedJob();
    }
  }, [apiConnected, useRealAPI]);

  const checkAPIConnection = async () => {
    try {
      const isConnected = await aiAPI.healthCheck();
      setApiConnected(isConnected);
      if (!isConnected) {
        console.warn('AI API not available, using sample data');
        setUseRealAPI(false);
      }
    } catch (error) {
      console.error('API health check failed:', error);
      setApiConnected(false);
      setUseRealAPI(false);
    }
  };

  const loadLatestCompletedJob = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/jobs/completed');
      const data = await response.json();
      
      if (data.jobs && data.jobs.length > 0) {
        const latestJob = data.jobs[0]; // First job is the latest
        console.log('Loading latest completed job:', latestJob.job_id);
        
        // Get full result
        const resultResponse = await aiAPI.getResult(latestJob.job_id);
        if (resultResponse) {
          const convertedData = convertAPIResultToFrontendFormat(resultResponse);
          setApiData(convertedData);
          setCurrentJobId(latestJob.job_id);
          
          // Show results immediately
          setAppState(prev => ({
            ...prev,
            showUpload: false,
            showProcessing: false,
            showResults: true,
            transcript: convertedData.transcript || sampleTranscript,
            filteredTranscript: convertedData.transcript || sampleTranscript
          }));
          
          console.log('Latest job data loaded successfully');
        }
      }
    } catch (error) {
      console.error('Failed to load latest completed job:', error);
    }
  };

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
    if (appState.activeFilter !== 'All') {
      filtered = filtered.filter(item => item.speakerName == appState.activeFilter);
    }

    setAppState(prev => ({ ...prev, filteredTranscript: filtered }));
  }, [appState.searchQuery, appState.activeFilter, appState.transcript]);

  const handleFileSelect = async (file: File) => {
    setAppState(prev => ({ 
      ...prev, 
      showUpload: false, 
      showProcessing: true 
    }));

    if (useRealAPI && apiConnected) {
      await processWithRealAPI(file);
    } else {
      simulateProcessing();
    }
  };

  const processWithRealAPI = async (file: File) => {
    try {
      setProcessingState({
        isProcessing: true,
        progress: 0,
        status: 'Uploading file...'
      });

      // Upload file
      const uploadResponse = await aiAPI.uploadAndProcess(file);
      setCurrentJobId(uploadResponse.job_id);

      console.log('Upload successful:', uploadResponse);

      // Start monitoring
      setProcessingState({
        isProcessing: true,
        progress: 5,
        status: 'Processing started...'
      });

      // Wait for completion with progress updates
      const result = await aiAPI.waitForCompletion(
        uploadResponse.job_id,
        (status: APIStatusResponse) => {
          // Update progress based on status
          let progressValue = 0;
          let statusMessage = status.message || status.status;

          switch (status.status) {
            case 'pending':
              progressValue = 10;
              statusMessage = 'Queued for processing...';
              break;
            case 'preprocessing':
              progressValue = 20;
              statusMessage = 'Preprocessing audio with librosa...';
              break;
            case 'transcribing':
              progressValue = 40;
              statusMessage = 'Transcribing with Whisper AI...';
              break;
            case 'generating_summary':
              progressValue = 75;
              statusMessage = 'Generating AI summary...';
              break;
            case 'completed':
              progressValue = 100;
              statusMessage = 'Processing completed!';
              break;
          }

          setProcessingState({
            isProcessing: status.status !== 'completed',
            progress: Math.max(progressValue, status.progress),
            status: statusMessage
          });
        }
      );

      // Convert API result to frontend format
      const frontendData = convertAPIResultToFrontendFormat(result);
      setApiData(frontendData);

      // Update transcript in app state
      setAppState(prev => ({ 
        ...prev, 
        transcript: frontendData.transcript,
        filteredTranscript: frontendData.transcript,
        showProcessing: false, 
        showResults: true 
      }));

      setProcessingState({
        isProcessing: false,
        progress: 100,
        status: 'Complete'
      });

    } catch (error) {
      console.error('Processing failed:', error);
      setProcessingState({
        isProcessing: false,
        progress: 0,
        status: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      // Fall back to simulation on error
      setTimeout(() => {
        simulateProcessing();
      }, 2000);
    }
  };

  const simulateProcessing = () => {
    const processingStatuses = [
      'Uploading file...',
      'Preprocessing audio...',
      'Running speech recognition...',
      'Identifying speakers...',
      'Generating summary...',
      'Applying auto-tags...',
      'Finalizing results...'
    ];

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

  const handleFilterChange = (filter: string) => {
    setAppState(prev => ({ ...prev, activeFilter: filter }));
  };

  const handleSeekToTime = (seconds: number) => {
    // This would integrate with the audio player to seek to specific time
    console.log('Seeking to time:', seconds);
  };

  const handleRetryWithAPI = () => {
    setUseRealAPI(true);
    checkAPIConnection();
  };

  const renderTabContent = () => {
    // Pass real API data to components
    const summaryData = apiData?.summary ? {
      summary: apiData.summary.overview,
      action_items: apiData.summary.actionItems,
      key_decisions: apiData.summary.keyDecisions,
      participants: apiData.summary.participants,
      meeting_type: apiData.summary.meetingType,
      sentiment: apiData.summary.sentiment,
      duration: apiData.summary.duration,
      word_count: apiData.summary.wordCount
    } : undefined;
    
    switch (appState.activeTab) {
      case 'summary':
        return <SummaryTab summaryData={summaryData} />;
      case 'transcript':
        return (
          <>
            <TranscriptTab
              transcript={appState.filteredTranscript}
              searchQuery={appState.searchQuery}
              activeFilter={appState.activeFilter}
              participants={summaryData?.participants || []}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              onSeekToTime={handleSeekToTime}
            />
          </>
        );
      case 'analytics':
        return <AnalyticsTab />;
      default:
        return <SummaryTab summaryData={summaryData} />;
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>📄 AI Meeting Transcription</h1>
        <p>Upload audio/video → Transkrip dengan Speaker Diarization → Summary & Auto Tagging</p>
        
        {/* API Status Indicator */}
        <div className="api-status" style={{ 
          padding: '8px 12px', 
          marginTop: '10px',
          borderRadius: '6px', 
          fontSize: '14px',
          backgroundColor: apiConnected ? '#e7f5e7' : '#fff3cd',
          color: apiConnected ? '#0f5132' : '#856404',
          border: `1px solid ${apiConnected ? '#badbcc' : '#ffecb5'}`
        }}>
          {apiConnected ? (
            <>🟢 Connected to AI Backend (FFmpeg-free)</>
          ) : (
            <>
              🟡 Using Sample Data - 
              <button 
                onClick={handleRetryWithAPI}
                style={{ 
                  marginLeft: '8px', 
                  padding: '2px 8px', 
                  fontSize: '12px',
                  background: 'none',
                  border: '1px solid #856404',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Retry Connection
              </button>
            </>
          )}
        </div>
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

            {/* Show data source info */}
            {apiData && (
              <div style={{ 
                marginTop: '20px', 
                padding: '12px', 
                backgroundColor: '#e7f5e7',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#0f5132'
              }}>
                ✅ Data from AI Backend - Job ID: {currentJobId}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
