const OpenAI = require("openai");
const fs = require("fs-extra");
const path = require("path");

// Initialize OpenAI client
let openaiClient = null;

if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

class ChatService {
  constructor() {
    this.transcriptionData = new Map(); // Store loaded transcriptions
    this.chatHistory = new Map(); // Store chat sessions
  }

  /**
   * Load transcription data for chat analysis
   */
  async loadTranscriptionData(resultFilePath) {
    try {
      if (!(await fs.pathExists(resultFilePath))) {
        console.error(`Result file not found: ${resultFilePath}`);
        return false;
      }

      const data = await fs.readJson(resultFilePath);
      const jobId =
        data.job_id || path.basename(resultFilePath, "_result.json");

      // Store the transcription data
      this.transcriptionData.set(jobId, {
        transcript: data.transcript || [],
        summary: data.summary || "",
        action_items: data.action_items || [],
        key_decisions: data.key_decisions || [],
        speakers: data.speakers || [],
        filename: data.filename || "Unknown",
        duration: data.duration || 0,
        word_count: data.word_count || 0,
      });

      console.log(`📚 Loaded transcription data for job: ${jobId}`);
      return true;
    } catch (error) {
      console.error("Error loading transcription data:", error);
      return false;
    }
  }

  /**
   * Process a chat query about the loaded transcription
   */
  async processQuery(query, sessionId = "default", fileId = null) {
    try {
      // Get or create chat session
      if (!this.chatHistory.has(sessionId)) {
        this.chatHistory.set(sessionId, []);
      }

      const session = this.chatHistory.get(sessionId);

      // Get transcription data if fileId is provided
      let transcriptionContext = null;
      if (fileId && this.transcriptionData.has(fileId)) {
        transcriptionContext = this.transcriptionData.get(fileId);
      } else if (this.transcriptionData.size > 0) {
        // Use the most recently loaded transcription
        const entries = Array.from(this.transcriptionData.entries());
        transcriptionContext = entries[entries.length - 1][1];
      }

      let response;
      let sources = [];
      let confidence = 0.8;

      if (!openaiClient) {
        // Fallback to rule-based responses
        response = this.generateRuleBasedResponse(query, transcriptionContext);
        sources = this.findRelevantSources(query, transcriptionContext);
      } else {
        // Use OpenAI for intelligent responses
        const result = await this.generateAIResponse(
          query,
          transcriptionContext,
          session
        );
        response = result.response;
        sources = result.sources;
        confidence = result.confidence;
      }

      // Add to chat history
      session.push({
        query: query,
        response: response,
        timestamp: new Date().toISOString(),
        sources: sources,
      });

      // Limit session history to last 20 exchanges
      if (session.length > 20) {
        session.splice(0, session.length - 20);
      }

      return {
        response: response,
        sources: sources,
        confidence: confidence,
      };
    } catch (error) {
      console.error("Chat processing error:", error);
      return {
        response:
          "I apologize, but I'm having trouble processing your question right now. Please try again or rephrase your question.",
        sources: [],
        confidence: 0.1,
      };
    }
  }

