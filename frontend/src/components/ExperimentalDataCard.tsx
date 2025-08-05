import React from 'react';

interface ExperimentalSpeakerData {
  method: string;
  speaker_count: number;
  confidence: string;
  speakers: string[];
  segments: any[];
  analysis?: {
    duration_minutes?: number;
    voice_frames?: number;
    silence_frames?: number;
    voice_activity_ratio?: number;
    speaker_transitions?: number;
    change_points?: number;
    change_frequency_per_minute?: number;
    threshold_used?: number;
  };
}

interface AudioInfo {
  method?: string;
  model?: string;
  speed_mode?: string;
  experimental_speaker_detection?: {
    method: string;
    confidence: string;
    speaker_count: number;
    speakers: string[];
    segments_count: number;
  };
}

interface ExperimentalDataCardProps {
  experimentalData: ExperimentalSpeakerData | null;
  audioInfo: AudioInfo | null;
  detectedSpeakers: number | null;
}

const ExperimentalDataCard: React.FC<ExperimentalDataCardProps> = ({ 
  experimentalData, 
  audioInfo, 
  detectedSpeakers 
}) => {
  if (!experimentalData && !audioInfo?.experimental_speaker_detection) {
    return null;
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'pyannote': case 'pyannote_audio': return '🧠';
      case 'speechbrain': case 'speechbrain_toolkit': return '🎯';
      case 'resemblyzer': case 'resemblyzer_embeddings': return '⚡';
      case 'webrtc': case 'webrtc_vad_voice_activity': return '🎤';
      case 'energy': case 'energy_based_conservative': return '⚙️';
      default: return '🔬';
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'pyannote': case 'pyannote_audio': return 'pyannote.audio';
      case 'speechbrain': case 'speechbrain_toolkit': return 'SpeechBrain';
      case 'resemblyzer': case 'resemblyzer_embeddings': return 'Resemblyzer';
      case 'webrtc': case 'webrtc_vad_voice_activity': return 'WebRTC VAD';
      case 'energy': case 'energy_based_conservative': return 'Energy-based';
      default: return method;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return '#16a34a';
      case 'medium': return '#ea580c';
      case 'low': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div style={{
      backgroundColor: '#fdf4ff',
      border: '2px solid #c084fc',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: '#7c3aed',
        fontSize: '1.2em',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🧪 Experimental Speaker Detection Results
      </h3>

      {/* Speed Mode Info */}
      {audioInfo?.speed_mode && (
        <div style={{
          backgroundColor: '#ede9fe',
          border: '1px solid #c4b5fd',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed', marginBottom: '4px' }}>
            Processing Mode: {audioInfo.speed_mode.toUpperCase()}
          </div>
          {audioInfo.model && (
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Model: {audioInfo.model}
            </div>
          )}
        </div>
      )}

      {/* Experimental Method Results */}
      {experimentalData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Method Info */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>{getMethodIcon(experimentalData.method)}</span>
              <div>
                <div style={{ fontWeight: '600', color: '#374151' }}>
                  {getMethodName(experimentalData.method)}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: getConfidenceColor(experimentalData.confidence),
                  fontWeight: '600'
                }}>
                  Confidence: {experimentalData.confidence.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Speaker Count */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed', marginBottom: '4px' }}>
              {experimentalData.speaker_count}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Speakers Detected
            </div>
            {detectedSpeakers && detectedSpeakers !== experimentalData.speaker_count && (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                (Override from {detectedSpeakers})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Details */}
      {experimentalData?.analysis && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
            📊 Analysis Details
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {experimentalData.analysis.duration_minutes && (
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Duration:</span>{' '}
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {experimentalData.analysis.duration_minutes.toFixed(1)} min
                </span>
              </div>
            )}

            {experimentalData.analysis.voice_activity_ratio !== undefined && (
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Voice Activity:</span>{' '}
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {formatPercentage(experimentalData.analysis.voice_activity_ratio)}
                </span>
              </div>
            )}

            {experimentalData.analysis.speaker_transitions !== undefined && (
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Speaker Changes:</span>{' '}
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {experimentalData.analysis.speaker_transitions}
                </span>
              </div>
            )}

            {experimentalData.analysis.change_frequency_per_minute !== undefined && (
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Change Frequency:</span>{' '}
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {experimentalData.analysis.change_frequency_per_minute.toFixed(1)}/min
                </span>
              </div>
            )}

            {experimentalData.analysis.voice_frames !== undefined && experimentalData.analysis.silence_frames !== undefined && (
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Voice/Silence Frames:</span>{' '}
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {experimentalData.analysis.voice_frames.toLocaleString()} / {experimentalData.analysis.silence_frames.toLocaleString()}
                </span>
              </div>
            )}

            {experimentalData.analysis.threshold_used !== undefined && (
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Detection Threshold:</span>{' '}
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {experimentalData.analysis.threshold_used.toFixed(3)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Method Comparison Note */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #7dd3fc',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '16px'
      }}>
        <div style={{ fontSize: '12px', color: '#0369a1', fontStyle: 'italic' }}>
          💡 <strong>Experimental Detection:</strong> This advanced speaker detection method provides 
          more detailed analysis compared to standard Whisper detection. Results may vary based on 
          audio quality, speaker characteristics, and background noise.
        </div>
      </div>
    </div>
  );
};

export default ExperimentalDataCard;
