"""
AI Prompts Management - Centralized Prompt System
=================================================

File ini berisi semua prompt yang digunakan di sistem AI untuk:
1. Summary Generation (transcription summary)
2. Enhanced Chat (multi-model chat system)
3. Fallback responses

Memudahkan maintenance dan customization prompt tanpa edit kode utama.
"""

# ===== SUMMARY GENERATION PROMPTS =====

def get_summary_prompt(transcript_text):
    """Simple but effective prompt based on proven sample script"""
    return f"""
Berikut adalah transkrip meeting/percakapan dengan beberapa pembicara. Buatkan ringkasan berupa poin-poin penting dari diskusi ini:

{transcript_text}

Tolong buat ringkasan yang mencakup:
1. Topik utama yang dibahas
2. Poin-poin penting dari setiap pembicara
3. Keputusan atau kesimpulan yang diambil
4. Action items (jika ada)

Format output dalam JSON:
{{
  "summary": "Ringkasan lengkap dengan topik utama, poin per pembicara, keputusan, dan action items",
  "action_items": ["Action item 1", "Action item 2"],
  "key_decisions": ["Keputusan 1", "Keputusan 2"]
}}

Pastikan summary detail dan informatif seperti briefing meeting yang komprehensif.
"""

# ===== ENHANCED CHAT PROMPTS =====

def get_enhanced_summary_prompt(context: str, query: str) -> str:
    """
    Prompt untuk enhanced summary dengan format terstruktur
    Digunakan di: multi_model_chat.py -> _build_mistral_prompt()
    """
    return f"""Berdasarkan transcript meeting/percakapan berikut, berikan analisis lengkap dan terstruktur dalam bahasa Indonesia.

CONTEXT:
{context}

USER QUERY: {query}

INSTRUKSI:
Analisis transcript ini dengan format yang rapi dan terstruktur. Berikan jawaban yang comprehensive dengan menggunakan format berikut:

### 📋 TOPIK UTAMA YANG DIBAHAS
- **Topik 1**: Penjelasan detail tentang topik ini
- **Topik 2**: Penjelasan detail tentang topik ini
[dst...]

### 👥 KONTRIBUSI PEMBICARA
- **Pembicara 1**:
  - Poin utama yang disampaikan
  - Peran dalam diskusi
  - Kontribusi spesifik

- **Pembicara 2**:
  - Poin utama yang disampaikan
  - Peran dalam diskusi
  - Kontribusi spesifik

### 🎯 POIN KUNCI & INSIGHT
- **Insight 1**: Penjelasan insight penting
- **Insight 2**: Penjelasan insight penting
[dst...]

### ✅ ACTION ITEMS & NEXT STEPS (jika ada)
- Action item spesifik dengan PIC jika disebutkan
- Timeline atau deadline jika ada
- Follow-up yang perlu dilakukan

PENTING:
- Gunakan format markdown dengan emoji untuk struktur yang jelas
- Berikan analisis yang mendalam dan professional
- Fokus pada value dan insights yang berguna
- Jika tidak ada action items eksplisit, tulis "Tidak ada action items yang secara eksplisit disebutkan dalam transcript."

Jawab dengan format terstruktur di atas, jangan hanya jawaban singkat."""

def get_standard_chat_prompt(context: str, query: str) -> str:
    """
    Prompt standar untuk chat biasa (bukan summary)
    Digunakan di: multi_model_chat.py -> _build_mistral_prompt()
    """
    return f"""Berdasarkan transcript meeting/percakapan berikut, jawab pertanyaan user dengan akurat dan helpful.

CONTEXT:
{context}

USER QUESTION: {query}

INSTRUKSI:
- Jawab pertanyaan berdasarkan informasi yang ada di transcript
- Berikan jawaban yang jelas dan informatif
- Jika informasi tidak tersedia di transcript, jelaskan dengan sopan
- Gunakan bahasa Indonesia yang natural dan professional
- Sertakan contoh atau kutipan dari transcript jika relevan

Jawab pertanyaan user dengan fokus pada informasi yang tersedia di transcript."""

# ===== FALLBACK RESPONSES =====

def get_fallback_responses():
    """
    Default responses ketika AI tidak tersedia
    """
    return {
        "summary_fallback": {
            "summary": "This audio content has been successfully transcribed and analyzed. The recording captured a conversation between participants discussing various topics of interest. The discussion included meaningful exchanges and communication between the speakers. The transcript provides an accurate record of the spoken content with speaker identification and timing information for detailed review and reference.",
            "action_items": [
                "Review the complete transcript for any mentioned tasks or follow-ups",
                "Analyze the discussion content for relevant next steps or commitments"
            ],
            "key_decisions": [
                "Audio content successfully processed and transcribed with speaker identification"
            ],
            "tags": ["audio-transcription", "conversation", "content-analysis"],
            "participants": ["Speaker 1", "Speaker 2"],
            "meeting_type": "conversation",
            "sentiment": "neutral"
        },
        
        "chat_not_available": "Chat system is currently being set up. In the meantime, you can explore the transcript, summary, and analytics tabs to learn about your meeting content.",
        
        "enhanced_chat_not_available": "Enhanced chat system is currently being set up. Your question has been noted. Please check the transcript, summary, and analytics tabs for detailed information about your meeting.",
        
        "load_error": "Sorry, I encountered an error while processing your question. Please try again or check the other tabs for information about your meeting."
    }

# ===== UTILITY FUNCTIONS =====

def truncate_transcript(transcript_text: str, max_length: int = 6000) -> str:
    """
    Truncate transcript untuk prompt yang terlalu panjang
    """
    if len(transcript_text) <= max_length:
        return transcript_text
    
    # Take first part and last part to capture beginning and end
    first_part = transcript_text[:max_length//2]
    last_part = transcript_text[-(max_length//2):]
    
    return first_part + "\n\n[...transcript continues...]\n\n" + last_part

def is_summary_query(query: str) -> bool:
    """
    Deteksi apakah query meminta summary/ringkasan
    """
    summary_keywords = [
        "ringkas", "summary", "rangkum", "simpulkan", "kesimpulan",
        "ringkasan", "poin utama", "inti", "garis besar", "overview",
        "buatlah ringkasan", "berikan ringkasan", "format terstruktur"
    ]
    
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in summary_keywords)

# ===== PROMPT VALIDATION =====

def validate_prompt_length(prompt: str, max_length: int = 8000) -> bool:
    """
    Validasi panjang prompt untuk mencegah error
    """
    return len(prompt) <= max_length

def get_prompt_stats(prompt: str) -> dict:
    """
    Get statistik prompt untuk debugging
    """
    return {
        "length": len(prompt),
        "words": len(prompt.split()),
        "lines": len(prompt.split('\n')),
        "estimated_tokens": len(prompt) // 4  # Rough estimate
    }
