import React, { useState, useEffect, useCallback } from "react";
import { aiAPI, EngineAPI, TranscriptionEngine } from "./services/api";
import newLogoTranskribo from "./assets/new-logo-transkribo.png";

import UploadSection from "./components/UploadSection";
import RecordingSection from "./components/RecordingSection";
import HistoryViewer from "./components/HistoryViewer";
import ProcessingPage from "./components/ProcessingPage";
import JobHistoryManager from "./components/JobHistoryManager";

const App: React.FC = () => {
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [sessionTranscriptions, setSessionTranscriptions] = useState<any[]>([]);
  const [completedJobIds, setCompletedJobIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'upload' | 'recording' | 'history' | 'processing'>('upload');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  // Check API connection on mount
  useEffect(() => {
    checkAPIConnection();
    loadActiveJobs(); // Load active jobs from localStorage
  }, []);

  // Load active jobs from localStorage
  const loadActiveJobs = () => {
    try {
      const storedJobs = localStorage.getItem('activeJobs');
      if (storedJobs) {
        const jobs = JSON.parse(storedJobs);
        // Filter out jobs older than 2 hours
        const maxAge = 2 * 60 * 60 * 1000; // 2 hours
        const validJobs = jobs.filter((job: any) => 
          Date.now() - job.timestamp < maxAge
        );
        setActiveJobs(validJobs);
        
        // Clean up localStorage if we removed any expired jobs
        if (validJobs.length !== jobs.length) {
          localStorage.setItem('activeJobs', JSON.stringify(validJobs));
        }
      }
    } catch (error) {
      console.error('Error loading active jobs:', error);
      setActiveJobs([]);
    }
  };

  // Add job to active jobs list
  const addActiveJob = (jobId: string, filename: string, status: string = 'initializing') => {
    const newJob = {
      jobId,
      filename,
      status,
      progress: 0,
      timestamp: Date.now(),
      startTime: new Date(),
    };
    
    setActiveJobs(prev => {
      const filtered = prev.filter(job => job.jobId !== jobId); // Remove if exists
      const updated = [newJob, ...filtered];
      localStorage.setItem('activeJobs', JSON.stringify(updated));
      return updated;
    });
  };

  // Update job status in active jobs list
  const updateActiveJob = (jobId: string, updates: any) => {
    setActiveJobs(prev => {
      const updated = prev.map(job => 
        job.jobId === jobId ? { ...job, ...updates } : job
      );
      localStorage.setItem('activeJobs', JSON.stringify(updated));
      return updated;
    });
  };

  // Remove job from active jobs list
  const removeActiveJob = (jobId: string) => {
    setActiveJobs(prev => {
      const updated = prev.filter(job => job.jobId !== jobId);
      localStorage.setItem('activeJobs', JSON.stringify(updated));
      return updated;
    });
  };

  // Get filename from jobId
  const getFilenameFromJobId = (jobId: string): string => {
    const job = activeJobs.find(job => job.jobId === jobId);
    return job?.filename || 'Unknown File';
  };

  // Auto-resume job when API connection is established
  useEffect(() => {
    if (apiConnected) {
      checkAndResumeJob();
    }
  }, [apiConnected]);

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

  // Auto-resume functionality - check for ongoing jobs and continue monitoring
  const checkAndResumeJob = useCallback(async () => {
    try {
      const storedJob = localStorage.getItem('currentProcessingJob');
      if (!storedJob) return;

      const job = JSON.parse(storedJob);
      
      // Check if job is not too old (max 2 hours)
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours
      if (Date.now() - job.timestamp > maxAge) {
        localStorage.removeItem('currentProcessingJob');
        // Also clean up any old progress data
        localStorage.removeItem(`job_progress_${job.jobId}`);
        return;
      }

      // Check if we're connected to API
      if (apiConnected) {
        try {
          // Try to get job status to see if it's still valid
          const status = await aiAPI.getStatus(job.jobId);
          
          // If job is still processing, auto-resume
          if (status.status === 'transcribing' || status.status === 'preprocessing' || status.status === 'generating_summary' || status.status === 'pending') {
            console.log('🔄 Auto-resuming job:', job.jobId, 'Status:', status.status, 'Progress:', status.progress + '%');
            setCurrentJobId(job.jobId);
            setViewMode('processing');
          } else if (status.status === 'completed' || status.status === 'error') {
            // Job is done, clean up
            console.log('🧹 Cleaning up completed job:', job.jobId, 'Status:', status.status);
            localStorage.removeItem('currentProcessingJob');
            localStorage.removeItem(`job_progress_${job.jobId}`);
          }
        } catch (error) {
          // Job might not exist anymore
          console.log('🗑️ Stored job no longer exists, cleaning up');
          localStorage.removeItem('currentProcessingJob');
          localStorage.removeItem(`job_progress_${job.jobId}`);
        }
      } else {
        // If we're not connected to API but have saved progress, still show it
        const savedProgress = localStorage.getItem(`job_progress_${job.jobId}`);
        if (savedProgress) {
          console.log('📶 API not connected but showing saved progress for:', job.jobId);
          setCurrentJobId(job.jobId);
          setViewMode('processing');
        }
      }
    } catch (error) {
      console.error('Error checking for resumable job:', error);
    }
  }, [apiConnected]);

  // Listen for localStorage changes to sync processing state across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentProcessingJob') {
        if (e.newValue) {
          // New processing job started in another tab
          const job = JSON.parse(e.newValue);
          console.log('Processing job detected from another tab:', job.jobId);
          setCurrentJobId(job.jobId);
          setViewMode('processing');
        } else {
          // Processing job removed (completed/cancelled)
          console.log('Processing job removed from another tab');
          // Don't automatically switch back to avoid interrupting user
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Periodic check for localStorage changes (for same tab resume)
  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode !== 'processing') {
        checkAndResumeJob();
      }
      // Update active jobs status
      updateActiveJobsStatus();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [apiConnected, viewMode, checkAndResumeJob]);

  // Update status of all active jobs
  const updateActiveJobsStatus = async () => {
    if (!apiConnected || activeJobs.length === 0) return;

    for (const job of activeJobs) {
      try {
        const status = await aiAPI.getStatus(job.jobId);
        
        // Update job status
        updateActiveJob(job.jobId, {
          status: status.status,
          progress: status.progress || 0,
          lastUpdated: Date.now()
        });
        
        // Remove completed or errored jobs
        if (status.status === 'completed' || status.status === 'error') {
          setTimeout(() => removeActiveJob(job.jobId), 2000); // Remove after 2 seconds to show final status
        }
      } catch (error) {
        // Job might not exist anymore, remove it
        console.log(`Job ${job.jobId} no longer exists, removing from active jobs`);
        removeActiveJob(job.jobId);
      }
    }
  };

  const handleFileSelect = async (
    file: File,
    options?: { 
      language?: string; 
      engine?: string; 
      speed?: string; 
      speakerMethod?: string;
      enableSpeedProcessing?: boolean;
      enableSpeakerDetection?: boolean;
    }
  ) => {
    console.log("File selected:", file.name, "Size:", file.size);
    console.log("Upload options:", options);

    // Use real API if connected
    if (apiConnected) {
      try {
        // Set engine if specified
        if (options?.engine) {
          const engineAPI = new EngineAPI();
          await engineAPI.setEngine(
            options.engine as "faster-whisper" | "deepgram"
          );
        }

        // Upload and start processing with engine preference and toggle states
        const uploadResponse = await aiAPI.uploadAndProcess(file, {
          engine: options?.engine as TranscriptionEngine,
          language: options?.language,
          speed: options?.speed,
          speakerMethod: options?.speakerMethod,
          enableSpeedProcessing: options?.enableSpeedProcessing,
          enableSpeakerDetection: options?.enableSpeakerDetection,
        });
        
        console.log("Upload response:", uploadResponse);
        
        // Add to active jobs list
        addActiveJob(uploadResponse.job_id, file.name, 'pending');
        
        // Set current job ID and switch to processing view
        setCurrentJobId(uploadResponse.job_id);
        setViewMode('processing');

      } catch (error) {
        console.error("API upload failed:", error);
        // Fall back to simulation
        simulateProcessing(file);
      }
    } else {
      // Fall back to simulation
      simulateProcessing(file);
    }
  };

  const handleRecordingComplete = async (
    audioBlob: Blob,
    options?: { language?: string; engine?: string }
  ) => {
    // Convert blob to File object
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording_${timestamp}.webm`;
    const file = new File([audioBlob], filename, { type: 'audio/webm' });
    
    console.log("Recording completed:", filename, "Size:", file.size);
    console.log("Recording options:", options);

    // Use the same flow as file upload
    await handleFileSelect(file, options);
  };

  const simulateProcessing = async (file: File) => {
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
    
    // Simulate processing with fake job ID
    const fakeJobId = `sim_${Date.now()}`;
    
    // Add to active jobs list
    addActiveJob(fakeJobId, file.name, 'initializing');
    
    setCurrentJobId(fakeJobId);
    setViewMode('processing');
  };

  const handleProcessingComplete = async (result: any) => {
    console.log("Processing completed:", result);
    
    // Prevent duplicate completion handling
    const jobId = currentJobId || result.job_id || Date.now().toString();
    
    if (completedJobIds.has(jobId)) {
      console.log('🔄 Job already completed, skipping duplicate:', jobId);
      return;
    }
    
    // Mark job as completed
    setCompletedJobIds(prev => new Set([...prev, jobId]));
    
    // Remove from active jobs list
    if (currentJobId) {
      removeActiveJob(currentJobId);
    }
    
    // Add completed transcription to session
    const newTranscription = {
      id: jobId,
      filename: result.filename || "Unknown",
      status: "completed" as const,
      uploadTime: new Date(),
      text: result.transcript ? result.transcript.map((seg: any) => seg.text).join(" ") : "No transcript available",
      segments: result.transcript || [],
      summary: result.summary || null,
      // actionItems: REMOVED - No longer using basic action items feature
      enhancedActionItems: result.enhanced_action_items || [], // Keep enhanced action items - this is the better feature
      keyDecisions: result.enhanced_key_decisions || result.key_decisions || [],
      sentiment: result.sentiment || null,
      participants: result.speakers || [],
      duration: result.duration || null,
      fullResult: result,
      // Add experimental speaker data if available
      experimentalSpeakerData: result.experimental_speaker_data || null,
      audioInfo: result.audio_info || null,
      detectedSpeakers: result.detected_speakers || null,
    };

    console.log('✅ Added completed job to session:', jobId, result.filename);
    setSessionTranscriptions((prev) => [newTranscription, ...prev]);
    
    // Reset and go back to upload view
    setCurrentJobId(null);
    setViewMode('upload');
  };

  const handleProcessingError = (error: any) => {
    console.error("Processing error:", error);
    
    // Remove from active jobs list
    if (currentJobId) {
      removeActiveJob(currentJobId);
    }
    
    // Go back to upload view on error
    setViewMode('upload');
    setCurrentJobId(null);
  };  const handleBackToUpload = () => {
    setCurrentJobId(null);
    setViewMode('upload');
  };

  const handleViewResults = (jobId: string, filename: string) => {
    console.log(`🔍 Viewing results for job: ${jobId} (${filename})`);
    setViewMode('history');
    // The HistoryViewer will auto-select the job when it loads
  };

  return (
    <div className="two-panel-workspace" style={{position: 'relative'}}>
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
        {/* Mode Toggle Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '4px',
            border: '1px solid #e0e0e0'
          }}>
            <button
              onClick={() => setViewMode('upload')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: viewMode === 'upload' ? '#007acc' : 'transparent',
                color: viewMode === 'upload' ? 'white' : '#666',
                transition: 'all 0.2s ease'
              }}
            >
              📤 Upload File
            </button>
            <button
              onClick={() => setViewMode('recording')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: viewMode === 'recording' ? '#007acc' : 'transparent',
                color: viewMode === 'recording' ? 'white' : '#666',
                transition: 'all 0.2s ease'
              }}
            >
              🎙️ Record Audio
            </button>
            <button
              onClick={() => setViewMode('history')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: viewMode === 'history' ? '#007acc' : 'transparent',
                color: viewMode === 'history' ? 'white' : '#666',
                transition: 'all 0.2s ease'
              }}
            >
              📋 History
            </button>
          </div>
        </div>

        {/* Conditional Content */}
        {viewMode === 'processing' && currentJobId ? (
          <ProcessingPage 
            jobId={currentJobId}
            filename={getFilenameFromJobId(currentJobId)}
            onComplete={handleProcessingComplete}
            onError={handleProcessingError}
            onBack={handleBackToUpload}
            onViewResults={handleViewResults}
          />
        ) : viewMode === 'history' ? (
          <HistoryViewer />
        ) : (
          <>
            {/* Active Processing Jobs Dashboard */}
            {currentJobId && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#856404',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  ⚙️ Processing Dashboard
                </h3>
                
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #ffeaa7'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <strong>Job ID:</strong> 
                      <code style={{
                        backgroundColor: '#f8f9fa',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>
                        {currentJobId}
                      </code>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => setViewMode('processing')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007acc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        📊 View Details
                      </button>
                      <button
                        onClick={() => {
                          localStorage.removeItem('currentProcessingJob');
                          setCurrentJobId(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    Processing in background... Click "View Details" to monitor progress
                  </div>
                </div>
              </div>
            )}

            {/* Active Jobs Dashboard */}
            {activeJobs.length > 0 && (
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                border: '1px solid #dee2e6'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#495057',
                  fontSize: '18px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⚡ Active Processing Jobs ({activeJobs.length})
                </h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {activeJobs.map((job) => {
                    const elapsed = Math.floor((Date.now() - job.timestamp) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    const elapsedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                    
                    return (
                      <div
                        key={job.jobId}
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          padding: '16px',
                          border: '1px solid #e9ecef',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: '600',
                              color: '#343a40',
                              fontSize: '14px',
                              marginBottom: '4px'
                            }}>
                              📄 {job.filename}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#6c757d',
                              fontFamily: 'monospace'
                            }}>
                              Job ID: {job.jobId}
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '4px'
                          }}>
                            <span style={{
                              fontSize: '11px',
                              color: '#6c757d'
                            }}>
                              ⏱️ {elapsedTime}
                            </span>
                            <button
                              onClick={() => {
                                setCurrentJobId(job.jobId);
                                setViewMode('processing');
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#007acc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              📊 View
                            </button>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            flex: 1,
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            border: '1px solid #e9ecef'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '4px'
                            }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: '#495057'
                              }}>
                                Status
                              </span>
                              <span style={{
                                fontSize: '11px',
                                color: '#6c757d'
                              }}>
                                {job.progress || 0}%
                              </span>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                flex: 1,
                                height: '6px',
                                backgroundColor: '#e9ecef',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%',
                                  backgroundColor: job.status === 'completed' ? '#28a745' :
                                                  job.status === 'error' ? '#dc3545' :
                                                  job.status === 'transcribing' ? '#007acc' :
                                                  '#ffc107',
                                  width: `${job.progress || 0}%`,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '500',
                                color: job.status === 'completed' ? '#28a745' :
                                        job.status === 'error' ? '#dc3545' :
                                        job.status === 'transcribing' ? '#007acc' :
                                        '#856404',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                {job.status === 'transcribing' ? '🎵 Transcribing' :
                                 job.status === 'preprocessing' ? '⚙️ Preprocessing' :
                                 job.status === 'generating_summary' ? '📝 Summarizing' :
                                 job.status === 'completed' ? '✅ Completed' :
                                 job.status === 'error' ? '❌ Error' :
                                 job.status === 'pending' ? '⏳ Pending' :
                                 '🔄 Initializing'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#e7f1ff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#0056b3'
                }}>
                  💡 Jobs persist across page refreshes and tabs. Click "View" to monitor detailed progress.
                </div>
              </div>
            )}

            {/* Upload or Recording Section */}
            {viewMode === 'upload' ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#2c3e50',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  📤 Upload New File
                </h3>
                
                <div style={{
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '16px',
                    margin: '0 0 20px 0'
                  }}>
                    Drag & drop your audio/video file or use the upload button on the left panel
                  </p>
                  
                  <div style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: '#f3e8ff',
                    borderRadius: '8px',
                    color: '#7c3aed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    💡 Supports MP3, WAV, MP4, MOV and more - up to 1GB
                  </div>
                </div>
              </div>
            ) : viewMode === 'recording' ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#2c3e50',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  🎙️ Record Audio
                </h3>
                
                <RecordingSection onRecordingComplete={handleRecordingComplete} />
              </div>
            ) : null}

            {/* Job History Manager - Show completed jobs */}
            <div style={{ marginBottom: '24px' }}>
              <JobHistoryManager 
                onViewResult={(result) => {
                  // Check if this result already exists in session transcriptions
                  const existingTranscription = sessionTranscriptions.find(
                    t => t.filename === result.filename && 
                         Math.abs(new Date(t.uploadTime).getTime() - new Date(result.upload_time || Date.now()).getTime()) < 60000 // Within 1 minute
                  );
                  
                  if (existingTranscription) {
                    console.log('🔄 Transcription already exists in session, skipping duplicate');
                    return;
                  }
                  
                  // Add the result to session transcriptions
                  const newTranscription = {
                    id: result.jobId || Date.now().toString(),
                    filename: result.filename || 'Unknown File',
                    status: "completed" as const,
                    uploadTime: new Date(result.upload_time || Date.now()),
                    transcript: result.transcript || '',
                    summary: result.summary,
                    keyPoints: result.key_points,
                    speakers: result.speakers,
                    segments: result.segments,
                    analysisResult: result.analysis,
                    duration: result.audio_duration
                  };
                  
                  console.log('✅ Adding new transcription to session:', newTranscription.filename);
                  setSessionTranscriptions(prev => [newTranscription, ...prev]);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
