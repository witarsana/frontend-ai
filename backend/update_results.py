#!/usr/bin/env python3
"""
Script to update existing result files with new clean_summary and speaker_points fields
"""

import json
import os
import re
from pathlib import Path

def process_summary_sections(summary: str) -> tuple:
    """
    Process summary to create clean version and extract speaker points
    Returns: (clean_summary, speaker_points)
    """
    if not summary:
        return "", []
    
    # Remove redundant sections from summary
    sections_to_remove = [
        r'#### Action Items[\s\S]*?(?=####|$)',
        r'#### Decisions or Conclusions Made[\s\S]*?(?=####|$)',
        r'#### Important Points from Each Speaker[\s\S]*?(?=####|$)',
    ]
    
    clean_summary = summary
    for pattern in sections_to_remove:
        clean_summary = re.sub(pattern, '', clean_summary, flags=re.IGNORECASE)
    
    # Clean up extra whitespace and newlines
    clean_summary = re.sub(r'\n{3,}', '\n\n', clean_summary.strip())
    
    # Extract speaker points from summary
    speaker_points = []
    speaker_match = re.search(r'#### Important Points from Each Speaker\s*([\s\S]*?)(?=####|$)', summary, re.IGNORECASE)
    
    if speaker_match:
        speaker_text = speaker_match.group(1).strip()
        
        # Split by speaker sections (looking for **Speaker pattern)
        speaker_sections = re.split(r'\*\*Speaker\s+\d+.*?\*\*', speaker_text, flags=re.IGNORECASE)
        speaker_headers = re.findall(r'\*\*Speaker\s+\d+.*?\*\*', speaker_text, flags=re.IGNORECASE)
        
        for i, speaker_content in enumerate(speaker_sections[1:], 0):
            if i < len(speaker_headers):
                speaker_name = speaker_headers[i].replace('**', '').strip()
                content = speaker_content.strip()
                
                if content:
                    # Extract bullet points or numbered items
                    points = re.split(r'(?:\n|^)[-*]\s+|\d+\.\s+', content)
                    points = [point.strip().replace('**', '') for point in points if point.strip()]
                    
                    if points:
                        speaker_points.append({
                            "speaker": speaker_name,
                            "points": points
                        })
    
    return clean_summary, speaker_points

def update_result_file(file_path: Path):
    """Update a single result file with new fields"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        summary = data.get('summary', '')
        if summary and ('clean_summary' not in data or 'speaker_points' not in data):
            clean_summary, speaker_points = process_summary_sections(summary)
            
            data['clean_summary'] = clean_summary
            data['speaker_points'] = speaker_points
            
            # Save back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ Updated {file_path.name}")
            print(f"   - Clean summary: {len(clean_summary)} chars")
            print(f"   - Speaker points: {len(speaker_points)} speakers")
        else:
            print(f"⏭️ Skipped {file_path.name} (no summary or already processed)")
            
    except Exception as e:
        print(f"❌ Error updating {file_path.name}: {e}")

def main():
    """Update all result files in the results directory"""
    results_dir = Path("results")
    
    if not results_dir.exists():
        print("❌ Results directory not found")
        return
    
    result_files = list(results_dir.glob("*_result.json"))
    
    print(f"🔍 Found {len(result_files)} result files")
    
    for file_path in result_files:
        update_result_file(file_path)
    
    print(f"🎉 Processing complete!")

if __name__ == "__main__":
    main()
