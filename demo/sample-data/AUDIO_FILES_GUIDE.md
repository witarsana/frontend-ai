# 🎯 Demo Sample Audio Files

Untuk demo yang optimal, Anda memerlukan file audio sample. Berikut adalah panduan untuk menyiapkan file demo:

## 📁 Audio Files Needed

### **Primary Demo File (Recommended)**
```
Filename: project_meeting.mp3
Duration: 4-5 minutes
Content: Business meeting discussion
Speakers: 3 people (John, Sarah, Mike)
Quality: Clear audio, minimal background noise
```

### **Sample Content Structure:**
```yaml
0:00-0:15: Opening and introductions
0:15-1:30: Project progress discussion
1:30-2:30: Budget and resource decisions
2:30-3:30: Action items assignment
3:30-4:00: Next steps and closing
```

---

## 🎤 Creating Demo Audio Files

### **Option 1: Record Sample Meeting**
```bash
# Use any audio recording app
# Mac: QuickTime Player
# Windows: Voice Recorder
# Mobile: Voice Memo app

# Content suggestions:
- Introduce 3 speakers
- Discuss project timeline
- Assign action items with deadlines
- Make budget decisions
- Technical discussions
```

### **Option 2: Use Existing Meeting**
```yaml
Requirements:
  - Clear audio quality
  - Multiple speakers identifiable
  - Business content (not personal)
  - 3-6 minutes duration
  - Contains actionable items

File formats supported:
  - MP3 (recommended)
  - WAV
  - M4A
  - MP4 (video with audio)
```

---

## 📝 Sample Meeting Script

### **Meeting Content Template:**
```
Speaker 1 (John - Project Manager):
"Baik, mari kita mulai meeting hari ini. Kita perlu membahas progress project Q4 dan timeline deliverable."

Speaker 2 (Sarah - Developer):
"Untuk frontend development, kita sudah complete 70% dari wireframe. Tapi ada beberapa challenge di integration dengan API."

Speaker 1 (John):
"Oke, Sarah tolong finalisasi wireframe dashboard sampai hari Jumat ya. Ini crucial untuk next phase."

Speaker 3 (Mike - QA):
"Dari sisi QA, kita butuh lebih banyak test cases untuk security testing. Apakah bisa dialokasikan resource tambahan?"

Speaker 1 (John):
"Good point Mike. Kita approved budget tambahan $5k untuk infrastructure dan bisa hire satu QA contractor temporary."

Speaker 2 (Sarah):
"Perfect! Untuk tech stack, sudah kita decide pakai React untuk frontend redesign kan? Dan untuk CI/CD nya gimana?"

Speaker 1 (John):
"Yes, React confirmed. Sarah, tolong setup CI/CD pipeline untuk production environment. Target next week ready."

Speaker 3 (Mike):
"Saya akan review security audit checklist dan share ke team. Ada requirement compliance baru yang perlu kita address."
```

---

## 🎯 Expected Demo Results

### **After Processing, You Should See:**
```yaml
Transcription:
  - 8 conversation segments
  - 3 speakers identified
  - 95%+ accuracy
  - Proper timestamps

AI Analysis:
  - Meeting summary generated
  - 3 action items extracted:
    1. Sarah: Finalize wireframe (Due: Friday)
    2. Sarah: Setup CI/CD pipeline (Due: Next week)
    3. Mike: Review security checklist
  - 2 key decisions:
    1. Use React for frontend
    2. Approve $5k budget

Chat Responses:
  - "What action items were assigned?"
  - "Who was responsible for wireframe?"
  - "What budget decisions were made?"
```

---

## 📁 File Organization

### **Create Audio Directory:**
```bash
mkdir -p demo/sample-data/audio
```

### **Recommended File Names:**
```
demo/sample-data/audio/
├── project_meeting.mp3        # Main demo file
├── sales_strategy.wav         # Backup demo
├── customer_interview.m4a     # Mobile recording example
└── team_standup.mp4           # Video file example
```

---

## 🔧 Audio Quality Tips

### **Recording Best Practices:**
```yaml
Environment:
  - Quiet room with minimal echo
  - Close microphone placement
  - Avoid background noise

Technical Settings:
  - Sample Rate: 44.1kHz or higher
  - Bit Rate: 128kbps minimum
  - Format: MP3 or WAV
  - Mono or Stereo (both work)

Content Guidelines:
  - Clear speaker identification
  - Business/professional topics
  - Action items and decisions
  - Natural conversation flow
```

---

## 🎤 Recording Apps Recommendations

### **Desktop:**
```
Mac: QuickTime Player (built-in)
Windows: Voice Recorder (built-in)
Cross-platform: Audacity (free)
Professional: Adobe Audition
```

### **Mobile:**
```
iOS: Voice Memos (built-in)
Android: Voice Recorder (built-in)
Cross-platform: Otter.ai (with transcription)
```

---

## 📊 File Size Guidelines

### **Optimal File Sizes:**
```yaml
Duration vs Size:
  - 1 minute: ~1-2 MB (MP3)
  - 5 minutes: ~5-8 MB (MP3)
  - 10 minutes: ~10-15 MB (MP3)
  - 30 minutes: ~30-45 MB (MP3)

Demo Recommendation:
  - 4-6 minutes duration
  - 5-10 MB file size
  - MP3 format, 128kbps
```

---

## ⚡ Quick Test

### **Validate Your Demo File:**
```bash
# Upload to demo app
# Check processing time (should be <2 minutes)
# Verify transcription accuracy
# Test timestamp clicking
# Confirm AI chat responses
```

### **Quality Checklist:**
- [ ] Clear audio without distortion
- [ ] Multiple speakers distinguishable
- [ ] Business content with action items
- [ ] 3-6 minutes duration
- [ ] Proper file format (MP3/WAV)
- [ ] File size under 50MB

---

**🎯 Pro Tip:** Record multiple versions with different scenarios (clean audio, challenging audio, different accents) to demonstrate system capabilities under various conditions!
