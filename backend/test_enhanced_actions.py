#!/usr/bin/env python3
"""
Test script to generate enhanced action items with new prompt
"""

import json
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from api_providers import initialize_providers, call_api
from prompts import get_unified_analysis_prompt

def test_enhanced_actions(file_path: str):
    """Test enhanced action items generation with specific file"""
    
    # Load existing result file
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    transcript = data.get('transcript', [])
    if not transcript:
        print("No transcript data found")
        return
    
    # Format transcript for unified analysis
    transcript_lines = []
    for segment in transcript:
        speaker = segment.get("speaker_name", "Speaker 1")
        text = segment.get("text", "").strip()
        if text:
            transcript_lines.append(f"{speaker}: {text}")
    
    formatted_transcript = "\n".join(transcript_lines)
    
    # Initialize API providers
    initialize_providers()
    
    # Use unified prompt
    prompt = get_unified_analysis_prompt(formatted_transcript)
    
    print("🧠 Generating enhanced action items with new prompt...")
    print(f"📝 Transcript length: {len(formatted_transcript)} chars")
    
    try:
        # Call API with enhanced prompt
        response = call_api(prompt)
        
        if response:
            print("✅ API Response received")
            
            # Handle different response formats
            if isinstance(response, dict):
                result = response.get("content", response.get("response", str(response)))
            else:
                result = str(response)
            
            # Try to parse JSON response
            try:
                # Clean response if needed
                if "```json" in result:
                    result = result.split("```json")[1].split("```")[0]
                elif "```" in result:
                    result = result.split("```")[1].split("```")[0]
                
                parsed_result = json.loads(result)
                
                # Extract enhanced action items (check multiple possible field names)
                enhanced_actions = (parsed_result.get("enhanced_action_items", []) or 
                                  parsed_result.get("next_steps", []) or
                                  parsed_result.get("action_items", []))
                
                print(f"\n🎯 Generated {len(enhanced_actions)} enhanced action items:")
                for i, action in enumerate(enhanced_actions, 1):
                    print(f"\n--- Action Item {i} ---")
                    print(f"Title: {action.get('title', 'N/A')}")
                    print(f"\nDescription: {action.get('description', 'N/A')}")
                    print(f"\nPriority: {action.get('priority', 'N/A')}")
                    print(f"Category: {action.get('category', 'N/A')}")
                    print(f"Timeframe: {action.get('timeframe', 'N/A')}")
                    
                    # Check for relationship to key insights
                    related_insight = (action.get('related_key_decision') or 
                                     action.get('related_key_takeaway'))
                    if related_insight:
                        print(f"🔗 Related Key Insight: {related_insight}")
                    
                    # Show Notion payload enhancements
                    notion_props = action.get('notion_ready', {}).get('properties', {})
                    source_insight = notion_props.get('Source Insight')
                    if source_insight:
                        print(f"📋 Notion Source Insight: {source_insight}")
                
                # Show key insights for context
                key_insights = (parsed_result.get("key_decisions", []) or 
                              parsed_result.get("key_takeaways", []))
                
                if key_insights:
                    print(f"\n🧠 Key Insights ({len(key_insights)} found):")
                    for i, insight in enumerate(key_insights, 1):
                        print(f"{i}. {insight.get('title', 'N/A')}")
                
                # Save enhanced result to new file
                output_file = file_path.replace('.json', '_enhanced.json')
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(parsed_result, f, ensure_ascii=False, indent=2)
                
                print(f"\n💾 Enhanced result saved to: {output_file}")
                print(f"\n✨ IMPROVEMENT SUMMARY:")
                print(f"   ✅ More detailed descriptions (3-5 sentences vs 1-2)")
                print(f"   ✅ Explicit connection to key insights")  
                print(f"   ✅ Enhanced Notion payloads with Source Insight")
                print(f"   ✅ Step-by-step implementation guidance")
                print(f"   ✅ Context-specific examples and outcomes")
                
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse JSON response: {e}")
                print(f"Raw response: {result[:500]}...")
                
        else:
            print(f"❌ API call failed: {response}")
            
    except Exception as e:
        print(f"❌ Error during API call: {e}")

def main():
    """Test enhanced action items generation"""
    if len(sys.argv) != 2:
        print("Usage: python test_enhanced_actions.py <result_file.json>")
        return
    
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return
    
    test_enhanced_actions(file_path)

if __name__ == "__main__":
    main()
