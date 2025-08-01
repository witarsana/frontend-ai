import { TranscriptItem } from '../types';

export const processingStatuses = [
  "🔊 Mengekstrak audio dari file...",
  "🎤 Melakukan speech-to-text dengan AI...",
  "👥 Mengidentifikasi pembicara (Speaker Diarization)...",
  "⚡ Menggenerate summary dengan AI...",
  "🏷️ Menambahkan tags otomatis...",
  "✅ Finalisasi hasil..."
];

export const sampleTranscript: TranscriptItem[] = [
  {
    start: "00:00:05",
    end: "00:00:12",
    speaker: "speaker-1",
    speakerName: "John",
    text: "Baik, mari kita mulai meeting hari ini. Kita perlu membahas progress project Q4 dan timeline deliverable.",
    tags: []
  },
  {
    start: "00:00:13",
    end: "00:00:25",
    speaker: "speaker-2",
    speakerName: "Sarah",
    text: "Untuk frontend development, kita sudah complete 70% dari wireframe. Tapi ada beberapa challenge di integration dengan API.",
    tags: []
  },
  {
    start: "00:00:26",
    end: "00:00:35",
    speaker: "speaker-1",
    speakerName: "John",
    text: "Oke, Sarah tolong finalisasi wireframe dashboard sampai hari Jumat ya. Ini crucial untuk next phase.",
    tags: ["action-item"]
  },
  {
    start: "00:00:36",
    end: "00:00:48",
    speaker: "speaker-3",
    speakerName: "Mike",
    text: "Dari sisi QA, kita butuh lebih banyak test cases untuk security testing. Apakah bisa dialokasikan resource tambahan?",
    tags: ["question"]
  },
  {
    start: "00:00:49",
    end: "00:01:02",
    speaker: "speaker-1",
    speakerName: "John",
    text: "Good point Mike. Kita approved budget tambahan $5k untuk infrastructure dan bisa hire satu QA contractor temporary.",
    tags: ["decision"]
  },
  {
    start: "00:01:03",
    end: "00:01:15",
    speaker: "speaker-2",
    speakerName: "Sarah",
    text: "Perfect! Untuk tech stack, sudah kita decide pakai React untuk frontend redesign kan? Dan untuk CI/CD nya gimana?",
    tags: ["decision", "question"]
  },
  {
    start: "00:01:16",
    end: "00:01:28",
    speaker: "speaker-1",
    speakerName: "John",
    text: "Yes, React confirmed. Sarah, tolong setup CI/CD pipeline untuk production environment. Target next week ready.",
    tags: ["action-item", "decision"]
  },
  {
    start: "00:01:29",
    end: "00:01:42",
    speaker: "speaker-3",
    speakerName: "Mike",
    text: "Saya akan review security audit checklist dan share ke team. Ada requirement compliance baru yang perlu kita address.",
    tags: ["action-item", "follow-up"]
  }
];

export const sampleSummaryData = {
  meetingSummary: "Meeting membahas progress project Q4, dengan fokus pada deliverable utama dan timeline. Tim sepakat untuk mempercepat development fase dan menambah resource QA testing.",
  actionItems: [
    "John: Finalisasi wireframe halaman dashboard (Deadline: Jumat)",
    "Sarah: Setup CI/CD pipeline untuk production",
    "Mike: Review security audit checklist"
  ],
  keyDecisions: [
    "Menggunakan React untuk frontend redesign",
    "Budget tambahan $5k untuk cloud infrastructure",
    "Meeting mingguan setiap Selasa jam 10:00"
  ]
};
