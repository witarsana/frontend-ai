const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

// Import service modules
const transcriptionService = require('./services/transcriptionService');
const aiService = require('./services/aiService');
const chatService = require('./services/chatService');

const app = express();
const PORT = process.env.BACKEND_PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create necessary directories
const createDirectories = async () => {
  await fs.ensureDir(path.join(__dirname, 'uploads'));
  await fs.ensureDir(path.join(__dirname, 'results'));
  await fs.ensureDir(path.join(__dirname, 'temp'));
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${jobId}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.mp4', '.mkv', '.avi', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format: ${ext}`), false);
    }
  }
});

// Global variables for processing jobs
const processingJobs = new Map();

// Routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: "AI Meeting Transcription - Node.js Backend",
    status: "running",
    transcription_engine: "openai-whisper",
    features: ["OpenAI Whisper", "Deepgram (Cloud)", "AI Summaries", "Speaker Detection"],
    engines_available: {
      openai_whisper: true,
      deepgram: !!process.env.DEEPGRAM_API_KEY
    },
    timestamp: new Date().toISOString()
  });
});

// Upload and process endpoint
app.post('/api/upload-and-process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileSizeMB = req.file.size / (1024 * 1024);
    console.log(`🔍 Upload attempt: ${req.file.originalname}, Size: ${fileSizeMB.toFixed(1)}MB`);

    // Generate job ID from filename
    const jobId = path.basename(req.file.filename, path.extname(req.file.filename));
    
    // Initialize job status
    processingJobs.set(jobId, {
      status: "starting",
      progress: 0,
      message: "Initializing...",
      filename: req.file.originalname,
      filePath: req.file.path
    });

    console.log(`✅ File validation passed: ${req.file.originalname} (${fileSizeMB.toFixed(1)}MB)`);

    // Start processing asynchronously
    processAudioFile(jobId, req.file.path, req.file.originalname)
      .catch(error => {
        console.error(`❌ Processing failed for ${jobId}:`, error);
        processingJobs.set(jobId, {
          status: "error",
          progress: 0,
          error: error.message,
          message: `Processing failed: ${error.message}`
        });
      });

    res.json({
      job_id: jobId,
      status: "processing_started",
      message: `File uploaded (${(req.file.size / 1024).toFixed(1)} KB). Processing started.`,
      file_size_kb: req.file.size / 1024
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

// Get processing status
app.get('/api/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = processingJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(job);
});

// Get result
app.get('/api/result/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const resultFile = path.join(__dirname, 'results', `${jobId}_result.json`);
    
    if (!await fs.pathExists(resultFile)) {
      return res.status(404).json({ error: 'Result file not found' });
    }
    
    const result = await fs.readJson(resultFile);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error reading result file:', error);
    res.status(500).json({ error: `Error reading result file: ${error.message}` });
  }
});

// Get configuration
app.get('/api/config', (req, res) => {
  res.json({
    transcription_engine: "openai-whisper",
    engines_available: {
      openai_whisper: true,
      deepgram: !!process.env.DEEPGRAM_API_KEY
    },
    deepgram_available: !!process.env.DEEPGRAM_API_KEY,
    fallback_enabled: true
  });
});

// Get available engines
app.get('/api/engines', (req, res) => {
  res.json({
    engines: {
      "openai-whisper": {
        name: "OpenAI Whisper",
        type: "cloud",
        cost: "paid",
        speed: "fast",
        accuracy: "very_high",
        languages: "multilingual",
        features: ["high_accuracy", "multilingual", "robust"],
        available: !!process.env.OPENAI_API_KEY
      },
      "deepgram": {
        name: "Deepgram Nova-2",
        type: "cloud",
        cost: "paid",
        speed: "very_fast",
        accuracy: "very_high",
        languages: "multilingual",
        features: ["real_time", "speaker_diarization", "smart_formatting", "word_timestamps"],
        available: !!process.env.DEEPGRAM_API_KEY
      }
    },
    current_engine: "openai-whisper",
    recommendations: {
      for_accuracy: "openai-whisper",
      for_speed: "deepgram",
      for_multilingual: "openai-whisper"
    }
  });
});

