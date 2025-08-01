"""
Chat System for AI Meeting Transcription
=====================================

Simple chat system that can query transcription data using multi-provider AI.
This module provides basic chat functionality for exploring meeting content.
"""

import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Import our new multi-provider system
from api_providers import initialize_providers, call_api

# Load environment variables
load_dotenv()

class ChatSystem:
    """Simple chat system for querying transcription data"""
    
    def __init__(self, data_dir: str = "./results"):
        """Initialize chat system with data directory"""
        self.data_dir = data_dir
        self.current_file_data = None
        self.session_history = {}
        
        # Initialize our multi-provider API system
        self.api_providers = initialize_providers()
        print("✅ Chat system multi-provider API initialized")
    
    def load_transcription_data(self, result_file_path: str) -> bool:
        """Load transcription data from a result file"""
        try:
            if not os.path.exists(result_file_path):
                print(f"❌ Result file not found: {result_file_path}")
                return False
            
            with open(result_file_path, 'r', encoding='utf-8') as f:
                self.current_file_data = json.load(f)
            
            print(f"✅ Loaded transcription data from {result_file_path}")
            return True
            
        except Exception as e:
            print(f"❌ Error loading transcription data: {e}")
            return False
    
    def _build_context_from_data(self) -> str:
        """Build context string from loaded transcription data"""
        if not self.current_file_data:
            return "No transcription data available."
        
        context_parts = []
        
        # Add summary if available
        if "summary" in self.current_file_data:
            context_parts.append(f"SUMMARY:\n{self.current_file_data['summary']}")
        
        # Add transcript segments
        if "transcript" in self.current_file_data:
            transcript_text = ""
            for segment in self.current_file_data["transcript"]:
                speaker = segment.get("speaker", "Unknown")
                text = segment.get("text", "")
                timestamp = segment.get("timestamp", "")
                transcript_text += f"{speaker} ({timestamp}): {text}\n"
            
            context_parts.append(f"TRANSCRIPT:\n{transcript_text}")
        
        # Add action items if available
        if "action_items" in self.current_file_data and self.current_file_data["action_items"]:
            action_items = "\n".join([f"- {item}" for item in self.current_file_data["action_items"]])
            context_parts.append(f"ACTION ITEMS:\n{action_items}")
        
        # Add key decisions if available  
        if "key_decisions" in self.current_file_data and self.current_file_data["key_decisions"]:
            decisions = "\n".join([f"- {item}" for item in self.current_file_data["key_decisions"]])
            context_parts.append(f"KEY DECISIONS:\n{decisions}")
        
        return "\n\n".join(context_parts)
    
    def query(self, query: str, session_id: str = "default") -> Dict[str, Any]:
        """Process a chat query about the loaded transcription"""
        
        if not self.current_file_data:
            return {
                "response": "No transcription data has been loaded yet. Please load a transcript first.",
                "sources": [],
                "confidence": 0.0
            }
        
        if not self.api_providers:
            return {
                "response": "Chat system is not properly configured. API providers not available.",
                "sources": [],
                "confidence": 0.0
            }
        
        try:
            # Build context from loaded data
            context = self._build_context_from_data()
            
            # Create a prompt for AI
            system_prompt = """You are an AI assistant that helps analyze meeting/conversation transcripts. 
Provide informative and relevant answers based on the available transcript data. 
Answer in clear and easy-to-understand English."""
            
            user_prompt = f"""Based on the following meeting/conversation data:

{context}

Question: {query}

Provide an informative and relevant answer."""
            
            # Use our multi-provider API system
            answer = call_api(
                f"{system_prompt}\n\n{user_prompt}",
                providers=self.api_providers,
                max_tokens=1000
            )
            
            # Store in session history
            if session_id not in self.session_history:
                self.session_history[session_id] = []
            
            self.session_history[session_id].append({
                "query": query,
                "response": answer,
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "response": answer,
                "sources": [{"type": "transcript", "content": "Loaded meeting transcript"}],
                "confidence": 0.8
            }
            
        except Exception as e:
            print(f"❌ Chat query error: {e}")
            return {
                "response": f"Maaf, terjadi kesalahan saat memproses pertanyaan Anda: {str(e)}",
                "sources": [],
                "confidence": 0.0
            }
    
    def get_session_history(self, session_id: str = "default") -> List[Dict]:
        """Get chat history for a session"""
        return self.session_history.get(session_id, [])
    
    def clear_session(self, session_id: str = "default"):
        """Clear chat history for a session"""
        if session_id in self.session_history:
            del self.session_history[session_id]
    
    def get_suggestions(self) -> List[str]:
        """Get suggested questions based on loaded data"""
        if not self.current_file_data:
            return [
                "What is this transcript about?",
                "Who are the main speakers?",
                "What are the key topics discussed?",
                "Can you summarize the main points?"
            ]
        
        suggestions = [
            "Who are the speakers in this meeting?",
            "What are the main topics discussed?",
            "Can you summarize the key decisions made?",
            "What action items were mentioned?",
            "What questions were asked during the meeting?",
            "How long was the meeting?",
            "What was the overall sentiment of the discussion?"
        ]
        
        return suggestions
