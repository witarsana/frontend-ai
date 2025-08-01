# 🚀 Demo Environment Setup

## 🔧 Pre-Demo Technical Setup

### **System Requirements Check**
```bash
# Check Node.js version
node --version  # Should be 18+

# Check Python version  
python --version  # Should be 3.11+

# Check Docker status
docker --version
docker-compose --version

# Verify port availability
lsof -i :3001  # Frontend port
lsof -i :8000  # Backend port
```

### **Environment Preparation**
```bash
# 1. Clone and setup repository
cd /Users/ahmadfaris/work/chronicle/voiceNoteV1/frontend-ai
git checkout main
git pull origin main

# 2. Install dependencies
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# 3. Start services
npm run dev:full  # Starts both frontend and backend
```

---

## 📁 Demo Files Preparation

### **Audio Files Location**
```
demo/sample-data/audio/
├── project_meeting.mp3      # Primary demo file (4:32)
├── sales_strategy.wav       # Secondary demo file (6:45)  
├── customer_interview.m4a   # Mobile recording example
└── poor_quality.mp3         # Low quality test case
```

### **Upload Test Scenarios**
1. **Happy Path**: Clean audio, clear speakers
2. **Edge Case**: Background noise, overlapping speech
3. **Format Test**: Different audio formats (MP3, WAV, M4A)
4. **Size Test**: Large file handling (>50MB)

---

## 🎯 Browser Setup & Testing

### **Primary Demo Browser**
```yaml
Recommended: Chrome Latest
Settings:
  - Clear cache and cookies
  - Disable ad blockers
  - Enable autoplay audio
  - Full screen mode ready
  - Developer tools closed
```

### **Backup Browsers**
- **Firefox**: Test cross-browser compatibility
- **Safari**: Mac compatibility 
- **Edge**: Corporate environment testing

### **Browser Extensions to Disable**
- Ad blockers (uBlock, AdBlock)
- Privacy extensions (Ghostery)
- Password managers (if interfering)
- Developer extensions

---

## 🔊 Audio & Network Setup

### **Audio Configuration**
```yaml
System Audio:
  - Volume: 75%
  - Output: High-quality speakers/headphones
  - Microphone: Muted during demo
  - No system sounds during presentation

Network:
  - Stable internet connection (>10 Mbps)
  - Backup mobile hotspot ready
  - Test API connectivity beforehand
```

### **Network Tests**
```bash
# Test backend connectivity
curl http://localhost:8000/health

# Test frontend loading
curl http://localhost:3001

# Check AI service availability
curl http://localhost:8000/api/v1/chat/status
```

---

## 📱 Multi-Device Setup

### **Primary Demo Device**
- **Laptop**: MacBook Pro 16" (recommended)
- **Resolution**: 1920x1080 minimum
- **RAM**: 16GB+ for smooth performance
- **Presentation Mode**: Extended display ready

### **Secondary Devices (Optional)**
- **Tablet**: iPad for mobile demo
- **Phone**: iPhone for responsive design
- **Second Laptop**: Backup device ready

### **Presentation Setup**
```yaml
Display Configuration:
  - Primary screen: Demo interface
  - Secondary screen: Presentation notes
  - Projector: Mirror primary screen
  - Backup: Screen sharing ready (Zoom/Teams)
```

---

## 🗄️ Database & Storage Setup

### **Local Database**
```bash
# Start PostgreSQL (if using local DB)
brew services start postgresql

# Verify database connection
psql -d voicenote_demo -c "SELECT 1;"

# Clear demo data (if needed)
python manage.py flush_demo_data
```

### **File Storage**
```bash
# Ensure upload directory exists
mkdir -p uploads/demo
chmod 755 uploads/demo

# Clear previous demo files
rm -rf uploads/demo/*

# Test write permissions
touch uploads/demo/test.txt && rm uploads/demo/test.txt
```

---

## 🤖 AI Services Configuration

### **API Keys Verification**
```bash
# Check environment variables
echo $OPENAI_API_KEY
echo $DEEPGRAM_API_KEY
echo $MISTRAL_API_KEY

# Test API connectivity
python -c "import openai; print('OpenAI: OK')"
python -c "from deepgram import Deepgram; print('Deepgram: OK')"
```