// Get completed jobs
app.get('/api/jobs/completed', async (req, res) => {
  try {
    const resultsDir = path.join(__dirname, 'results');
    
    if (!await fs.pathExists(resultsDir)) {
      return res.json({ jobs: [] });
    }
    
    const files = await fs.readdir(resultsDir);
    const completedJobs = [];
    
    for (const filename of files) {
      if (filename.endsWith('_result.json')) {
        const jobId = filename.replace('_result.json', '');
        const resultFile = path.join(resultsDir, filename);
        
        try {
          const result = await fs.readJson(resultFile);
          completedJobs.push({
            job_id: jobId,
            filename: result.filename || 'Unknown',
            duration: result.duration || 0,
            word_count: result.word_count || 0,
            processed_at: result.processed_at || '',
            summary_preview: result.summary ? result.summary.substring(0, 100) + "..." : ""
          });
        } catch (error) {
          console.error(`Error reading result file ${filename}:`, error);
        }
      }
    }
    
    // Sort by processed_at descending
    completedJobs.sort((a, b) => new Date(b.processed_at) - new Date(a.processed_at));
    
    res.json({ jobs: completedJobs });
    
  } catch (error) {
    console.error('❌ Error getting completed jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { query, session_id = 'default', file_id } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await chatService.processQuery(query, session_id, file_id);
    
    res.json({
      response: result.response,
      sources: result.sources || [],
      session_id: session_id,
      timestamp: new Date().toISOString(),
      confidence: result.confidence || 0.8
    });
    
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.json({
      response: "I apologize, but the chat system is currently experiencing issues. Please try again later or review the transcript directly.",
      sources: [],
      session_id: req.body.session_id || 'default',
      timestamp: new Date().toISOString(),
      confidence: 0.0
    });
  }
});

// Load chat data
app.post('/api/chat/load/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const resultFile = path.join(__dirname, 'results', `${jobId}_result.json`);
    
    if (!await fs.pathExists(resultFile)) {
      return res.status(404).json({ error: `Job ${jobId} not found` });
    }
    
    const success = await chatService.loadTranscriptionData(resultFile);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to load transcription data' });
    }
    
    res.json({
      status: "success",
      message: `Transcript loaded for job ${jobId}`,
      job_id: jobId
    });
    
  } catch (error) {
    console.error('❌ Load chat data error:', error);
    res.status(500).json({ error: `Failed to load chat data: ${error.message}` });
  }
});

// Chat suggestions
app.get('/api/chat/suggestions', (req, res) => {
  res.json({
    suggestions: [
      "What are the main topics discussed?",
      "Who are the speakers in this conversation?",
      "Can you summarize the key decisions made?",
      "What action items were mentioned?",
      "What questions were asked during the meeting?",
      "What are the main concerns raised?"
    ]
  });
});

// Main audio processing function
async function processAudioFile(jobId, filePath, filename) {
  try {
    console.log(`⚡ Starting processing: ${filename}`);
    
    // Update status
    processingJobs.set(jobId, {
      ...processingJobs.get(jobId),
      status: "processing",
      progress: 10,
      message: "Starting transcription..."
    });
    
    // Step 1: Transcribe audio
    processingJobs.set(jobId, {
      ...processingJobs.get(jobId),
      progress: 30,
      message: "Transcribing audio with AI..."
    });
    
    const transcription = await transcriptionService.transcribeAudio(filePath, filename);
    
    if (!transcription || !transcription.segments || transcription.segments.length === 0) {
      throw new Error("Transcription failed or returned empty result");
    }
    
    // Step 2: Generate summary
    processingJobs.set(jobId, {
      ...processingJobs.get(jobId),
      progress: 70,
      message: "Generating AI summary..."
    });
    
    const summary = await aiService.generateSummary(transcription.segments);
    const actionItems = await aiService.extractActionItems(transcription.segments);
    const keyDecisions = await aiService.extractKeyDecisions(transcription.segments);
    
    // Step 3: Prepare final result
    processingJobs.set(jobId, {
      ...processingJobs.get(jobId),
      progress: 90,
      message: "Finalizing results..."
    });
    
    const speakers = [...new Set(transcription.segments.map(seg => seg.speaker_name || 'Speaker 1'))];
    
    const finalResult = {
      filename: filename,
      job_id: jobId,
      transcript: transcription.segments,
      summary: summary,
      action_items: actionItems,
      key_decisions: keyDecisions,
      tags: ["conversation", "transcription", "ai-analysis"],
      speakers: speakers,
      participants: speakers,
      meeting_type: "general",
      sentiment: "neutral",
      duration: transcription.duration || 0,
      language: transcription.language || "unknown",
      word_count: transcription.text ? transcription.text.split(' ').length : 0,
      audio_info: transcription.audio_info || {},
      processed_at: new Date().toISOString()
    };
    
    // Step 4: Save result
    const resultFile = path.join(__dirname, 'results', `${jobId}_result.json`);
    await fs.writeJson(resultFile, finalResult, { spaces: 2 });
    
    // Update final status
    processingJobs.set(jobId, {
      status: "completed",
      progress: 100,
      message: "Processing completed successfully!",
      result_available: true,
      word_count: finalResult.word_count,
      duration: finalResult.duration
    });
    
    console.log(`✅ Processing completed: ${filename} (${finalResult.word_count} words, ${finalResult.duration.toFixed(1)}s)`);
    
  } catch (error) {
    console.error(`❌ Processing failed: ${error.message}`);
    
    processingJobs.set(jobId, {
      status: "error",
      progress: 0,
      error: error.message,
      message: `Processing failed: ${error.message}`
    });
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 1GB.' });
    }
  }
  
  console.error('❌ Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await createDirectories();
    console.log('📁 Directories created/verified');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Node.js Transcription Backend running on http://0.0.0.0:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/`);
      console.log(`🔧 Features: OpenAI Whisper, Deepgram, AI Summaries`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

startServer();
