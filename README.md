# AI Meeting Transcription - React TypeScript

A modern React TypeScript application for AI-powered meeting transcription with speaker diarization, automatic summary generation, and intelligent tagging.

## Features

- 📁 **File Upload**: Drag & drop or click to upload audio/video files (MP3, WAV, MP4, MKV, M4A)
- 🧠 **AI Processing**: Simulated AI transcription with speaker diarization
- 📋 **Smart Summary**: Automatic generation of meeting summaries, action items, and key decisions
- 🎯 **Intelligent Tagging**: Auto-tagging of content (action items, decisions, questions, follow-ups)
- 🔍 **Search & Filter**: Search through transcripts and filter by speaker or tag type
- 🎵 **Audio Player**: Integrated audio player with seek functionality
- 📊 **Analytics**: Speaker statistics and meeting insights
- 📱 **Responsive Design**: Mobile-friendly interface

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **ESLint** for code quality
- Modern CSS with gradient backgrounds and smooth animations

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-meeting-transcription
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/           # React components
│   ├── AudioPlayer.tsx
│   ├── TranscriptItem.tsx
│   ├── TranscriptTab.tsx
│   ├── SummaryTab.tsx
│   ├── AnalyticsTab.tsx
│   ├── UploadSection.tsx
│   └── ProcessingSection.tsx
├── data/                # Sample data and constants
│   └── sampleData.ts
├── utils/               # Utility functions
│   └── helpers.ts
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles
```

## Component Architecture

### Main Components

- **App.tsx**: Main application component managing global state
- **UploadSection**: File upload with drag & drop functionality
- **ProcessingSection**: AI processing simulation with progress bar
- **AudioPlayer**: Audio controls with seek functionality
- **TranscriptTab**: Transcript display with search and filtering
- **SummaryTab**: Meeting summary, action items, and decisions
- **AnalyticsTab**: Speaker statistics and meeting insights

### Key Features Implementation

#### State Management
The application uses React's `useState` and `useEffect` hooks for state management, with a centralized state object containing:
- Upload/processing/results visibility
- Active tab selection
- Search query and filters
- Transcript data and filtered results

#### Audio Player Integration
The audio player component provides:
- Play/pause functionality
- Progress bar with seek capability
- Time display (current/total)
- Integration with transcript timestamps

#### Search and Filtering
Advanced filtering capabilities:
- Text search across transcript content
- Speaker-based filtering
- Tag-based filtering (action items, decisions, etc.)
- Real-time filter application

## Future Enhancements

- [ ] Real AI integration (Whisper AI for transcription)
- [ ] Speaker diarization with actual ML models
- [ ] Cloud storage integration
- [ ] Real-time collaboration features
- [ ] Export functionality (PDF, DOCX)
- [ ] Meeting scheduling integration
- [ ] Multiple language support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if necessary
5. Submit a pull request

## License

This project is licensed under the MIT License.
