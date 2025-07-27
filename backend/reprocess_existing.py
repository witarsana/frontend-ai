#!/usr/bin/env python3
"""
Script to reprocess existing transcription results with improved AI summarization
"""
import os
import json
import requests
import time

def reprocess_existing_results():
    """Find and reprocess all existing results"""
    results_dir = "results"
    
    if not os.path.exists(results_dir):
        print("❌ No results directory found")
        return
    
    result_files = [f for f in os.listdir(results_dir) if f.endswith('_result.json')]
    
    if not result_files:
        print("❌ No existing results found")
        return
    
    print(f"🔍 Found {len(result_files)} existing results")
    
    for result_file in result_files:
        job_id = result_file.replace('_result.json', '')
        print(f"\n🔄 Reprocessing {job_id}...")
        
        try:
            # Call reprocess API
            response = requests.post(f"http://localhost:8000/api/reprocess-summary/{job_id}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {job_id}: {result['message']}")
                print(f"📝 Summary preview: {result.get('summary_preview', 'N/A')}")
            else:
                print(f"❌ {job_id}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {job_id}: Error - {e}")
        
        # Small delay between requests
        time.sleep(1)
    
    print(f"\n✅ Reprocessing complete!")

if __name__ == "__main__":
    print("🚀 Starting reprocessing of existing results...")
    reprocess_existing_results()
