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
Here is a meeting/conversation transcript with multiple speakers. Create a comprehensive summary of the key points from this discussion:

{transcript_text}

Please create a summary that includes:
1. Main topics discussed
2. Important points from each speaker
3. Decisions or conclusions made
4. Action items (if any)

Format output in JSON:
{{
  "summary": "Complete summary with main topics, points per speaker, decisions, and action items",
  "action_items": ["Action item 1", "Action item 2"],
  "key_decisions": ["Decision 1", "Decision 2"]
}}

Ensure the summary is detailed and informative like a comprehensive meeting briefing. Output everything in ENGLISH.
"""

def get_comprehensive_summary_prompt(transcript_text):
    """Enhanced prompt for generating comprehensive summary with professional structure like mainSample.py"""
    return f"""
Based on the following meeting/conversation transcript, create a comprehensive summary like mainSample.py format:

TRANSCRIPT:
{transcript_text[:5000]}

TASK: Create a complete summary in an easy-to-read and informative format like a professional meeting briefing.

Format output in ENGLISH with the following COMPLETE 4 SECTIONS structure:

### Meeting Summary

#### Main Topics Discussed
1. **[Topic 1]**: Brief and informative explanation of the topic discussed
2. **[Topic 2]**: Brief and informative explanation of the topic discussed  
3. **[Topic 3]**: Brief and informative explanation of the topic discussed
4. **[Topic 4]**: Brief and informative explanation of the topic discussed (if any)
5. **[Topic 5]**: Brief and informative explanation of the topic discussed (if any)

#### Important Points from Each Speaker

