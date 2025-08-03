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
    Enhanced unified prompt focused on extracting rich Key Takeaways and specific Next Steps
    Returns: summary (narrative only), speaker_points, key_decisions (insights), enhanced_action_items (next steps)
    """
    return f"""
Based on the following transcript, extract MAXIMUM VALUE by deeply analyzing the content for rich insights and actionable next steps:

TRANSCRIPT:
{transcript_text[:8000]}

Analyze this content thoroughly and generate a JSON response with 4 distinct sections:

1. NARRATIVE SUMMARY - Only main topics and overview (NO speaker details, NO decisions, NO action items)
2. SPEAKER POINTS - Detailed points per speaker with their specific contributions and expertise  
3. KEY TAKEAWAYS - Extract 5-8 VALUABLE INSIGHTS from actual content discussed
4. NEXT STEPS - Extract 3-5 SPECIFIC ACTIONABLE ITEMS that are unique and directly relevant to this content

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
    {{
      "title": "[Specific insight/concept/framework title from actual conversation - NOT generic]",
      "description": "[Deep explanation of WHY this insight matters, HOW it works, specific context from the conversation, and practical implications. Make this educational and valuable.]",
      "category": "Framework|Concept|Insight|Strategy|Tool|Best Practice|Learning|Methodology|Principle",
      "impact": "High|Medium|Low",
      "actionable": true|false
    }}
  ],
  "enhanced_action_items": [
    {{
      "title": "[Specific action verb + unique details from this content]",
      "description": "[Detailed explanation of HOW to do this specific action, WHY it's important based on the content, and WHAT outcome to expect. Include specific context from the conversation.]",
      "priority": "High|Medium|Low",
      "category": "Immediate|Short-term|Strategic|Ongoing",
      "timeframe": "Today|This week|1-2 weeks|1-3 months|Ongoing",
      "assigned_to": "Self|Team|Organization",
      "tags": ["content-specific", "keywords", "from", "actual", "discussion"],
      "notion_ready": {{
        "title": "[Unique action title based on content]",
        "properties": {{
          "Priority": "High|Medium|Low",
          "Category": "Immediate|Short-term|Strategic|Ongoing", 
          "Due Date": "[Specific timeframe based on content]",
          "Assigned": "[Based on content context]",
          "Status": "Not Started"
        }}
      }}
    }}
  ]
}}

🎯 CRITICAL RULES FOR KEY TAKEAWAYS (key_decisions):
- ONLY extract insights that were ACTUALLY DISCUSSED in the conversation
- NO generic examples - every insight must be content-specific
- Focus on: concepts mentioned, frameworks explained, strategies discussed, tools shared, principles revealed
- Think: "What unique insight can I learn from THIS specific conversation?"
- Title: Use exact terminology/phrases from the conversation when possible
- Description: Explain WHY this insight is valuable with specific context from the discussion
- Make each takeaway feel like a "golden nugget" worth remembering and referencing
- Examples of content-specific insights:
  * If discussing stress: "The Battery Analogy for Mental Energy" (if actually mentioned)
  * If discussing leadership: "[Specific leadership principle mentioned by name]"
  * If discussing business: "[Specific strategy or framework discussed]"
- AVOID: generic insights that could apply to any conversation
- FOCUS: unique wisdom, specific methodologies, actual quotes/concepts shared

⚡ CRITICAL RULES FOR NEXT STEPS (enhanced_action_items):
- ONLY create actions that are DIRECTLY RELEVANT to the content discussed
- NO generic tasks - every action must be content-specific and unique
- Each action should be DISTINCTLY DIFFERENT with unique payloads for Notion
- Think: "What specific action should someone take based on THIS conversation?"
- Title: Start with action verb + specific details from the content
- Description: Include HOW to do it, WHY based on the content, specific context
- Make actions immediately valuable and uniquely tailored to this content
- Examples of content-specific actions:
  * If battery analogy discussed: "Assess Your Personal Battery Level Using [Specific Method Mentioned]"
  * If book mentioned: "Read '[Specific Book Title]' and Apply [Specific Concept Discussed]"
  * If tool shared: "Implement [Specific Tool/Method] for [Specific Use Case from Discussion]"
