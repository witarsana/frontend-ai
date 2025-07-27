import React, { useState, useEffect, useRef } from 'react';
import { AudioPlayerState } from '../types';
import { formatTime } from '../utils/helpers';

interface AudioPlayerProps {
  onSeekToTime: (seconds: number) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ onSeekToTime }) => {
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 40 * 60 // 40 minutes in seconds
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    setPlayerState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  };

  const seekAudio = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progress = clickX / rect.width;
    
    const newTime = Math.floor(progress * playerState.duration);
    setPlayerState(prev => ({
      ...prev,
      currentTime: newTime
    }));
    onSeekToTime(newTime);
  };

  useEffect(() => {
    if (playerState.isPlaying) {
      intervalRef.current = setInterval(() => {
        setPlayerState(prev => {
          if (prev.currentTime >= prev.duration) {
            return {
              ...prev,
              isPlaying: false,
              currentTime: prev.duration
            };
          }
          return {
            ...prev,
            currentTime: prev.currentTime + 1
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playerState.isPlaying, playerState.duration]);

  const progress = (playerState.currentTime / playerState.duration) * 100;

  return (
    <div className="audio-player">
      <div className="player-controls">
        <button 
          className="play-btn" 
          onClick={togglePlay}
        >
          {playerState.isPlaying ? '⏸️' : '▶️'}
        </button>
        <div 
          className="progress-bar" 
          onClick={seekAudio}
        >
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="time-display">
          <span>{formatTime(playerState.currentTime)}</span> / <span>{formatTime(playerState.duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