### **Model Loading**
```bash
# Pre-load AI models (takes 2-3 minutes)
python scripts/preload_models.py

# Verify models are ready
curl http://localhost:8000/api/v1/models/status
```

---

## 📊 Performance Optimization

### **System Optimization**
```bash
# Close unnecessary applications
killall Slack Discord Spotify

# Free up memory
sudo purge  # macOS memory cleanup

# Monitor system resources
top -l 1 | head -20
```

### **Application Optimization**
```yaml
Backend Settings:
  - Workers: 4 (for demo machine)
  - Memory limit: 8GB
  - Processing queue: 10 concurrent jobs
  - Timeout: 300 seconds

Frontend Settings:
  - Development mode: Disabled
  - Source maps: Disabled  
  - Hot reload: Disabled
  - Caching: Enabled
```

---

## 🎬 Demo Script Preparation

### **Timing Rehearsal**
1. **Opening**: 2 minutes - Value proposition
2. **Upload**: 3 minutes - File processing demo
3. **Segments**: 5 minutes - Transcription results
4. **Summary**: 3 minutes - AI analysis
5. **Chat**: 4 minutes - Interactive AI
6. **Audio**: 3 minutes - Playback features
7. **Q&A**: 5 minutes - Stakeholder questions

### **Backup Plans**
- Pre-processed results ready
- Screenshots of key features
- Video recording of working demo
- Presentation slides as fallback

---

## 🔍 Testing Checklist

### **Core Functionality**
- [ ] File upload works (drag & drop + browse)
- [ ] Processing status updates properly
- [ ] All tabs load and display content
- [ ] Audio playback synchronizes with transcript
- [ ] Timestamp clicking jumps correctly
- [ ] Search functionality highlights results
- [ ] AI chat responds within 3 seconds
- [ ] Pagination works smoothly

### **User Experience**
- [ ] Page loads quickly (<3 seconds)
- [ ] No console errors in browser
- [ ] Responsive design works on tablet/mobile
- [ ] All buttons and controls are clickable
- [ ] Hover effects work properly
- [ ] Loading states are clear and informative

### **Data Quality**
- [ ] Transcription accuracy >90%
- [ ] Speaker identification >85%
- [ ] Action items extracted correctly
- [ ] Summary is coherent and accurate
- [ ] AI chat answers are relevant

---

## 🚨 Troubleshooting Guide

### **Common Issues**

#### **Issue 1: Backend Not Starting**
```bash
# Check port conflicts
lsof -i :8000
kill -9 <PID>

# Check Python dependencies
pip install -r requirements.txt

# Check AI model files
ls -la models/
```

#### **Issue 2: Frontend Not Loading**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check port conflicts
lsof -i :3001
```

#### **Issue 3: Audio Upload Fails**
```bash
# Check file permissions
chmod 755 uploads/
ls -la uploads/

# Check disk space
df -h

# Verify file size limits
grep -r "MAX_FILE_SIZE" config/
```

#### **Issue 4: AI Chat Not Responding**
```bash
# Check API keys
env | grep API_KEY

# Test model availability
curl http://localhost:8000/api/v1/chat/status

# Check model loading
tail -f logs/ai_service.log
```

---

## 📞 Emergency Contacts

### **Technical Support**
- **Developer**: [Your contact info]
- **Infrastructure**: [DevOps contact]
- **AI Services**: [AI team contact]

### **Demo Day Contacts**
- **Primary presenter**: [Phone number]
- **Technical backup**: [Phone number]
- **Stakeholder coordinator**: [Phone number]

---

## ✅ Final Pre-Demo Checklist

### **30 Minutes Before Demo**
- [ ] All services running and tested
- [ ] Demo files uploaded and processed
- [ ] Network connectivity verified
- [ ] Audio/video equipment tested
- [ ] Backup plans ready
- [ ] Team members briefed

### **5 Minutes Before Demo**
- [ ] Browser refreshed with clean cache
- [ ] Demo environment final test
- [ ] All applications closed except demo
- [ ] Presentation mode activated
- [ ] Backup devices ready

### **Demo Day Emergency Kit**
- [ ] Mobile hotspot device
- [ ] Backup laptop with demo environment
- [ ] USB with demo video/screenshots
- [ ] Printed presentation slides
- [ ] Technical contact information

---

**Remember**: Always test the complete demo flow at least 2 times before the actual presentation!
