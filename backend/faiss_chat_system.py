"""
FAISS Offline Chat System
========================

Completely offline chat system using FAISS vector database and sentence transformers.
No API calls required - everything runs locally.
"""

import json
import os
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime

try:
    import faiss
    import sentence_transformers
    from sentence_transformers import SentenceTransformer
    FAISS_AVAILABLE = True
    print("✅ FAISS and SentenceTransformers available for offline chat")
except ImportError as e:
    FAISS_AVAILABLE = False
    print(f"⚠️ FAISS offline dependencies not available: {e}")
    print("💡 Install with: pip install faiss-cpu sentence-transformers")

class FAISSChatSystem:
    """Completely offline chat system using FAISS and local embeddings"""
    
    def __init__(self, data_dir: str = "./results"):
        """Initialize FAISS offline chat system"""
        self.data_dir = data_dir
        self.current_file_data = None
        self.session_history = {}
        
        # FAISS components
        self.index = None
        self.segments = []
        self.embeddings = []
        
        # Initialize sentence transformer (completely offline)
        self.encoder = None
        encoder_available = False
        if FAISS_AVAILABLE:
            try:
                # Use lightweight model that works offline
                self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
                encoder_available = True
                print("✅ FAISS offline encoder loaded: all-MiniLM-L6-v2")
            except Exception as e:
                print(f"⚠️ Failed to load sentence transformer: {e}")
        
        self.available = FAISS_AVAILABLE and encoder_available and self.encoder is not None
        
        if self.available:
            print("✅ FAISS offline chat system ready")
        else:
            print("❌ FAISS offline chat system not available")
    
    def load_transcription_data(self, result_file_path: str) -> bool:
        """Load transcription data and build FAISS index"""
        if not self.available:
            print("❌ FAISS system not available")
            return False
            
        try:
            if not os.path.exists(result_file_path):
                print(f"❌ Result file not found: {result_file_path}")
                return False
            
            with open(result_file_path, 'r', encoding='utf-8') as f:
                self.current_file_data = json.load(f)
            
            print(f"🔄 Building FAISS index from transcript data...")
            self._build_faiss_index()
            
            print(f"✅ FAISS index built successfully with {len(self.segments)} segments")
            return True
            
        except Exception as e:
            print(f"❌ Error loading transcription data for FAISS: {e}")
            return False
    
    def _build_faiss_index(self):
        """Build FAISS vector index from transcript segments - completely offline"""
        if not self.current_file_data or not self.available:
            return
        
        self.segments = []
        texts_to_encode = []
        
        # Extract all text segments for embedding
        if "transcript" in self.current_file_data:
            for segment in self.current_file_data["transcript"]:
                text = segment.get("text", "").strip()
                if text and len(text) > 10:  # Only meaningful segments
                    speaker = segment.get("speaker_name", "Speaker")
                    timestamp = segment.get("start", 0)
                    
                    # Create searchable segment
                    segment_data = {
                        "text": text,
                        "speaker": speaker,
                        "timestamp": timestamp,
                        "type": "transcript",
                        "context": f"[{speaker}] {text}"
                    }
                    
                    self.segments.append(segment_data)
                    texts_to_encode.append(f"{speaker}: {text}")
        
        # Add summary as searchable content
        if "summary" in self.current_file_data and self.current_file_data["summary"]:
            summary_text = self.current_file_data["summary"]
            self.segments.append({
                "text": summary_text,
                "speaker": "System",
                "timestamp": 0,
                "type": "summary",
                "context": f"Meeting Summary: {summary_text[:200]}..."
            })
            texts_to_encode.append(f"Summary: {summary_text}")
        
        # Add enhanced action items instead of legacy ones
        if "enhanced_action_items" in self.current_file_data and self.current_file_data["enhanced_action_items"]:
            for item in self.current_file_data["enhanced_action_items"]:
                item_text = item.get("title", "") if isinstance(item, dict) else str(item)
                self.segments.append({
                    "text": item_text,
                    "speaker": "System",
                    "timestamp": 0,
                    "type": "action_item",
                    "context": f"Action Item: {item}"
                })
                texts_to_encode.append(f"Action: {item}")
        
        # Add next steps  
        if "next_steps" in self.current_file_data and self.current_file_data["next_steps"]:
            for step in self.current_file_data["next_steps"]:
                step_text = f"{step.get('category', 'Unknown')} ({step.get('timeframe', 'No timeframe')}): {step.get('description', 'No description')}"
                self.segments.append({
                    "text": step_text,
                    "speaker": "System",
                    "timestamp": 0,
                    "type": "next_step",
                    "context": f"Next Step: {step_text}"
                })
                texts_to_encode.append(f"Next Step: {step_text}")
        
        # Add key decisions
        if "key_decisions" in self.current_file_data and self.current_file_data["key_decisions"]:
            for decision in self.current_file_data["key_decisions"]:
                self.segments.append({
                    "text": decision,
                    "speaker": "System", 
                    "timestamp": 0,
                    "type": "decision",
                    "context": f"Decision: {decision}"
                })
                texts_to_encode.append(f"Decision: {decision}")
        
        if not texts_to_encode:
            print("⚠️ No text content available for FAISS indexing")
            return
        
        print(f"🔄 Encoding {len(texts_to_encode)} text segments with sentence transformer...")
        
        # Generate embeddings completely offline
        self.embeddings = self.encoder.encode(texts_to_encode, 
                                            convert_to_numpy=True,
                                            show_progress_bar=False)
        
        # Create FAISS index
        dimension = self.embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dimension)  # Inner product for similarity
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(self.embeddings)
        
        # Add embeddings to index
        self.index.add(self.embeddings.astype(np.float32))
        
        print(f"✅ FAISS index created: {len(self.segments)} segments, {dimension}D embeddings")
    
    def query(self, query: str, session_id: str = "default") -> Dict[str, Any]:
        """Process a chat query using FAISS similarity search - completely offline"""
        
        if not self.available:
            return {
                "response": "FAISS offline chat system is not available. Please install dependencies: pip install faiss-cpu sentence-transformers",
                "sources": [],
                "confidence": 0.0,
                "model_used": "faiss_unavailable"
            }
        
        if not self.current_file_data or not self.index:
            return {
                "response": "No transcription data has been loaded yet. Please load a transcript first.",
                "sources": [],
                "confidence": 0.0,
                "model_used": "faiss_offline"
            }
        
        try:
            # Encode query offline
            query_embedding = self.encoder.encode([query], convert_to_numpy=True)
            faiss.normalize_L2(query_embedding)
            
            # Search for most similar segments
            k = min(5, len(self.segments))  # Top 5 or all available
            scores, indices = self.index.search(query_embedding.astype(np.float32), k)
            
            # Get relevant segments
            relevant_segments = []
            for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
                if score > 0.3:  # Similarity threshold
                    segment = self.segments[idx]
                    relevant_segments.append({
                        "segment": segment,
                        "similarity": float(score),
                        "rank": i + 1
                    })
            
            # Generate response based on relevant segments
            response = self._generate_offline_response(query, relevant_segments)
            
            # Store in session history
            if session_id not in self.session_history:
                self.session_history[session_id] = []
            
            self.session_history[session_id].append({
                "query": query,
                "response": response["text"],
                "segments_used": len(relevant_segments),
                "timestamp": datetime.now().isoformat(),
                "model_used": "faiss_offline"
            })
            
            return {
                "response": response["text"],
                "sources": response["sources"],
                "confidence": response["confidence"],
                "model_used": "faiss_offline",
                "segments_found": len(relevant_segments)
            }
            
        except Exception as e:
            print(f"❌ FAISS query error: {e}")
            return {
                "response": f"Sorry, an error occurred while processing your query: {str(e)}",
                "sources": [],
                "confidence": 0.0,
                "model_used": "faiss_error"
            }
    
    def _generate_offline_response(self, query: str, relevant_segments: List[Dict]) -> Dict[str, Any]:
        """Generate response from relevant segments without any API calls"""
        
        if not relevant_segments:
            return {
                "text": f"I couldn't find specific information related to '{query}' in the transcript. Could you try rephrasing your question or ask about different topics discussed in the meeting?",
                "sources": [],
                "confidence": 0.1
            }
        
        # Analyze query type
        query_lower = query.lower()
        is_who_question = any(word in query_lower for word in ["who", "siapa", "speaker", "pembicara"])
        is_what_question = any(word in query_lower for word in ["what", "apa", "topic", "topik"])
        is_when_question = any(word in query_lower for word in ["when", "kapan", "time", "waktu"])
        is_summary_question = any(word in query_lower for word in ["summary", "ringkasan", "summarize"])
        is_action_question = any(word in query_lower for word in ["action", "tindakan", "todo", "task"])
        is_decision_question = any(word in query_lower for word in ["decision", "keputusan", "decide", "conclusion"])
        is_next_steps_question = any(word in query_lower for word in ["next", "langkah", "selanjutnya", "future", "follow", "recommendations"])
        
        # Build response based on query type and relevant segments
        response_parts = []
        sources = []
        
        if is_summary_question:
            summary_segments = [s for s in relevant_segments if s["segment"]["type"] == "summary"]
            if summary_segments:
                response_parts.append("**Meeting Summary:**")
                response_parts.append(summary_segments[0]["segment"]["text"][:500] + "...")
                sources.append({"type": "summary", "content": "Meeting summary"})
        
        elif is_next_steps_question:
            next_step_segments = [s for s in relevant_segments if s["segment"]["type"] == "next_step"]
            if next_step_segments:
                response_parts.append("**Next Steps & Recommendations:**")
                for i, seg in enumerate(next_step_segments[:4], 1):
                    response_parts.append(f"{i}. {seg['segment']['text']}")
                sources.append({"type": "next_steps", "content": f"{len(next_step_segments)} strategic steps"})
        
        elif is_action_question:
            action_segments = [s for s in relevant_segments if s["segment"]["type"] == "action_item"]
            if action_segments:
                response_parts.append("**Action Items:**")
                for i, seg in enumerate(action_segments[:3], 1):
                    response_parts.append(f"{i}. {seg['segment']['text']}")
                sources.append({"type": "action_items", "content": f"{len(action_segments)} action items"})
        
        elif is_decision_question:
            decision_segments = [s for s in relevant_segments if s["segment"]["type"] == "decision"]
            if decision_segments:
                response_parts.append("**Key Decisions:**")
                for i, seg in enumerate(decision_segments[:3], 1):
                    response_parts.append(f"{i}. {seg['segment']['text']}")
                sources.append({"type": "decisions", "content": f"{len(decision_segments)} decisions"})
        
        elif is_who_question:
            speakers = set()
            transcript_segments = [s for s in relevant_segments if s["segment"]["type"] == "transcript"]
            for seg in transcript_segments:
                speakers.add(seg["segment"]["speaker"])
            
            if speakers:
                response_parts.append("**Speakers in this meeting:**")
                for speaker in sorted(speakers):
                    response_parts.append(f"- {speaker}")
                sources.append({"type": "speakers", "content": f"{len(speakers)} speakers identified"})
        
        else:
            # General content-based response
            response_parts.append(f"**Based on the transcript, here's what I found related to '{query}':**")
            
            for i, seg_data in enumerate(relevant_segments[:3], 1):
                segment = seg_data["segment"]
                similarity = seg_data["similarity"]
                
                if segment["type"] == "transcript":
                    timestamp_str = f"({int(segment['timestamp']//60):02d}:{int(segment['timestamp']%60):02d})"
                    response_parts.append(f"{i}. **{segment['speaker']}** {timestamp_str}: {segment['text']}")
                else:
                    response_parts.append(f"{i}. **{segment['type'].title()}**: {segment['text']}")
                
                sources.append({
                    "type": segment["type"],
                    "content": segment["context"][:100] + "...",
                    "similarity": similarity
                })
        
        # Add context if no specific info found
        if not response_parts:
            response_parts.append("I found some related content in the transcript:")
            for seg_data in relevant_segments[:2]:
                segment = seg_data["segment"]
                response_parts.append(f"- {segment['context'][:200]}...")
                sources.append({"type": segment["type"], "content": segment["context"][:100] + "..."})
        
        # Calculate confidence based on similarity scores
        if relevant_segments:
            avg_similarity = sum(s["similarity"] for s in relevant_segments) / len(relevant_segments)
            confidence = min(0.9, avg_similarity * 1.2)  # Scale similarity to confidence
        else:
            confidence = 0.1
        
        response_text = "\n\n".join(response_parts)
        
        return {
            "text": response_text,
            "sources": sources,
            "confidence": confidence
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
        if not self.current_file_data or not self.available:
            return [
                "What is this transcript about?",
                "Who are the main speakers?",
                "What are the key topics discussed?",
                "Can you summarize the main points?"
            ]
        
        suggestions = [
            "Who are the speakers in this meeting?",
            "What are the main topics discussed?",
            "What decisions were made?",
            "What action items were mentioned?",
            "What are the next steps and recommendations?",
            "Can you summarize the meeting?",
            "What questions were asked?",
            "What was discussed at the beginning?",
            "What were the conclusions?"
        ]
        
        return suggestions
    
    def is_available(self) -> bool:
        """Check if FAISS system is available"""
        return self.available
    
    def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the FAISS index"""
        if not self.available or not self.index:
            return {"status": "unavailable"}
        
        return {
            "status": "available",
            "total_segments": len(self.segments),
            "index_size": self.index.ntotal,
            "embedding_dimension": self.embeddings.shape[1] if len(self.embeddings) > 0 else 0,
            "segment_types": {
                "transcript": len([s for s in self.segments if s["type"] == "transcript"]),
                "summary": len([s for s in self.segments if s["type"] == "summary"]),
                "action_items": len([s for s in self.segments if s["type"] == "action_item"]),
                "next_steps": len([s for s in self.segments if s["type"] == "next_step"]),
                "decisions": len([s for s in self.segments if s["type"] == "decision"])
            }
        }
