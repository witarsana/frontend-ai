import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { AudioPlayerState } from '../types';
import { formatTime } from '../utils/helpers';

interface AudioPlayerProps {
  onSeekToTime: (seconds: number) => void;
  onTimeUpdate?: (seconds: number) => void; // Callback for time updates
  audioUrl?: string;
  duration?: number;
}

export interface AudioPlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({ onSeekToTime, onTimeUpdate, audioUrl, duration }, ref) => {
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: duration || 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (audioRef.current) {
        const clampedSeconds = Math.max(0, Math.min(seconds, playerState.duration));
        audioRef.current.currentTime = clampedSeconds;
        setPlayerState(prev => ({
          ...prev,
          currentTime: clampedSeconds
        }));
      }
    },
    play: () => {
      if (audioRef.current && !playerState.isPlaying) {
        audioRef.current.play().catch(e => {
          console.error('Play error:', e);
        });
      }
    },
    pause: () => {
      if (audioRef.current && playerState.isPlaying) {
        audioRef.current.pause();
      }
    },
    getCurrentTime: () => playerState.currentTime,
    getDuration: () => playerState.duration
  }), [playerState]);

  // Initialize audio element
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setPlayerState(prev => ({
          ...prev,
          duration: audio.duration
        }));
      });

      audio.addEventListener('timeupdate', () => {
        const currentTime = audio.currentTime;
        setPlayerState(prev => ({
          ...prev,
          currentTime: currentTime
        }));
        
        // Call onTimeUpdate callback if provided
        if (onTimeUpdate) {
          onTimeUpdate(Math.floor(currentTime));
        }
      });

      audio.addEventListener('ended', () => {
        setPlayerState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: audio.duration
        }));
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
      });

      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
        audio.removeEventListener('error', () => {});
      };
    }
  }, [audioUrl, onTimeUpdate]);

  // Update duration if passed as prop
  useEffect(() => {
    if (duration && duration > 0) {
      setPlayerState(prev => ({
        ...prev,
        duration: duration
      }));
    }
  }, [duration]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (playerState.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => {
          console.error('Play error:', e);
        });
      }
      setPlayerState(prev => ({
        ...prev,
        isPlaying: !prev.isPlaying
      }));
    }
  };

  const seekAudio = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progress = clickX / rect.width;
    
    const newTime = Math.floor(progress * playerState.duration);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    
    setPlayerState(prev => ({
      ...prev,
      currentTime: newTime
    }));
    onSeekToTime(newTime);
  };

  const progress = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;

  return (
    <div className="audio-player">
      <div className="player-controls">
        <button 
          className="play-btn" 
          onClick={togglePlay}
          disabled={!audioUrl}
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
      {!audioUrl && (
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '8px' }}>
          Audio not available - upload and process a file first
        </div>
      )}
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
