#!/usr/bin/env python3
"""
Format Optimizer for Voice Note Transcription
Helps convert video files to optimal audio formats for faster and more accurate transcription
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def check_ffmpeg():
    """Check if ffmpeg is installed"""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_file_size(file_path):
    """Get file size in MB"""
    return round(os.path.getsize(file_path) / (1024 * 1024), 2)

def convert_to_mp3(input_file, output_file=None, bitrate="128k"):
    """Convert video/audio file to MP3 format optimized for transcription"""
    if output_file is None:
        base_name = os.path.splitext(input_file)[0]
        output_file = f"{base_name}_optimized.mp3"
    
    cmd = [
        'ffmpeg', '-i', input_file,
        '-vn',  # No video
        '-acodec', 'mp3',
        '-ab', bitrate,
        '-ar', '16000',  # 16kHz sample rate (optimal for Whisper)
        '-ac', '1',      # Mono
        '-y',            # Overwrite output file
        output_file
    ]
    
    try:
        print(f"🎵 Converting {input_file} to optimized MP3...")
        print(f"📁 Command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            original_size = get_file_size(input_file)
            new_size = get_file_size(output_file)
            reduction = round((1 - new_size/original_size) * 100, 1)
            
            print(f"✅ Conversion successful!")
            print(f"📊 File size: {original_size}MB → {new_size}MB ({reduction}% reduction)")
            print(f"💾 Output: {output_file}")
            return output_file
        else:
            print(f"❌ Conversion failed: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Error during conversion: {e}")
        return None

def convert_to_wav(input_file, output_file=None):
    """Convert to WAV format optimized for Whisper Large V3"""
    if output_file is None:
        base_name = os.path.splitext(input_file)[0]
        output_file = f"{base_name}_optimized.wav"
    
    cmd = [
        'ffmpeg', '-i', input_file,
        '-vn',  # No video
        '-acodec', 'pcm_s16le',
        '-ar', '16000',  # 16kHz sample rate
        '-ac', '1',      # Mono
        '-y',            # Overwrite output file
        output_file
    ]
    
    try:
        print(f"🎵 Converting {input_file} to optimized WAV...")
        print(f"📁 Command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            original_size = get_file_size(input_file)
            new_size = get_file_size(output_file)
            
            print(f"✅ Conversion successful!")
            print(f"📊 File size: {original_size}MB → {new_size}MB")
            print(f"💾 Output: {output_file}")
            return output_file
        else:
            print(f"❌ Conversion failed: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Error during conversion: {e}")
        return None

def analyze_file(file_path):
    """Analyze file and provide recommendations"""
    file_ext = os.path.splitext(file_path)[1].lower()
    file_size = get_file_size(file_path)
    
    print(f"\n📁 File Analysis: {os.path.basename(file_path)}")
    print(f"📏 Format: {file_ext}")
    print(f"📊 Size: {file_size}MB")
    
    video_formats = ['.mp4', '.mov', '.webm', '.mkv', '.avi']
    audio_formats = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
    
    if file_ext in video_formats:
        estimated_audio_size = file_size * 0.1
        print(f"🎬 Video detected - contains unnecessary video data")
        print(f"💡 Estimated audio-only size: ~{estimated_audio_size:.1f}MB")
        print(f"🚀 Recommended: Convert to MP3 for 2-3x faster processing")
        return "video"
    elif file_ext in ['.wav', '.flac']:
        print(f"✅ Optimal format - no conversion needed")
        return "optimal"
    elif file_ext in ['.mp3', '.m4a', '.ogg']:
        print(f"👍 Good format - will be auto-optimized during processing")
        return "good"
    else:
        print(f"❓ Unknown format - may need conversion")
        return "unknown"

def main():
    parser = argparse.ArgumentParser(description='Optimize audio/video files for transcription')
    parser.add_argument('input_file', help='Input file to optimize')
    parser.add_argument('-f', '--format', choices=['mp3', 'wav'], default='mp3',
                      help='Output format (default: mp3)')
    parser.add_argument('-b', '--bitrate', default='128k',
                      help='MP3 bitrate (default: 128k)')
    parser.add_argument('-o', '--output', help='Output file path')
    parser.add_argument('--analyze-only', action='store_true',
                      help='Only analyze file, do not convert')
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not os.path.exists(args.input_file):
        print(f"❌ Error: File '{args.input_file}' not found")
        sys.exit(1)
    
    # Check if ffmpeg is available
    if not args.analyze_only and not check_ffmpeg():
        print("❌ Error: ffmpeg not found")
        print("💡 Install ffmpeg: brew install ffmpeg (macOS) or visit https://ffmpeg.org/")
        sys.exit(1)
    
    # Analyze file
    file_type = analyze_file(args.input_file)
    
    if args.analyze_only:
        print("\n📋 Analysis complete")
        return
    
    # Convert if needed
    if file_type in ['video', 'unknown']:
        print(f"\n🔄 Starting conversion to {args.format.upper()}...")
        
        if args.format == 'mp3':
            output_file = convert_to_mp3(args.input_file, args.output, args.bitrate)
        else:
            output_file = convert_to_wav(args.input_file, args.output)
        
        if output_file:
            print(f"\n🎉 Optimization complete!")
            print(f"🚀 Upload '{output_file}' for faster transcription")
        else:
            print(f"\n❌ Optimization failed")
            sys.exit(1)
    else:
        print(f"\n✅ File is already in optimal format - no conversion needed")

if __name__ == "__main__":
    main()
