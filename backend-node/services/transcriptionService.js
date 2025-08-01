const OpenAI = require("openai");
const { createClient } = require("@deepgram/sdk");
const { HfInference } = require("@huggingface/inference");
const fs = require("fs-extra");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const fetch = require("node-fetch");

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Initialize clients
let openaiClient = null;
let deepgramClient = null;
let hfClient = null;
let localWhisperClient = null;

// Check if local Whisper service is available
const LOCAL_WHISPER_URL =
  process.env.LOCAL_WHISPER_URL || "http://localhost:8000";

// Initialize local Whisper client
if (process.env.USE_LOCAL_WHISPER === "true" || !process.env.OPENAI_API_KEY) {
  localWhisperClient = {
    baseURL: LOCAL_WHISPER_URL,
    available: false,
  };

  // Check if local service is running
  checkLocalWhisperAvailability();
}

// Initialize OpenAI client if API key is available and not using local Whisper
if (process.env.OPENAI_API_KEY && process.env.USE_LOCAL_WHISPER !== "true") {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Initialize Deepgram client if API key is available
if (process.env.DEEPGRAM_API_KEY) {
  deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
}

// Initialize Hugging Face client if token is available
if (process.env.HUGGING_FACE_TOKEN) {
  hfClient = new HfInference(process.env.HUGGING_FACE_TOKEN);
}

/**
 * Check if local Whisper service is available
 */
async function checkLocalWhisperAvailability() {
  if (!localWhisperClient) return;

  try {
    const response = await fetch(`${LOCAL_WHISPER_URL}/health`, {
      method: "GET",
      timeout: 5000,
    });

    if (response.ok) {
      const health = await response.json();
      localWhisperClient.available = health.model_loaded;
      console.log(
        `🏠 Local Whisper service: ${
          localWhisperClient.available ? "AVAILABLE" : "NOT READY"
        }`
      );

      if (health.model_name) {
        console.log(
          `🤖 Local Whisper model: ${health.model_name} on ${health.device}`
        );
      }
    } else {
      localWhisperClient.available = false;
      console.log(
        `🏠 Local Whisper service: NOT AVAILABLE (status: ${response.status})`
      );
    }
  } catch (error) {
    localWhisperClient.available = false;
    console.log(`🏠 Local Whisper service: NOT AVAILABLE (${error.message})`);
  }
}

// Check local Whisper availability every 30 seconds
if (localWhisperClient) {
  setInterval(checkLocalWhisperAvailability, 30000);
}

class TranscriptionService {
  /**
   * Main transcription function - respects user's engine preference
   */
  async transcribeAudio(filePath, filename, preferredEngine = null) {
    try {
      console.log(`🎵 Starting transcription for: ${filename}`);
      if (preferredEngine) {
        console.log(`🎯 User preferred engine: ${preferredEngine}`);
      }

      // Get audio info
      const audioInfo = await this.getAudioInfo(filePath);
      console.log(
        `📊 Audio info: ${audioInfo.duration.toFixed(1)}s, ${audioInfo.format}`
      );

      // Map frontend engine names to internal names
      const engineMapping = {
        "faster-whisper": "openai",
        "openai-whisper": "openai",
        deepgram: "deepgram",
        huggingface: "huggingface",
      };

      const targetEngine = preferredEngine
        ? engineMapping[preferredEngine] || "openai"
        : "openai";
      console.log(`🔧 Target engine: ${targetEngine}`);

      // Check if user explicitly selected an engine
      const userSelectedEngine = preferredEngine && preferredEngine !== null;

      // Try the preferred engine first, but prioritize local Whisper if available
      if (
        targetEngine === "openai" &&
        (localWhisperClient?.available || openaiClient)
      ) {
        // Prefer local Whisper over cloud OpenAI if available
        const useLocalWhisper = localWhisperClient?.available;

        console.log(
          `🤖 Attempting ${
            useLocalWhisper ? "Local" : "Cloud"
          } OpenAI Whisper transcription ${
            userSelectedEngine ? "(user selected)" : "(default)"
          }...`
        );

        try {
          const result = useLocalWhisper
            ? await this.transcribeWithLocalWhisper(
                filePath,
                filename,
                audioInfo
              )
            : await this.transcribeWithOpenAI(filePath, filename, audioInfo);

          console.log(
            `✅ ${
              useLocalWhisper ? "Local" : "Cloud"
            } OpenAI Whisper success: ${result.segments.length} segments`
          );
          return result;
        } catch (error) {
          console.log(
            `⚠️ ${useLocalWhisper ? "Local" : "Cloud"} OpenAI Whisper failed: ${
              error.message
            }`
          );

          // If user explicitly selected this engine, throw error instead of fallback
          if (userSelectedEngine) {
            console.log(
              `🚫 User selected OpenAI specifically - not falling back to other engines`
            );
            throw error;
          }

          // Only throw fatal errors immediately for auto-selection
          if (error.message && error.message.includes("quota")) {
            throw new Error(
              "OpenAI Whisper failed: You exceeded your current quota, please check your plan and billing details."
            );
          }

          if (
            error.message &&
            error.message.includes("Invalid OpenAI API key")
          ) {
            throw new Error(
              "OpenAI Whisper failed: Invalid API key configuration."
            );
          }

          // For connection errors, log but continue to fallbacks only if auto-selected
          if (
            error.message &&
            (error.message.includes("Connection") ||
              error.message.includes("connect") ||
              error.message.includes("timeout") ||
              error.message.includes("ECONNRESET"))
          ) {
            console.log(
              `🔄 OpenAI connection issue, will try fallback engines...`
            );
            // Continue to fallback - don't throw here
          }

          // Continue to fallback for other errors too
        }
      }

      if (targetEngine === "deepgram" && deepgramClient) {
        console.log(
          `🌊 Attempting Deepgram transcription ${
            userSelectedEngine ? "(user selected)" : "(default)"
          }...`
        );
        try {
          const result = await this.transcribeWithDeepgram(
            filePath,
            filename,
            audioInfo
          );
          console.log(
            `✅ Deepgram success: ${result.segments.length} segments`
          );
          return result;
        } catch (error) {
          console.log(`⚠️ Deepgram failed: ${error.message}`);

          // If user explicitly selected this engine, throw error instead of fallback
          if (userSelectedEngine) {
            console.log(
              `🚫 User selected Deepgram specifically - not falling back to other engines`
            );
            throw error;
          }

          // Check for specific Deepgram error types
          if (error.message && error.message.includes("quota")) {
            throw new Error(
              "Deepgram failed: You exceeded your current quota, please check your plan and billing details."
            );
          }
          if (
            error.message &&
            (error.message.includes("Connection") ||
              error.message.includes("network"))
          ) {
            throw new Error("Deepgram failed: Connection error.");
          }
          // Continue to fallback
        }
      }

      if (targetEngine === "huggingface" && hfClient) {
        console.log(
          `🤗 Attempting Hugging Face transcription ${
            userSelectedEngine ? "(user selected)" : "(default)"
          }...`
        );
        try {
          const result = await this.transcribeWithHuggingFace(
            filePath,
            filename,
            audioInfo
          );
          console.log(
            `✅ Hugging Face success: ${result.segments.length} segments`
          );
          return result;
        } catch (error) {
          console.log(`⚠️ Hugging Face failed: ${error.message}`);

          // If user explicitly selected this engine, throw error instead of fallback
          if (userSelectedEngine) {
            console.log(
              `🚫 User selected Hugging Face specifically - not falling back to other engines`
            );
            throw error;
          }

          // Continue to fallback
        }
      }

      // Only use fallbacks if user didn't explicitly select an engine
      if (userSelectedEngine) {
        console.log(
          `🚫 User selected ${targetEngine} but it failed or is unavailable - not trying other engines`
        );
        throw new Error(
          `Selected engine '${preferredEngine}' failed or is not available. Please check your configuration or try a different engine.`
        );
      }

      // Fallback to other engines only when no specific engine was selected by user
      console.log(
        `⚠️ Default engine ${targetEngine} failed or unavailable, trying fallbacks...`
      );

      // Try transcription engines in fallback order (excluding the one we already tried)
      const fallbackEngines = ["openai", "deepgram", "huggingface"].filter(
        (engine) => engine !== targetEngine
      );

      for (const engine of fallbackEngines) {
        if (
          engine === "openai" &&
          (localWhisperClient?.available || openaiClient)
        ) {
          const useLocalWhisper = localWhisperClient?.available;

          console.log(
            `🤖 Fallback: Attempting ${
              useLocalWhisper ? "Local" : "Cloud"
            } OpenAI Whisper transcription...`
          );
          try {
            const result = useLocalWhisper
              ? await this.transcribeWithLocalWhisper(
                  filePath,
                  filename,
                  audioInfo
                )
              : await this.transcribeWithOpenAI(filePath, filename, audioInfo);

            console.log(
              `✅ ${
                useLocalWhisper ? "Local" : "Cloud"
              } OpenAI Whisper fallback success: ${
                result.segments.length
              } segments`
            );
            return result;
          } catch (error) {
            console.log(
              `⚠️ ${
                useLocalWhisper ? "Local" : "Cloud"
              } OpenAI Whisper fallback failed: ${error.message}`
            );

            // Only throw fatal errors immediately
            if (error.message && error.message.includes("quota")) {
              throw new Error(
                "OpenAI Whisper failed: You exceeded your current quota, please check your plan and billing details."
              );
            }

            if (
              error.message &&
              error.message.includes("Invalid OpenAI API key")
            ) {
              throw new Error(
                "OpenAI Whisper failed: Invalid API key configuration."
              );
            }

            // For connection errors, log but continue to next fallback
            if (
              error.message &&
              (error.message.includes("Connection") ||
                error.message.includes("connect") ||
                error.message.includes("timeout") ||
                error.message.includes("ECONNRESET"))
            ) {
              console.log(
                `🔄 OpenAI fallback connection issue, trying next engine...`
              );
              // Continue to next engine - don't throw here
            }
          }
        }

        if (engine === "deepgram" && deepgramClient) {
          console.log(`🌊 Fallback: Attempting Deepgram transcription...`);
          try {
            const result = await this.transcribeWithDeepgram(
              filePath,
              filename,
              audioInfo
            );
            console.log(
              `✅ Deepgram fallback success: ${result.segments.length} segments`
            );
            return result;
          } catch (error) {
            console.log(`⚠️ Deepgram fallback failed: ${error.message}`);
            if (error.message && error.message.includes("quota")) {
              throw new Error(
                "Deepgram failed: You exceeded your current quota, please check your plan and billing details."
              );
            }
            if (
              error.message &&
              (error.message.includes("Connection") ||
                error.message.includes("network"))
            ) {
              throw new Error("Deepgram failed: Connection error.");
            }
          }
        }

        if (engine === "huggingface" && hfClient) {
          console.log(`🤗 Fallback: Attempting Hugging Face transcription...`);
          try {
            const result = await this.transcribeWithHuggingFace(
              filePath,
              filename,
              audioInfo
            );
            console.log(
              `✅ Hugging Face fallback success: ${result.segments.length} segments`
            );
            return result;
          } catch (error) {
            console.log(`⚠️ Hugging Face fallback failed: ${error.message}`);
          }
        }
      }

      // If no services are available, return mock data for testing
      console.log(
        `⚠️ No transcription services available, returning mock data`
      );
      const mockResult = this.createMockTranscription(filename, audioInfo);
      console.log(
        `🧪 Mock transcription created with ${mockResult.segments.length} segments`
      );
      return mockResult;
    } catch (error) {
      console.error(`❌ Transcription error for ${filename}:`, error);

      // Propagate specific error messages or create a generic one
      if (
        error.message &&
        (error.message.includes("quota") ||
          error.message.includes("Connection"))
      ) {
        console.log(`🚫 Throwing specific error: ${error.message}`);
        throw error; // Re-throw specific errors
      }

      console.log(
        `🔄 Falling back to mock transcription due to error: ${error.message}`
      );

      // Fallback to mock transcription for other errors
      try {
        const audioInfo = await this.getAudioInfo(filePath);
        const mockResult = this.createMockTranscription(filename, audioInfo);
        console.log(
          `✅ Mock fallback successful with ${mockResult.segments.length} segments`
        );
        return mockResult;
      } catch (mockError) {
        console.error(`❌ Even mock transcription failed:`, mockError);
        throw new Error(`Transcription failed: ${error.message}`);
      }
    }
  }

  /**
   * Transcribe using Local Whisper Service
   */
  async transcribeWithLocalWhisper(filePath, filename, audioInfo) {
    try {
      console.log(`🏠 Local Whisper: Processing ${filename}...`);

      if (!localWhisperClient?.available) {
        throw new Error("Local Whisper service is not available");
      }

      // Check file size before sending
      const stats = await fs.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      console.log(`📊 File size: ${fileSizeMB.toFixed(1)}MB`);

      if (fileSizeMB > 25) {
        throw new Error(
          `File too large (${fileSizeMB.toFixed(
            1
          )}MB). Maximum size is 25MB for local processing.`
        );
      }

      // Create form data
      const FormData = require("form-data");
      const form = new FormData();

      // Add file
      form.append("file", fs.createReadStream(filePath), {
        filename: filename,
        contentType: "audio/mpeg",
      });

      // Add parameters
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities", "segment");

      console.log(`📡 Local Whisper: Making API request...`);

      // Make request to local Whisper service
      const response = await fetch(
        `${LOCAL_WHISPER_URL}/v1/audio/transcriptions`,
        {
          method: "POST",
          body: form,
          headers: form.getHeaders(),
          timeout: 60000, // 1 minute timeout for local processing
          signal: AbortSignal.timeout(60000), // Additional abort signal
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Local Whisper API error: ${response.status} - ${error}`
        );
      }

      const result = await response.json();
      console.log(`✅ Local Whisper: API request successful`);

      // Convert Local Whisper response to our format (should be same as OpenAI format)
      const segments = this.convertOpenAIResponse(result);

      return {
        segments: segments,
        text: segments.map((seg) => seg.text).join(" "),
        duration: audioInfo.duration,
        language: result.language || "unknown",
        audio_info: audioInfo,
        engine: "local-whisper",
      };
    } catch (error) {
      console.error("❌ Local Whisper error details:", {
        message: error.message,
        code: error.code,
        type: error.type,
        status: error.status,
      });

      // Provide more specific error messages
      if (error.message?.includes("timeout")) {
        throw new Error(
          "Local Whisper request timed out. The audio file might be too large."
        );
      }

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error(
          "Cannot connect to local Whisper service. Make sure the Docker container is running."
        );
      }

      if (error.message?.includes("503")) {
        throw new Error(
          "Local Whisper service is not ready. The model might still be loading."
        );
      }

      // Generic fallback
      throw new Error(`Local Whisper failed: ${error.message}`);
    }
  }

  /**
   * Transcribe using OpenAI Whisper
   */
  async transcribeWithOpenAI(filePath, filename, audioInfo) {
    try {
      console.log(`🤖 OpenAI: Processing ${filename}...`);

      // Convert to supported format if needed
      const processedFilePath = await this.preprocessAudioForOpenAI(filePath);
      console.log(`🔄 OpenAI: Using audio file: ${processedFilePath}`);

      // Create file stream
      const audioStream = fs.createReadStream(processedFilePath);

      console.log(`📡 OpenAI: Making API request to Whisper...`);

      // Call OpenAI Whisper API with timeout
      const response = await Promise.race([
        openaiClient.audio.transcriptions.create({
          file: audioStream,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timeout after 60 seconds")),
            60000
          )
        ),
      ]);

      console.log(`✅ OpenAI: API request successful`);

      // Clean up processed file if it's different from original
      if (processedFilePath !== filePath) {
        await fs.remove(processedFilePath);
      }

      // Convert OpenAI response to our format
      const segments = this.convertOpenAIResponse(response);

      return {
        segments: segments,
        text: segments.map((seg) => seg.text).join(" "),
        duration: audioInfo.duration,
        language: response.language || "unknown",
        audio_info: audioInfo,
        engine: "openai-whisper",
      };
    } catch (error) {
      console.error("❌ OpenAI Whisper error details:", {
        message: error.message,
        code: error.code,
        type: error.type,
        status: error.status,
        stack: error.stack?.split("\n")[0],
      });

      // Provide more specific error messages based on error type
      if (error.message?.includes("timeout")) {
        throw new Error("OpenAI API request timed out. Please try again.");
      }

      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        throw new Error(
          "Cannot connect to OpenAI API. Please check your internet connection."
        );
      }

      if (
        error.code === "ECONNRESET" ||
        error.message?.includes("socket hang up")
      ) {
        throw new Error(
          "Connection to OpenAI API was interrupted. Please try again."
        );
      }

      if (error.status === 429) {
        throw new Error(
          "OpenAI API rate limit exceeded. Please wait and try again."
        );
      }

      if (error.status === 401) {
        throw new Error(
          "Invalid OpenAI API key. Please check your configuration."
        );
      }

      if (error.status === 503) {
        throw new Error(
          "OpenAI API is temporarily unavailable. Please try again later."
        );
      }

      if (error.message?.includes("quota")) {
        throw new Error(
          "OpenAI API quota exceeded. Please check your billing and plan."
        );
      }

      // Generic fallback
      throw new Error(`OpenAI Whisper failed: ${error.message}`);
    }
  }

  /**
   * Transcribe using Deepgram
   */
  async transcribeWithDeepgram(filePath, filename, audioInfo) {
    try {
      // Read audio file
      const audioBuffer = await fs.readFile(filePath);

      // Call Deepgram API
      const response = await deepgramClient.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: "nova-2",
          smart_format: true,
          paragraphs: true,
          utterances: true,
          diarize: true,
          punctuate: true,
          numerals: true,
          language: "en",
        }
      );

      // Convert Deepgram response to our format
      const segments = this.convertDeepgramResponse(response);

      return {
        segments: segments,
        text: segments.map((seg) => seg.text).join(" "),
        duration: audioInfo.duration,
        language: response.results?.language || "unknown",
        audio_info: audioInfo,
        engine: "deepgram",
      };
    } catch (error) {
      console.error("Deepgram error:", error);
      throw new Error(`Deepgram failed: ${error.message}`);
    }
  }

  /**
   * Convert OpenAI response to our segment format
   */
  convertOpenAIResponse(response) {
    const segments = [];

    if (response.segments && response.segments.length > 0) {
      response.segments.forEach((segment, index) => {
        segments.push({
          id: index,
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
          speaker_name: `Speaker ${(index % 3) + 1}`, // Simple speaker assignment
          confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9,
        });
      });
    } else {
      // Fallback: split text into segments
      const words = response.text.split(" ");
      const wordsPerSegment = 20;
      const estimatedDuration = words.length * 0.5; // Rough estimate

      for (let i = 0; i < words.length; i += wordsPerSegment) {
        const segmentWords = words.slice(i, i + wordsPerSegment);
        const startTime = (i / words.length) * estimatedDuration;
        const endTime =
          ((i + segmentWords.length) / words.length) * estimatedDuration;

        segments.push({
          id: Math.floor(i / wordsPerSegment),
          start: startTime,
          end: endTime,
          text: segmentWords.join(" "),
          speaker_name: `Speaker ${(Math.floor(i / wordsPerSegment) % 3) + 1}`,
          confidence: 0.9,
        });
      }
    }

    return segments;
  }

  /**
   * Convert Deepgram response to our segment format
   */
  convertDeepgramResponse(response) {
    const segments = [];

    try {
      console.log(
        "🔍 Deepgram response structure:",
        JSON.stringify(response, null, 2)
      );

      if (
        response.results?.utterances &&
        response.results.utterances.length > 0
      ) {
        // Use utterances for better speaker separation
        console.log(
          `📝 Found ${response.results.utterances.length} utterances`
        );
        response.results.utterances.forEach((utterance, index) => {
          segments.push({
            id: index,
            start: utterance.start,
            end: utterance.end,
            text: utterance.transcript.trim(),
            speaker_name: `Speaker ${utterance.speaker + 1}`,
            confidence: utterance.confidence || 0.9,
          });
        });
      } else if (
        response.results?.channels?.[0]?.alternatives?.[0]?.paragraphs
          ?.paragraphs
      ) {
        // Fallback to paragraphs
        console.log("📝 Using paragraphs structure");
        const paragraphs =
          response.results.channels[0].alternatives[0].paragraphs.paragraphs;
        paragraphs.forEach((paragraph, index) => {
          paragraph.sentences.forEach((sentence, sentenceIndex) => {
            segments.push({
              id: index * 100 + sentenceIndex,
              start: sentence.start,
              end: sentence.end,
              text: sentence.text.trim(),
              speaker_name: `Speaker ${(index % 3) + 1}`,
              confidence: 0.9,
            });
          });
        });
      } else if (
        response.results?.channels?.[0]?.alternatives?.[0]?.transcript
      ) {
        // Fallback to basic transcript
        console.log("📝 Using basic transcript structure");
        const transcript =
          response.results.channels[0].alternatives[0].transcript;
        console.log("📝 Basic transcript text:", transcript);

        if (transcript && transcript.trim().length > 0) {
          const words = transcript.split(" ");
          const wordsPerSegment = 20;

          for (let i = 0; i < words.length; i += wordsPerSegment) {
            const segmentWords = words.slice(i, i + wordsPerSegment);
            const startTime = (i / words.length) * 60; // Rough estimate
            const endTime = ((i + segmentWords.length) / words.length) * 60;

            segments.push({
              id: Math.floor(i / wordsPerSegment),
              start: startTime,
              end: endTime,
              text: segmentWords.join(" "),
              speaker_name: `Speaker ${
                (Math.floor(i / wordsPerSegment) % 3) + 1
              }`,
              confidence: 0.9,
            });
          }
        }
      } else {
        console.log(
          "⚠️ No recognizable transcript structure found in Deepgram response"
        );
      }
    } catch (error) {
      console.error("Error parsing Deepgram response:", error);
      throw new Error("Failed to parse Deepgram response");
    }

    console.log(
      `📊 Converted to ${segments.length} segments with total text: "${segments
        .map((s) => s.text)
        .join(" ")}"`
    );
    return segments;
  }

  /**
   * Preprocess audio for OpenAI (convert to supported format if needed)
   */
  async preprocessAudioForOpenAI(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const supportedFormats = [
      ".mp3",
      ".mp4",
      ".mpeg",
      ".mpga",
      ".m4a",
      ".wav",
      ".webm",
    ];

    if (supportedFormats.includes(ext)) {
      return filePath; // Already supported
    }

    // Convert to MP3
    const outputPath = filePath.replace(path.extname(filePath), ".mp3");

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .toFormat("mp3")
        .audioCodec("libmp3lame")
        .audioBitrate(128)
        .on("end", () => {
          console.log(`🔄 Converted ${path.basename(filePath)} to MP3`);
          resolve(outputPath);
        })
        .on("error", (error) => {
          console.error("FFmpeg conversion error:", error);
          reject(new Error(`Audio conversion failed: ${error.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Get audio file information
   */
  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          console.error("FFprobe error:", error);
          // Return default info if probe fails
          resolve({
            duration: 60, // Default duration
            format: path.extname(filePath),
            size: 0,
            bitrate: 0,
          });
        } else {
          const audioStream = metadata.streams.find(
            (stream) => stream.codec_type === "audio"
          );
          resolve({
            duration: parseFloat(metadata.format.duration) || 60,
            format: metadata.format.format_name || path.extname(filePath),
            size: parseInt(metadata.format.size) || 0,
            bitrate: parseInt(metadata.format.bit_rate) || 0,
            channels: audioStream ? audioStream.channels : 1,
            sample_rate: audioStream ? audioStream.sample_rate : 44100,
          });
        }
      });
    });
  }

  /**
   * Create mock transcription for testing when no services are available
   */
  createMockTranscription(filename, audioInfo) {
    console.log(`🧪 Creating mock transcription for testing: ${filename}`);

    const mockSegments = [
      {
        id: 0,
        start: 0.0,
        end: 32.2,
        text: "Welcome everyone to today's meeting. I'd like to start by reviewing our agenda and discussing the key points we need to cover.",
        speaker_name: "Speaker 1",
        confidence: 0.95,
      },
      {
        id: 1,
        start: 32.2,
        end: 58.6,
        text: "Thank you for that introduction. I have some updates on the project timeline that I think everyone should be aware of.",
        speaker_name: "Speaker 2",
        confidence: 0.92,
      },
      {
        id: 2,
        start: 58.6,
        end: 95.2,
        text: "That sounds great. Before we dive into those updates, could we also discuss the budget allocation for the next quarter? I have some concerns about our current spending.",
        speaker_name: "Speaker 3",
        confidence: 0.88,
      },
      {
        id: 3,
        start: 95.2,
        end: 124.7,
        text: "Absolutely, let's address the budget concerns first and then move on to the project timeline updates. This will help us get a complete picture.",
        speaker_name: "Speaker 1",
        confidence: 0.94,
      },
    ];

    // Adjust timing based on actual audio duration
    const actualDuration = audioInfo.duration;
    const mockDuration = 124.7;
    const timeScale = actualDuration / mockDuration;

    const scaledSegments = mockSegments.map((segment) => ({
      ...segment,
      start: segment.start * timeScale,
      end: segment.end * timeScale,
    }));

    return {
      segments: scaledSegments,
      text: scaledSegments.map((seg) => seg.text).join(" "),
      duration: audioInfo.duration,
      language: "en",
      audio_info: audioInfo,
      engine: "mock",
    };
  }

  /**
   * Transcribe using Hugging Face Inference API
   */
  async transcribeWithHuggingFace(filePath, filename, audioInfo) {
    try {
      console.log(`🤗 Starting Hugging Face transcription: ${filename}`);

      // Convert audio to supported format (wav)
      const convertedPath = await this.convertAudioFormat(filePath, "wav");

      console.log(`🎯 HF Processing file: ${convertedPath}`);

      // List of models to try in order of preference
      const modelsToTry = [
        "facebook/wav2vec2-base-960h",
        "facebook/wav2vec2-large-960h",
        "facebook/wav2vec2-large-960h-lv60-self",
        "jonatasgrosman/wav2vec2-large-xlsr-53-english",
        null, // Default model (no model specified)
      ];

      let response;
      let successfulModel = null;

      // Try each model until one works
      for (const model of modelsToTry) {
        try {
          const audioBuffer = await fs.readFile(convertedPath);
          console.log(`🔄 Trying model: ${model || "default"}`);

          const requestOptions = {
            data: audioBuffer,
          };

          // Only add model if it's not null (for default)
          if (model) {
            requestOptions.model = model;
          }

          response = await hfClient.automaticSpeechRecognition(requestOptions);
          successfulModel = model || "default";
          console.log(
            `✅ HF transcription successful with: ${successfulModel}`
          );
          break;
        } catch (modelError) {
          console.log(
            `⚠️ Model ${model || "default"} failed: ${modelError.message}`
          );
          // Continue to next model
          continue;
        }
      }

      // If no model worked, throw error
      if (!response || !successfulModel) {
        throw new Error(
          `All Hugging Face models failed. Please check your HUGGING_FACE_TOKEN and try again.`
        );
      }

      console.log(`🎯 HF Response:`, response);

      // Process the response
      let transcriptText = "";
      if (typeof response === "string") {
        transcriptText = response;
      } else if (response.text) {
        transcriptText = response.text;
      } else if (response.transcription) {
        transcriptText = response.transcription;
      } else {
        console.log(
          `🎯 Full HF response structure:`,
          JSON.stringify(response, null, 2)
        );
        throw new Error(
          "Invalid response format from Hugging Face - no text found"
        );
      }

      if (!transcriptText || transcriptText.trim().length === 0) {
        throw new Error("Empty transcription received from Hugging Face");
      }

      // Create segments from the full transcript
      const segments = this.createSegmentsFromText(
        transcriptText,
        audioInfo.duration
      );

      // Clean up converted file
      if (convertedPath !== filePath) {
        await fs.remove(convertedPath);
      }

      console.log(
        `✅ HF transcription successful: ${transcriptText.length} characters, ${segments.length} segments`
      );

      return {
        segments: segments,
        text: transcriptText,
        duration: audioInfo.duration,
        language: "en", // HF doesn't return language detection
        audio_info: audioInfo,
        engine: "huggingface",
      };
    } catch (error) {
      console.error(`❌ Hugging Face transcription error:`, error);
      throw new Error(`Hugging Face transcription failed: ${error.message}`);
    }
  }

  /**
   * Helper method to create segments from plain text
   */
  createSegmentsFromText(text, duration) {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const wordsPerSecond = words.length / duration;
    const segments = [];

    let currentTime = 0;
    let segmentId = 0;
    const maxSegmentLength = 20; // words per segment

    for (let i = 0; i < words.length; i += maxSegmentLength) {
      const segmentWords = words.slice(i, i + maxSegmentLength);
      const segmentDuration = segmentWords.length / wordsPerSecond;
      const endTime = Math.min(currentTime + segmentDuration, duration);

      segments.push({
        id: segmentId++,
        start: currentTime,
        end: endTime,
        text: segmentWords.join(" "),
        speaker_name: "Speaker 1",
        confidence: 0.85,
      });

      currentTime = endTime;
    }

    return segments;
  }

  /**
   * Convert audio to specific format
   */
  async convertAudioFormat(inputPath, outputFormat) {
    const outputPath = inputPath.replace(
      path.extname(inputPath),
      `.${outputFormat}`
    );

    if (inputPath === outputPath) {
      return inputPath; // No conversion needed
    }

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat(outputFormat)
        .on("end", () => {
          console.log(`✅ Audio converted to ${outputFormat}`);
          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error(`❌ Audio conversion failed:`, err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Check if local Whisper service is available
   */
  isLocalWhisperAvailable() {
    return localWhisperClient && localWhisperClient.available;
  }

  /**
   * Get local Whisper service status
   */
  getLocalWhisperStatus() {
    if (!localWhisperClient) {
      return { available: false, reason: "Local Whisper not configured" };
    }
    return {
      available: localWhisperClient.available,
      url: LOCAL_WHISPER_URL,
      reason: localWhisperClient.available
        ? "Service healthy"
        : "Service unavailable",
    };
  }
}

module.exports = new TranscriptionService();
