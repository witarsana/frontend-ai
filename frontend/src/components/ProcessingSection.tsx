import React from 'react';
import { ProcessingState } from '../types';

interface ProcessingSectionProps {
  processingState: ProcessingState;
}

const ProcessingSection: React.FC<ProcessingSectionProps> = ({ processingState }) => {
  if (!processingState.isProcessing) {
    return null;
  }

  return (
    <div className="processing active">
      <div className="spinner"></div>
      <h3>⚙️ AI sedang memproses...</h3>
      <p>{processingState.status}</p>
      
      {/* Auto-fallback notification */}
      {processingState.autoFallback && (
        <div style={{ 
          marginTop: '15px', 
          padding: '12px', 
          backgroundColor: '#fef3c7', 
          border: '1px solid #f59e0b', 
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>🚀</span>
            <strong style={{ color: '#92400e' }}>Engine Auto-Switch</strong>
          </div>
          <p style={{ margin: '0 0 8px 0', color: '#92400e', lineHeight: '1.4' }}>
            {processingState.autoFallback.message}
          </p>
          {processingState.autoFallback.details && (
            <div style={{ fontSize: '12px', color: '#78350f', marginBottom: '8px' }}>
              <div>📊 File: {processingState.autoFallback.details.file_size_mb}MB, {processingState.autoFallback.details.duration_minutes} min</div>
              <div>⚡ Limits: {processingState.autoFallback.details.max_size_mb}MB, {processingState.autoFallback.details.max_duration_min} min</div>
            </div>
          )}
          {processingState.autoFallback.recommendation && (
            <div style={{ fontSize: '12px', color: '#059669', fontStyle: 'italic' }}>
              💡 {processingState.autoFallback.recommendation}
            </div>
          )}
        </div>
      )}

      {/* Timeout fallback notification */}
      {processingState.timeoutFallback && (
        <div style={{ 
          marginTop: '15px', 
          padding: '12px', 
          backgroundColor: '#fecaca', 
          border: '1px solid #ef4444', 
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>🔄</span>
            <strong style={{ color: '#dc2626' }}>Timeout Fallback</strong>
          </div>
          <p style={{ margin: '0', color: '#dc2626', lineHeight: '1.4' }}>
            {processingState.timeoutFallback.message}
          </p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px' }}>
          <div 
            style={{ 
              background: '#4facfe', 
              height: '100%', 
              width: `${processingState.progress}%`, 
              borderRadius: '3px', 
              transition: 'width 0.5s' 
            }}
          />
        </div>
        <p style={{ marginTop: '10px', color: '#6b7280' }}>
          {Math.round(processingState.progress)}%
        </p>
      </div>
    </div>
  );
};

export default ProcessingSection;
