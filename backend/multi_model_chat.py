"""
Multi-Model Chat System for Enhanced AI Interaction
=================================================

Advanced chat system with multiple AI model support and smart routing.
Provides enhanced chat capabilities with model selection and optimization.
Includes FAISS offline chat for completely local processing.
"""

import json
import os
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from mistralai import Mistral
from dotenv import load_dotenv

# Import ChatSystem from the local module
from chat_system import ChatSystem

# Import FAISS offline chat system
try:
    from faiss_chat_system import FAISSChatSystem
    FAISS_SYSTEM_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ FAISS chat system not available: {e}")
    FAISS_SYSTEM_AVAILABLE = False

# Load environment variables
load_dotenv()

class MultiModelChatSystem:
    """Enhanced chat system with multi-model support"""
    
    def __init__(self, data_dir: str = "./results"):
        """Initialize multi-model chat system"""
        self.data_dir = data_dir
        self.current_file_data = None
        self.session_history = {}
        
        # Initialize base chat system
        self.base_chat_system = ChatSystem(data_dir)
        
        # Initialize FAISS offline chat system
        self.faiss_chat_system = None
        if FAISS_SYSTEM_AVAILABLE:
            try:
                self.faiss_chat_system = FAISSChatSystem(data_dir)
                print("✅ FAISS offline chat system initialized")
            except Exception as e:
                print(f"⚠️ FAISS chat system initialization failed: {e}")
        
        # Initialize available models
        self.available_models = {}
        
        # Add FAISS as completely offline model (highest priority for offline use)
        if self.faiss_chat_system and self.faiss_chat_system.is_available():
            self.available_models["faiss"] = {
                "client": self.faiss_chat_system,
                "model_name": "FAISS + SentenceTransformers (Offline)",
                "capabilities": ["offline_chat", "semantic_search", "transcript_analysis"],
                "priority": 0,  # Highest priority
                "offline": True
            }
            print("✅ FAISS offline model available")
        
        # Initialize Mistral client
        self.mistral_client = None
        mistral_api_key = os.getenv("MISTRAL_API_KEY")
        if mistral_api_key:
            try:
                self.mistral_client = Mistral(api_key=mistral_api_key)
                self.available_models["mistral"] = {
                    "client": self.mistral_client,
                    "model_name": "mistral-large-latest",
                    "capabilities": ["chat", "analysis", "summarization"],
                    "priority": 1,
                    "offline": False
                }
                print("✅ Multi-model chat system Mistral client initialized")
            except Exception as e:
                print(f"⚠️  Multi-model Mistral initialization failed: {e}")
        
        # NOTE: Deepseek is disabled as requested - no agent available yet
        # Future: Add Deepseek when agent is ready
        
        print(f"✅ Multi-model chat system initialized with {len(self.available_models)} models")
        print(f"📋 Available models: {list(self.available_models.keys())}")
    
    def load_transcription_data(self, result_file_path: str) -> bool:
        """Load transcription data (delegate to all systems)"""
        success = self.base_chat_system.load_transcription_data(result_file_path)
        if success:
            self.current_file_data = self.base_chat_system.current_file_data
            
            # Also load into FAISS system for offline search
            if self.faiss_chat_system:
                faiss_success = self.faiss_chat_system.load_transcription_data(result_file_path)
                if faiss_success:
                    print("✅ Data loaded into FAISS offline system")
                
        return success
    
    def _select_optimal_model(self, query: str, model_preference: Optional[str] = None) -> str:
        """Select the optimal model for a given query"""
        
        # If user specified a preference and it's available, use it
        if model_preference and model_preference in self.available_models:
            print(f"🎯 Using user-preferred model: {model_preference}")
            return model_preference
        
        # Prioritize offline models if available (FAISS)
        if "faiss" in self.available_models:
            print("🔋 Using FAISS offline model (no API required)")
            return "faiss"
        
        # Fallback to online models
        if "mistral" in self.available_models:
            return "mistral"
        
        # Last resort: base system
        return "base"
    
    def _route_query_intelligently(self, query: str) -> str:
        """Intelligently route query to appropriate model based on content"""
        
        query_lower = query.lower()
        
        # For offline preference, always try FAISS first
        if "faiss" in self.available_models:
            return "faiss"
        
        # Analysis queries - route to most capable model
        analysis_keywords = ["analyze", "analisis", "summary", "ringkasan", "insight", "pattern"]
        if any(keyword in query_lower for keyword in analysis_keywords):
            return self._select_optimal_model(query)
        
        # Simple factual queries - FAISS is perfect for this
        factual_keywords = ["who", "siapa", "when", "kapan", "where", "dimana", "what", "apa"]
        if any(keyword in query_lower for keyword in factual_keywords):
            if "faiss" in self.available_models:
                return "faiss"
            return "base"
        
        # Default to optimal model
        return self._select_optimal_model(query)
    
    def smart_query(self, query: str, session_id: str = "default", 
                   model_preference: Optional[str] = None, 
                   use_smart_routing: bool = True) -> Dict[str, Any]:
        """Enhanced query with smart model selection"""
        
        if not self.current_file_data:
            return {
                "response": "No transcription data has been loaded yet. Please load a transcript first.",
                "sources": [],
                "confidence": 0.0,
                "model_used": "none"
            }
        
        try:
            # Determine which model to use
            if use_smart_routing and not model_preference:
                selected_model = self._route_query_intelligently(query)
            else:
                selected_model = self._select_optimal_model(query, model_preference)
            
            print(f"🤖 Multi-model: Selected model '{selected_model}' for query")
            
            # Route to appropriate processing method
            if selected_model == "base" or selected_model not in self.available_models:
                # Use base chat system
                result = self.base_chat_system.query(query, session_id)
                result["model_used"] = "base_chat_system"
                return result
            
            elif selected_model == "faiss":
                # Use FAISS offline system
                return self._query_with_faiss(query, session_id)
            
            elif selected_model == "mistral":
                return self._query_with_mistral(query, session_id)
            
            else:
                # Fallback to base system
                result = self.base_chat_system.query(query, session_id)
                result["model_used"] = "fallback"
                return result
                
        except Exception as e:
            print(f"❌ Multi-model chat error: {e}")
            # Fallback to base system on error
            result = self.base_chat_system.query(query, session_id)
            result["model_used"] = "error_fallback"
            return result
    
    def _query_with_faiss(self, query: str, session_id: str) -> Dict[str, Any]:
        """Query using FAISS offline system"""
        
        try:
            if not self.faiss_chat_system or not self.faiss_chat_system.is_available():
                return {
                    "response": "FAISS offline system is not available. Please install dependencies: pip install faiss-cpu sentence-transformers",
                    "sources": [],
                    "confidence": 0.0,
                    "model_used": "faiss_unavailable"
                }
            
            # Delegate to FAISS system
            result = self.faiss_chat_system.query(query, session_id)
            
            # Ensure model_used is set correctly
            result["model_used"] = "faiss_offline"
            
            return result
            
        except Exception as e:
            print(f"❌ FAISS query error: {e}")
            # Fallback to base system
            result = self.base_chat_system.query(query, session_id)
            result["model_used"] = "faiss_error_fallback"
            return result

    def _query_with_mistral(self, query: str, session_id: str) -> Dict[str, Any]:
        """Enhanced Mistral query with better prompting"""
        
        try:
            # Build enhanced context
            context = self.base_chat_system._build_context_from_data()
            
            # Enhanced system prompt for better responses
            system_prompt = """Anda adalah asisten AI expert untuk analisis meeting dan percakapan bisnis. 
Anda memiliki kemampuan untuk:
1. Menganalisis transkrip meeting secara mendalam
2. Mengidentifikasi pola komunikasi dan dinamika diskusi
3. Memberikan insight strategis dan actionable recommendations
4. Menjawab pertanyaan dengan detail dan konteks yang relevan

Berikan jawaban yang informatif, terstruktur, dan actionable. 
Gunakan bahasa Indonesia yang profesional namun mudah dipahami."""
            
            # Enhanced user prompt with better structure
            user_prompt = f"""Berdasarkan data meeting/percakapan berikut:

{context}

PERTANYAAN: {query}

Berikan jawaban yang komprehensif dengan struktur:
1. **Jawaban Langsung**: Respon utama terhadap pertanyaan
2. **Detail & Konteks**: Informasi pendukung dari transkrip
3. **Insight Tambahan**: Observasi atau pola menarik (jika relevan)

Pastikan jawaban akurat dan berdasarkan data yang tersedia."""
            
            # Query Mistral with enhanced settings
            response = self.mistral_client.chat.complete(
                model="mistral-large-latest",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,  # Lower temperature for more focused responses
                max_tokens=1200   # Increased token limit for detailed responses
            )
            
            answer = response.choices[0].message.content
            
            # Store in session history
            if session_id not in self.session_history:
                self.session_history[session_id] = []
            
            self.session_history[session_id].append({
                "query": query,
                "response": answer,
                "model_used": "mistral-enhanced",
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "response": answer,
                "sources": [
                    {"type": "transcript", "content": "Enhanced analysis of meeting transcript"},
                    {"type": "ai_model", "content": "Mistral AI Large Model"}
                ],
                "confidence": 0.9,
                "model_used": "mistral-enhanced"
            }
            
        except Exception as e:
            print(f"❌ Enhanced Mistral query error: {e}")
            # Fallback to base system
            result = self.base_chat_system.query(query, session_id)
            result["model_used"] = "mistral_error_fallback"
            return result
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get information about available models"""
        models_info = {}
        
        # Add base system info
        models_info["base"] = {
            "name": "Base Chat System",
            "capabilities": ["basic_chat", "transcript_query"],
            "status": "available"
        }
        
        # Add configured models
        for model_key, model_info in self.available_models.items():
            models_info[model_key] = {
                "name": model_key.title(),
                "capabilities": model_info.get("capabilities", []),
                "status": "available",
                "priority": model_info.get("priority", 0)
            }
        
        return models_info
    
    def get_model_recommendations(self, query: str) -> Dict[str, Any]:
        """Get model recommendations for a specific query"""
        
        query_lower = query.lower()
        recommendations = []
        
        # Analyze query characteristics
        is_analytical = any(word in query_lower for word in ["analyze", "analisis", "insight", "pattern", "trend"])
        is_factual = any(word in query_lower for word in ["who", "siapa", "when", "kapan", "what", "apa"])
        is_summary = any(word in query_lower for word in ["summary", "ringkasan", "overview"])
        
        if is_analytical and "mistral" in self.available_models:
            recommendations.append({
                "model": "mistral",
                "reason": "Best for analytical and insight-driven queries",
                "confidence": 0.9
            })
        
        if is_factual:
            recommendations.append({
                "model": "base",
                "reason": "Efficient for factual information retrieval",
                "confidence": 0.8
            })
        
        if is_summary and "mistral" in self.available_models:
            recommendations.append({
                "model": "mistral", 
                "reason": "Advanced summarization capabilities",
                "confidence": 0.85
            })
        
        # Default recommendation
        if not recommendations:
            if "mistral" in self.available_models:
                recommendations.append({
                    "model": "mistral",
                    "reason": "General purpose high-quality responses",
                    "confidence": 0.7
                })
            else:
                recommendations.append({
                    "model": "base",
                    "reason": "Available fallback option",
                    "confidence": 0.6
                })
        
        return {
            "query": query,
            "recommendations": recommendations,
            "analysis": {
                "is_analytical": is_analytical,
                "is_factual": is_factual,
                "is_summary": is_summary
            }
        }
    
    def get_session_history(self, session_id: str = "default") -> List[Dict]:
        """Get enhanced session history"""
        base_history = self.base_chat_system.get_session_history(session_id)
        multi_history = self.session_history.get(session_id, [])
        
        # Combine and sort by timestamp
        all_history = base_history + multi_history
        all_history.sort(key=lambda x: x.get("timestamp", ""))
        
        return all_history
    
    def clear_session(self, session_id: str = "default"):
        """Clear session history from all systems"""
        self.base_chat_system.clear_session(session_id)
        if session_id in self.session_history:
            del self.session_history[session_id]