- Each action should have DIFFERENT priority, category, timeframe, and tags
- AVOID: generic actions like "Review transcript" or "Follow up"
- FOCUS: actions that apply the specific insights and recommendations from THIS conversation

🚫 ABSOLUTE PROHIBITIONS:
- NO static/generic content that could apply to any transcript
- NO placeholder examples in actual output
- NO repeated action items with same payload structure
- NO insights that weren't actually discussed
- NO actions that don't relate to specific content
- EVERY field must be uniquely filled based on actual conversation content

✅ SUCCESS CRITERIA:
- Key takeaways feel like premium content highlights worth saving
- Action items are so specific they could only come from THIS conversation
- Each action item has completely different Notion payload values
- Someone reading this would immediately know what specific content was discussed
- All insights and actions are directly traceable to actual conversation content"""

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

### ✅ ENHANCED ACTION ITEMS & TASK MANAGEMENT

**Immediate Actions (1-3 days):**
- **Title**: Clear task title
- **Description**: What needs to be done and why
- **Assigned**: Person or team responsible
- **Notion Ready**: Pre-formatted for project management

**Short-term Actions (1-2 weeks):**
- **Title**: Strategic implementation task
- **Priority**: High/Medium/Low classification
- **Category**: Timeframe and urgency level
- **Tags**: Relevant keywords for organization

**Strategic Initiatives (1+ months):**
- **Title**: Long-term planning task
- **Description**: Strategic context and requirements
- **Dependencies**: Related tasks and prerequisites
- **Notion Integration**: Ready for database import

**Ongoing Practices:**
- **Title**: Continuous improvement task
- **Description**: Regular monitoring and habits
- **Schedule**: Recurring timeframe
- **Success Metrics**: How to measure progress

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
            "enhanced_action_items": [
                {
                    "title": "Review Complete Transcript",
                    "description": "Thoroughly review the transcribed content for any mentioned commitments, deadlines, or follow-up requirements",
                    "priority": "Medium",
                    "category": "Immediate",
                    "timeframe": "1-3 days",
                    "assigned_to": "Team",
                    "tags": ["review", "analysis", "transcript"],
                    "notion_ready": {
                        "title": "Review Complete Transcript",
                        "properties": {
                            "Priority": "Medium",
                            "Category": "Immediate",
                            "Due Date": "3 days from now",
                            "Assigned": "Team",
                            "Status": "Not Started"
                        }
                    }
                },
                {
                    "title": "Implement Discussion Insights",
                    "description": "Apply learnings and recommendations identified during the conversation to relevant projects or processes",
                    "priority": "Low",
                    "category": "Short-term",
                    "timeframe": "1-2 weeks",
                    "assigned_to": "Team",
                    "tags": ["implementation", "insights", "follow-up"],
                    "notion_ready": {
                        "title": "Implement Discussion Insights",
                        "properties": {
                            "Priority": "Low",
                            "Category": "Short-term",
                            "Due Date": "2 weeks from now",
                            "Assigned": "Team",
                            "Status": "Not Started"
                        }
                    }
                }
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

def get_structured_data_extraction_prompt(transcript_text):
    """
    Prompt untuk ekstraksi data terstruktur dari transcript
    """
    return f"""
Extract structured data from this transcript:

{transcript_text}

Extract and format the following:
1. Action items
2. Key decisions  
3. Point of view from speakers

Format output as JSON:
{{
  "action_items": ["item1", "item2"],
  "key_decisions": ["decision1", "decision2"],  
  "point_of_view": ["perspective1", "perspective2"]
}}

Output in ENGLISH only.
"""

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
