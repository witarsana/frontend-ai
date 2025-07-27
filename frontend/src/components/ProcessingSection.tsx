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
