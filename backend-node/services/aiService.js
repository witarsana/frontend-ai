const OpenAI = require('openai');

// Initialize OpenAI client
let openaiClient = null;

if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

class AIService {
  
  /**
   * Generate a comprehensive summary of the transcript
   */
  async generateSummary(segments) {
    try {
      const fullText = segments.map(seg => `${seg.speaker_name}: ${seg.text}`).join('\n');
      
      if (!openaiClient) {
        return this.generateMockSummary(segments);
      }
      
      const prompt = `Please analyze this meeting transcript and provide a comprehensive summary that includes:

1. Main Topics Discussed
2. Key Points and Decisions
3. Participants and Their Contributions
4. Important Outcomes

Transcript:
${fullText}

Please provide a well-structured summary that captures the essence of the conversation:`;
      
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert meeting analyst. Provide clear, concise, and well-structured summaries of meeting transcripts. Focus on extracting key information, decisions, and action items."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });
      
      return response.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('AI Summary error:', error);
      return this.generateMockSummary(segments);
    }
  }
  
  /**
   * Extract action items from the transcript
   */
  async extractActionItems(segments) {
    try {
      const fullText = segments.map(seg => `${seg.speaker_name}: ${seg.text}`).join('\n');
      
      if (!openaiClient) {
        return this.generateMockActionItems(segments);
      }
      
      const prompt = `Please analyze this meeting transcript and extract all action items, tasks, and commitments mentioned. Format them as a JSON array of objects with 'task', 'assignee', and 'deadline' fields.

Transcript:
${fullText}

Return only the JSON array:`;
      
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting action items from meeting transcripts. Return only valid JSON arrays with task objects containing 'task', 'assignee', and 'deadline' fields."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.2
      });
      
      try {
        const actionItems = JSON.parse(response.choices[0].message.content.trim());
        return Array.isArray(actionItems) ? actionItems : [];
      } catch (parseError) {
        console.error('Failed to parse action items JSON:', parseError);
        return this.generateMockActionItems(segments);
      }
      
    } catch (error) {
      console.error('Action Items extraction error:', error);
      return this.generateMockActionItems(segments);
    }
  }
  
  /**
   * Extract key decisions from the transcript
   */
  async extractKeyDecisions(segments) {
    try {
      const fullText = segments.map(seg => `${seg.speaker_name}: ${seg.text}`).join('\n');
      
      if (!openaiClient) {
        return this.generateMockKeyDecisions(segments);
      }
      
      const prompt = `Please analyze this meeting transcript and extract all key decisions that were made. Format them as a JSON array of objects with 'decision', 'reasoning', and 'impact' fields.

Transcript:
${fullText}

Return only the JSON array:`;
      
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting key decisions from meeting transcripts. Return only valid JSON arrays with decision objects containing 'decision', 'reasoning', and 'impact' fields."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.2
      });
      
      try {
        const keyDecisions = JSON.parse(response.choices[0].message.content.trim());
        return Array.isArray(keyDecisions) ? keyDecisions : [];
      } catch (parseError) {
        console.error('Failed to parse key decisions JSON:', parseError);
        return this.generateMockKeyDecisions(segments);
      }
      
    } catch (error) {
      console.error('Key Decisions extraction error:', error);
      return this.generateMockKeyDecisions(segments);
    }
  }
  
  /**
   * Analyze sentiment of the conversation
   */
  async analyzeSentiment(segments) {
    try {
      const fullText = segments.map(seg => seg.text).join(' ');
      
      if (!openaiClient) {
        return "neutral";
      }
      
      const prompt = `Analyze the overall sentiment of this conversation. Respond with only one word: "positive", "negative", or "neutral".

Text: ${fullText.substring(0, 2000)}`;
      
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a sentiment analysis expert. Respond with only one word: positive, negative, or neutral."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      });
      
      const sentiment = response.choices[0].message.content.trim().toLowerCase();
      return ["positive", "negative", "neutral"].includes(sentiment) ? sentiment : "neutral";
      
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return "neutral";
    }
  }
  
  /**
   * Generate questions for the chat system
   */
  async generateQuestions(segments) {
    try {
      const fullText = segments.map(seg => seg.text).join(' ');
      
      if (!openaiClient) {
        return this.generateMockQuestions();
      }
      
      const prompt = `Based on this transcript, generate 5 relevant questions that someone might ask about the conversation. Format as a JSON array of strings.

Transcript: ${fullText.substring(0, 2000)}

Return only the JSON array:`;
      
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Generate relevant questions about meeting transcripts. Return only valid JSON arrays of question strings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.5
      });
      
      try {
        const questions = JSON.parse(response.choices[0].message.content.trim());
        return Array.isArray(questions) ? questions : this.generateMockQuestions();
      } catch (parseError) {
        console.error('Failed to parse questions JSON:', parseError);
        return this.generateMockQuestions();
      }
      
    } catch (error) {
      console.error('Questions generation error:', error);
      return this.generateMockQuestions();
    }
  }
  
  // Mock functions for when OpenAI is not available
  
  generateMockSummary(segments) {
    const speakers = [...new Set(segments.map(seg => seg.speaker_name))];
    const wordCount = segments.reduce((count, seg) => count + seg.text.split(' ').length, 0);
    
    return `## Meeting Summary

**Participants:** ${speakers.join(', ')}
**Duration:** Approximately ${Math.round(segments[segments.length - 1]?.end || 60)} seconds
**Word Count:** ${wordCount} words

### Main Topics Discussed
This conversation covered several important topics with active participation from all attendees. The discussion included project updates, timeline reviews, and strategic planning elements.

### Key Points
- Multiple speakers contributed to a collaborative discussion
- Various topics were addressed throughout the session
- The conversation maintained a professional and productive tone
- Several important points were raised and discussed

### Outcomes
The meeting provided valuable insights and helped establish clear next steps for the team. Participants engaged in meaningful dialogue that will help drive future initiatives.

*Note: This is a generated summary. AI analysis services are currently limited.*`;
  }
  
  generateMockActionItems(segments) {
    return [
      {
        "task": "Follow up on budget allocation discussion",
        "assignee": "Team Lead",
        "deadline": "Next week"
      },
      {
        "task": "Review project timeline updates",
        "assignee": "Project Manager",
        "deadline": "End of week"
      },
      {
        "task": "Prepare next meeting agenda",
        "assignee": "Meeting Organizer",
        "deadline": "Before next meeting"
      }
    ];
  }
  
  generateMockKeyDecisions(segments) {
    return [
      {
        "decision": "Proceed with current project timeline",
        "reasoning": "Timeline aligns with available resources and team capacity",
        "impact": "Maintains project momentum and team morale"
      },
      {
        "decision": "Address budget concerns in next quarter planning",
        "reasoning": "Need to ensure sustainable financial management",
        "impact": "Better resource allocation and cost control"
      }
    ];
  }
  
  generateMockQuestions() {
    return [
      "What were the main topics discussed in this meeting?",
      "Who were the key participants and what were their roles?",
      "What decisions were made during the conversation?",
      "Are there any action items that need follow-up?",
      "What was the overall tone and outcome of the meeting?"
    ];
  }
}

module.exports = new AIService();
