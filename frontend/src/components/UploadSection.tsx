import React, { useRef } from 'react';
import { validateFile } from '../utils/helpers';
import EngineSelector from './EngineSelector';

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }
    onFileSelect(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-container">
      {/* File Upload - STEP 1 */}
      <div 
        className="upload-section"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon">📁</div>
        <h3>Drop file audio/video di sini atau klik untuk upload</h3>
        <p style={{ margin: '15px 0', color: '#6b7280' }}>
          Mendukung: MP3, WAV, MP4, MKV, M4A (Max: 100MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
        <button className="upload-button" onClick={handleUploadClick}>
          📂 Pilih File
        </button>
      </div>
      
      {/* Engine Selection - STEP 2 */}
      <EngineSelector 
        onEngineChange={(engine) => {
          console.log('Engine changed to:', engine);
        }}
      />
    </div>
  );
};

export default UploadSection;
