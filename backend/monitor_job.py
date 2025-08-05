#!/usr/bin/env python3
"""
Real-time monitoring script for transcription progress
Shows current segment being processed and detailed progress information
"""

import requests
import json
import time
import sys
import re
from datetime import datetime

def get_job_status(job_id, base_url="http://localhost:8000"):
    """Get current job status"""
    try:
        response = requests.get(f"{base_url}/api/status/{job_id}")
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except:
        return None

def extract_segment_info(message):
    """Extract segment information from status message"""
    segment_info = {}
    
    # Look for patterns like "Processing segments: 25/150" or "segments: 25/150"
    segment_match = re.search(r'segments?:\s*(\d+)/(\d+)', message, re.IGNORECASE)
    if segment_match:
        current = int(segment_match.group(1))
        total = int(segment_match.group(2))
        segment_info = {
            "current_segment": current,
            "total_segments": total,
            "segments_processed": current,
            "segments_remaining": total - current,
            "segment_progress_percent": round((current / total) * 100, 1) if total > 0 else 0
        }
    
    return segment_info

def format_status_display(status):
    """Format status for readable display"""
    if not status:
        return "❌ Cannot connect to server or job not found"
    
    lines = []
    lines.append("=" * 60)
    lines.append(f"🔄 JOB MONITORING - {datetime.now().strftime('%H:%M:%S')}")
    lines.append("=" * 60)
    
    # Basic info
    lines.append(f"📋 Status: {status.get('status', 'unknown').upper()}")
    lines.append(f"📊 Overall Progress: {status.get('progress', 0)}%")
    lines.append(f"⏱️  Elapsed Time: {status.get('elapsed_time', 'unknown')}")
    lines.append(f"⏳ Estimated Remaining: {status.get('estimated_remaining', 'unknown')}")
    
    # Current stage info
    if 'stage_detail' in status:
        stage = status['stage_detail']
        lines.append(f"🎯 Current Stage: {stage.get('name', 'Unknown')} ({stage.get('progress', 0)}%)")
    
    # Processing stage timeline
    if 'processing_info' in status:
        proc = status['processing_info']
        current_idx = proc.get('current_stage_index', 1)
        total_stages = proc.get('total_stages', 7)
        lines.append(f"📈 Stage Progress: {current_idx}/{total_stages} stages")
    
    # Extract segment info from message
    message = status.get('message', '')
    segment_info = extract_segment_info(message)
    
    if segment_info:
        lines.append("")
        lines.append("🎵 SEGMENT DETAILS:")
        lines.append(f"   Current Segment: {segment_info['current_segment']}")
        lines.append(f"   Total Segments: {segment_info['total_segments']}")
        lines.append(f"   Segments Processed: {segment_info['segments_processed']}")
        lines.append(f"   Segments Remaining: {segment_info['segments_remaining']}")
        lines.append(f"   Segment Progress: {segment_info['segment_progress_percent']}%")
        
        # Progress bar for segments
        progress_bar_length = 40
        filled_length = int(progress_bar_length * segment_info['segment_progress_percent'] / 100)
        bar = '█' * filled_length + '░' * (progress_bar_length - filled_length)
        lines.append(f"   Progress Bar: [{bar}] {segment_info['segment_progress_percent']}%")
    
    # Current message
    lines.append("")
    lines.append(f"💬 Current Message: {message}")
    
    # Result availability
    result_available = status.get('result_available', False)
    lines.append(f"📄 Result Available: {'✅ Yes' if result_available else '❌ Not yet'}")
    
    return "\n".join(lines)

def monitor_job(job_id, refresh_interval=3):
    """Monitor job progress in real-time"""
    print(f"🚀 Starting real-time monitoring for job: {job_id}")
    print(f"🔄 Refresh interval: {refresh_interval} seconds")
    print("🛑 Press Ctrl+C to stop monitoring")
    print("")
    
    try:
        while True:
            # Clear screen (works on most terminals)
            print("\033[H\033[J", end="")
            
            status = get_job_status(job_id)
            display = format_status_display(status)
            print(display)
            
            # Check if job is completed
            if status and status.get('status') in ['completed', 'error']:
                print("\n" + "=" * 60)
                if status.get('status') == 'completed':
                    print("🎉 JOB COMPLETED SUCCESSFULLY!")
                else:
                    print("❌ JOB FAILED!")
                    if 'error' in status:
                        print(f"Error: {status['error']}")
                print("=" * 60)
                break
            
            time.sleep(refresh_interval)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Monitoring stopped by user")
    except Exception as e:
        print(f"\n❌ Monitoring error: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python monitor_job.py <job_id> [refresh_interval]")
        print("Example: python monitor_job.py job_20250805_154115_6232 2")
        sys.exit(1)
    
    job_id = sys.argv[1]
    refresh_interval = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    
    monitor_job(job_id, refresh_interval)

if __name__ == "__main__":
    main()