**[Speaker 1 Name]**
- **[Topic/Aspect 1]**: [Speaker 1's contribution and viewpoint on this topic]
- **[Topic/Aspect 2]**: [Speaker 1's contribution and viewpoint on this topic]
- **[Topic/Aspect 3]**: [Speaker 1's contribution and viewpoint on this topic]

**[Speaker 2 Name]**
- **[Topic/Aspect 1]**: [Speaker 2's contribution and viewpoint on this topic]
- **[Topic/Aspect 2]**: [Speaker 2's contribution and viewpoint on this topic]
- **[Topic/Aspect 3]**: [Speaker 2's contribution and viewpoint on this topic]

#### Decisions or Conclusions Made
1. [First important decision based on discussion]
2. [Second important decision based on discussion]
3. [Third important decision based on discussion]
4. [Fourth important decision based on discussion (if any)]
5. [Fifth important decision based on discussion (if any)]

#### Action Items
1. **[Priority]**: [Specific and actionable item]
2. **[Priority]**: [Specific and actionable item]
3. **[Priority]**: [Specific and actionable item]
4. **[Priority]**: [Specific and actionable item]
5. **[Priority]**: [Specific and actionable item]

IMPORTANT RULES:
1. MUST have 4 complete sections: (1) Main Topics Discussed, (2) Important Points from Each Speaker, (3) Decisions or Conclusions Made, (4) Action Items
2. CANNOT skip the "Important Points from Each Speaker" section - this section is MANDATORY
3. Each speaker MUST be identified with name/role and their contributions explained
4. Use comprehensive and easy-to-understand ENGLISH
5. Ensure each section is filled with complete and adequate details
6. OUTPUT in MARKDOWN text format, NOT JSON - summary saved as plain string
7. "Important Points from Each Speaker" section is MANDATORY and cannot be skipped
8. Ensure text output is safe for JSON encoding (avoid special characters that could corrupt JSON)
9. SECTION ORDER must be: Main Topics → Speaker Points → Decisions → Action Items
"""

def get_unified_analysis_prompt(transcript_text):
    """
    Unified prompt that generates all data separately without redundancy
    Returns: summary (narrative only), speaker_points, action_items, key_decisions
    """
    return f"""
Based on the following transcript, create a comprehensive analysis with SEPARATED sections (NO REDUNDANCY):

TRANSCRIPT:
{transcript_text[:5000]}

Generate a JSON response with 4 distinct sections:

1. NARRATIVE SUMMARY - Only main topics and overview (NO speaker details, NO decisions, NO action items)
2. SPEAKER POINTS - Detailed points per speaker  
3. KEY DECISIONS - Important decisions made
4. ACTION ITEMS - Specific actionable tasks

JSON FORMAT (EXACTLY THIS STRUCTURE):
{{
  "narrative_summary": "### Meeting Summary\\n\\n#### Main Topics Discussed\\n\\n1. **Topic 1**: Description...\\n2. **Topic 2**: Description...\\n\\n[NARRATIVE OVERVIEW ONLY - NO speaker points, decisions, or action items]",
  "speaker_points": [
    {{
      "speaker": "Speaker 1 (Name)",
      "points": [
        "Key point 1 from this speaker",
        "Key point 2 from this speaker", 
        "Key point 3 from this speaker"
      ]
    }},
    {{
      "speaker": "Speaker 2 (Name)", 
      "points": [
        "Key point 1 from this speaker",
        "Key point 2 from this speaker"
      ]
    }}
  ],
  "key_decisions": [
    "Important decision 1 made during discussion",
    "Important decision 2 made during discussion",
    "Important decision 3 made during discussion"
  ],
  "action_items": [
    "High Priority: Specific actionable task 1",
    "Medium Priority: Specific actionable task 2", 
    "Strategic: Long-term action 3",
    "Quick Win: Easy implementation task 4",
    "Follow-up: Monitoring/review task 5"
  ]
}}

CRITICAL RULES:
- narrative_summary MUST NOT contain speaker points, decisions, or action items
- Each section serves different purpose - NO OVERLAP
- speaker_points contains detailed speaker contributions
- key_decisions contains actual decisions made
- action_items contains specific actionable tasks
- Output ONLY valid JSON, no extra text
- Use actual content from transcript
"""

# ===== ENHANCED CHAT PROMPTS =====

def get_enhanced_summary_prompt(context: str, query: str) -> str:
    """
    Prompt for enhanced summary with structured format
    Used in: multi_model_chat.py -> _build_mistral_prompt()
    """
    return f"""Based on the following meeting/conversation transcript, provide a complete and structured analysis in English.

CONTEXT:
{context}

USER QUERY: {query}

INSTRUCTIONS:
Analyze this transcript with a neat and structured format. Provide a comprehensive answer using the following format:

### 📋 MAIN TOPICS DISCUSSED
- **Topic 1**: Detailed explanation about this topic
- **Topic 2**: Detailed explanation about this topic
[etc...]

### 👥 SPEAKER CONTRIBUTIONS
- **Speaker 1**:
  - Main points presented
  - Role in discussion
  - Specific contributions

- **Speaker 2**:
  - Main points presented
  - Role in discussion
  - Specific contributions

### 🎯 KEY POINTS & INSIGHTS
- **Insight 1**: Explanation of important insight
- **Insight 2**: Explanation of important insight
[etc...]

### ✅ ACTION ITEMS & NEXT STEPS (if any)
- Specific action item with assigned person if mentioned
- Timeline or deadline if available
- Follow-up needed

IMPORTANT:
- Use markdown format with emojis for clear structure
- Provide in-depth and professional analysis
- Focus on valuable and useful insights
- If no explicit action items, write "No action items were explicitly mentioned in the transcript."

Answer with the structured format above, don't just give short answers."""

def get_standard_chat_prompt(context: str, query: str) -> str:
    """
    Standard prompt for regular chat (not summary)
    Used in: multi_model_chat.py -> _build_mistral_prompt()
    """
    return f"""Based on the following meeting/conversation transcript, answer the user's question accurately and helpfully.

CONTEXT:
{context}

USER QUESTION: {query}

INSTRUCTIONS:
- Answer the question based on information available in the transcript
- Provide clear and informative answers
- If information is not available in transcript, explain politely
- Use natural and professional English
- Include examples or quotes from transcript if relevant

Answer the user's question focusing on information available in the transcript."""

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
        "summary", "summarize", "conclusions", "main points", "overview",
        "ringkas", "rangkum", "simpulkan", "kesimpulan",
        "ringkasan", "poin utama", "inti", "garis besar",
        "buatlah ringkasan", "berikan ringkasan", "format terstruktur",
        "key points", "brief", "outline", "highlights", "recap"
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