  /**
   * Generate AI-powered response using OpenAI
   */
  async generateAIResponse(query, transcriptionContext, chatHistory) {
    try {
      let contextText = "";
      let sources = [];

      if (transcriptionContext) {
        // Build context from transcription
        const transcriptText = transcriptionContext.transcript
          .map(
            (seg) =>
              `${seg.speaker_name} (${seg.start.toFixed(1)}s): ${seg.text}`
          )
          .join("\n");

        contextText = `
Meeting: ${transcriptionContext.filename}
Duration: ${transcriptionContext.duration}s
Participants: ${transcriptionContext.speakers.join(", ")}

Summary: ${transcriptionContext.summary}

Transcript:
${transcriptText}

Action Items:
${JSON.stringify(transcriptionContext.action_items, null, 2)}

Key Decisions:
${JSON.stringify(transcriptionContext.key_decisions, null, 2)}
`;

        // Find relevant sources
        sources = this.findRelevantSources(query, transcriptionContext);
      }

      // Build conversation history
      const recentHistory = chatHistory.slice(-5); // Last 5 exchanges
      const historyText = recentHistory
        .map((item) => `User: ${item.query}\nAssistant: ${item.response}`)
        .join("\n\n");

      const prompt = `You are an intelligent meeting assistant analyzing a conversation transcript. Answer the user's question based on the meeting data provided.

${contextText ? `Meeting Context:\n${contextText}\n` : ""}
${historyText ? `Recent Conversation:\n${historyText}\n` : ""}

User Question: ${query}

Please provide a helpful and accurate answer based on the meeting transcript and context. If the information isn't available in the transcript, say so clearly.`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful meeting assistant. Provide accurate answers based on the transcript data. If information isn't available, be honest about limitations. Keep responses concise but informative.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      return {
        response: response.choices[0].message.content.trim(),
        sources: sources,
        confidence: 0.85,
      };
    } catch (error) {
      console.error("AI response generation error:", error);
      throw error;
    }
  }

  /**
   * Generate rule-based response when AI is not available
   */
  generateRuleBasedResponse(query, transcriptionContext) {
    const lowerQuery = query.toLowerCase();

    if (!transcriptionContext) {
      return "I don't have any meeting transcript loaded to analyze. Please upload and process an audio file first.";
    }

    // Summary questions
    if (lowerQuery.includes("summary") || lowerQuery.includes("summarize")) {
      return (
        transcriptionContext.summary ||
        "No summary is available for this meeting."
      );
    }

    // Speaker questions
    if (
      lowerQuery.includes("speaker") ||
      lowerQuery.includes("who") ||
      lowerQuery.includes("participant")
    ) {
      const speakers = transcriptionContext.speakers || [];
      return speakers.length > 0
        ? `The speakers in this meeting were: ${speakers.join(", ")}.`
        : "Speaker information is not available.";
    }

    // Duration questions
    if (
      lowerQuery.includes("duration") ||
      lowerQuery.includes("long") ||
      lowerQuery.includes("time")
    ) {
      const duration = transcriptionContext.duration || 0;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return `The meeting was ${minutes} minutes and ${seconds} seconds long.`;
    }

    // Action items
    if (
      lowerQuery.includes("action") ||
      lowerQuery.includes("task") ||
      lowerQuery.includes("todo")
    ) {
      const actionItems = transcriptionContext.action_items || [];
      if (actionItems.length === 0) {
        return "No specific action items were identified in this meeting.";
      }
      return `Here are the action items from the meeting:\n${actionItems
        .map(
          (item, index) =>
            `${index + 1}. ${item.task} (Assigned to: ${
              item.assignee
            }, Deadline: ${item.deadline})`
        )
        .join("\n")}`;
    }

    // Key decisions
    if (
      lowerQuery.includes("decision") ||
      lowerQuery.includes("decide") ||
      lowerQuery.includes("conclusion")
    ) {
      const decisions = transcriptionContext.key_decisions || [];
      if (decisions.length === 0) {
        return "No specific decisions were identified in this meeting.";
      }
      return `Here are the key decisions from the meeting:\n${decisions
        .map(
          (decision, index) =>
            `${index + 1}. ${decision.decision}\nReasoning: ${
              decision.reasoning
            }`
        )
        .join("\n\n")}`;
    }

    // Transcript search
    if (
      lowerQuery.includes("said") ||
      lowerQuery.includes("mention") ||
      lowerQuery.includes("discuss")
    ) {
      const transcript = transcriptionContext.transcript || [];
      const relevantSegments = transcript.filter((seg) =>
        seg.text
          .toLowerCase()
          .includes(lowerQuery.replace(/.*(?:said|mention|discuss)\s*/i, ""))
      );

      if (relevantSegments.length > 0) {
        return `Here's what was mentioned:\n${relevantSegments
          .slice(0, 3)
          .map((seg) => `${seg.speaker_name}: "${seg.text}"`)
          .join("\n")}`;
      }
    }

    // Default response
    return `I found a meeting transcript with ${
      transcriptionContext.transcript?.length || 0
    } segments from ${
      transcriptionContext.speakers?.length || 0
    } speakers. You can ask me about the summary, speakers, action items, key decisions, or search for specific topics mentioned in the conversation.`;
  }

  /**
   * Find relevant sources/segments for the query
   */
  findRelevantSources(query, transcriptionContext) {
    if (!transcriptionContext || !transcriptionContext.transcript) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(" ").filter((word) => word.length > 3);

    const relevantSources = [];

    transcriptionContext.transcript.forEach((segment) => {
      const segmentText = segment.text.toLowerCase();
      const matchCount = queryWords.reduce((count, word) => {
        return count + (segmentText.includes(word) ? 1 : 0);
      }, 0);

      if (matchCount > 0) {
        relevantSources.push({
          speaker: segment.speaker_name,
          text: segment.text,
          timestamp: `${Math.floor(segment.start / 60)}:${String(
            Math.floor(segment.start % 60)
          ).padStart(2, "0")}`,
          relevance: matchCount / queryWords.length,
        });
      }
    });

    // Sort by relevance and return top 3
    return relevantSources
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);
  }

  /**
   * Get chat history for a session
   */
  getChatHistory(sessionId = "default") {
    return this.chatHistory.get(sessionId) || [];
  }

  /**
   * Clear chat history for a session
   */
  clearChatHistory(sessionId = "default") {
    this.chatHistory.delete(sessionId);
    return true;
  }

  /**
   * Get all loaded transcriptions
   */
  getLoadedTranscriptions() {
    return Array.from(this.transcriptionData.keys());
  }
}

module.exports = new ChatService();
