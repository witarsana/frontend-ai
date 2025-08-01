# 🆘 Demo Troubleshooting Guide

## 🚨 Critical Issues & Quick Fixes

### **Issue 1: Application Won't Start**

#### **Symptoms**
- Frontend shows blank page
- Backend returns 500 errors
- Services fail to connect

#### **Quick Fixes**
```bash
# 1. Check and restart services
pkill -f "node"
pkill -f "python"
cd frontend && npm start &
cd backend && python main.py &

# 2. Clear browser cache
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 3. Check port conflicts
lsof -i :3001  # Frontend
lsof -i :8000  # Backend
# Kill conflicting processes if found
```

#### **If Still Failing**
- Switch to backup device immediately
- Use pre-recorded demo video
- Show static screenshots while troubleshooting

---

### **Issue 2: File Upload Fails**

#### **Symptoms**
- Upload button unresponsive
- Files stuck at 0% progress
- "Upload failed" error messages

#### **Quick Fixes**
```bash
# 1. Check file permissions
chmod 755 uploads/
chmod 644 uploads/*

# 2. Check disk space
df -h
# If low, clear temp files: rm -rf /tmp/*

# 3. Try different file
# Use backup demo file (smaller size)
```

#### **Demo Workaround**
- Use pre-processed demo results
- Explain: "Let me show you results from a previous upload"
- Continue with transcription demo

---

### **Issue 3: Audio Playback Not Working**

#### **Symptoms**
- Audio controls appear but no sound
- Timestamp clicks don't work
- Progress bar doesn't move

#### **Quick Fixes**
```bash
# 1. Check browser audio permissions
# Chrome: Settings > Privacy > Site Settings > Sound
# Allow audio autoplay for localhost

# 2. Test system audio
# Play any audio file to verify speakers work

# 3. Reload page with cache clear
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

#### **Demo Workaround**
- Focus on transcription and AI features
- Explain audio integration verbally
- Show timestamp functionality without audio

---

### **Issue 4: AI Chat Not Responding**

#### **Symptoms**
- Chat input accepts text but no response
- Loading spinner continues indefinitely
- Error messages about AI services

#### **Quick Fixes**
```bash
# 1. Check API connectivity
curl http://localhost:8000/api/v1/chat/status

# 2. Restart AI service
cd backend
python restart_ai_service.py

# 3. Switch AI model
# In chat interface, try different model (FAISS vs Mistral)
```

#### **Demo Workaround**
- Use pre-written Q&A examples
- Show chat interface, explain functionality
- Promise live demo in follow-up session

---

### **Issue 5: Slow Performance/Timeouts**

#### **Symptoms**
- Page loads very slowly
- Processing takes >5 minutes
- UI becomes unresponsive

#### **Quick Fixes**
```bash
# 1. Close resource-heavy applications
killall Slack Discord Chrome
# Keep only demo browser open

# 2. Free system memory
sudo purge  # macOS
# Windows: Task Manager > End unnecessary processes

# 3. Use smaller demo file
# Switch to 1-2 minute audio instead of 4+ minutes
```

#### **Demo Workaround**
- Use pre-processed results
- Explain typical performance expectations
- Show system scaling capabilities

---

## 🔧 Browser-Specific Issues

### **Chrome Issues**
```yaml
Common Problems:
  - Audio autoplay blocked
  - CORS errors in console
  - Memory leaks with large files

Solutions:
  - Enable autoplay: chrome://settings/content/sound
  - Clear all data: Chrome > Clear browsing data
  - Restart browser between demos
```

### **Safari Issues**
```yaml
Common Problems:
  - File upload restrictions
  - Audio format compatibility
  - CSS rendering differences

Solutions:
  - Use Chrome as primary demo browser
  - Test file formats beforehand
  - Have Safari-specific demo ready
```

### **Firefox Issues**
```yaml
Common Problems:
  - Slower JavaScript performance
  - Different security policies
  - Audio codec support

Solutions:
  - Pre-test all features in Firefox
  - Use MP3 files (best compatibility)
  - Consider Chrome as fallback
```

---

## 📱 Mobile/Tablet Issues

### **Responsive Design Problems**
```yaml
Common Issues:
  - Tabs too small to click
  - Audio controls not visible
  - Text too small to read

Quick Fixes:
  - Zoom browser to 125-150%
  - Rotate device to landscape mode
  - Use desktop version for critical demos
```

### **Touch Interface Issues**
```yaml
Common Problems:
  - Timestamp clicks not responsive
  - Scroll behavior jerky
  - Keyboard appearance issues

Solutions:
  - Use larger tap targets
  - Disable keyboard auto-appearance
  - Pre-test all touch interactions
```

---

## 🌐 Network & Connectivity Issues

### **Slow Internet Connection**
```yaml
Symptoms:
  - Long loading times
  - API timeouts
  - File upload failures

Quick Solutions:
  1. Switch to mobile hotspot
  2. Use offline/local processing mode
  3. Show pre-downloaded results
  4. Reduce demo file sizes
```

### **API Service Outages**
```yaml
Backup Plans:
  1. Use local AI models (FAISS)
  2. Switch to offline processing
  3. Show static demo results
  4. Explain cloud vs on-premise options
```

---

## 💾 Data & Storage Issues

### **Database Connection Errors**
```bash
# Quick database restart
brew services restart postgresql
# Or
systemctl restart postgresql

# Test connection
psql -c "SELECT 1;"

# Clear demo data if corrupted
python manage.py reset_demo_data
```

### **File Storage Full**
```bash
# Quick cleanup
rm -rf uploads/temp/*
rm -rf logs/*.log
docker system prune -f

# Check space
df -h
```

---

## 🎯 Demo Recovery Strategies

### **Level 1: Minor Issues (Continue Demo)**
- Acknowledge issue briefly
- Use workaround immediately
- Continue with confidence
- Address in Q&A if needed

### **Level 2: Major Issues (Pivot Strategy)**
- Switch to backup approach
- Use pre-recorded materials
- Focus on working features
- Schedule technical follow-up

### **Level 3: Critical Failure (Emergency Plan)**
- Switch to presentation slides
- Use video demonstration
- Focus on business value discussion
- Reschedule technical demo

---

## 📞 Real-Time Support

### **During Demo Support Protocol**
1. **Silent Troubleshooting**: Fix without interrupting
2. **Quick Pivot**: Switch to backup seamlessly
3. **Transparent Communication**: Acknowledge briefly if needed
4. **Recovery Plan**: Have next steps ready

### **Emergency Phrases**
- "Let me show you this from a different angle..."
- "I have another example that demonstrates this better..."
- "This is a perfect opportunity to discuss..."
- "Let me switch to our backup environment..."

---

## 🧰 Emergency Toolkit

### **Physical Tools**
- Mobile hotspot device
- Backup laptop with demo environment
- USB drive with demo videos/screenshots
- Printed presentation slides
- Network cables (if needed)

### **Digital Tools**
```bash
# Quick diagnostic commands
curl -I http://localhost:3001  # Frontend health
curl -I http://localhost:8000  # Backend health
netstat -an | grep LISTEN      # Port usage
ps aux | grep node             # Process status
ps aux | grep python           # AI service status
```

### **Backup Demo Materials**
- Pre-recorded full demo video (15 minutes)
- Key feature screenshots (high resolution)
- Sample output files (JSON/PDF)
- Presentation slides with talking points

---

## 📊 Post-Issue Analysis

### **Issue Documentation**
```yaml
For Each Issue:
  - Time occurred: [timestamp]
  - Symptoms: [detailed description]
  - Root cause: [technical analysis]
  - Resolution: [steps taken]
  - Prevention: [how to avoid next time]
```

### **Follow-up Actions**
1. **Immediate**: Send working demo to stakeholders
2. **24 Hours**: Technical summary of issues and fixes
3. **1 Week**: Improved demo environment ready
4. **2 Weeks**: Schedule follow-up demo if needed

---

## 🎯 Prevention Checklist

### **Pre-Demo Testing (24 Hours Before)**
- [ ] Full end-to-end demo run
- [ ] All browsers tested
- [ ] Network connectivity verified
- [ ] Backup systems ready
- [ ] Team members briefed on issues

### **Demo Day Setup (2 Hours Before)**
- [ ] All systems restarted fresh
- [ ] Demo files pre-uploaded
- [ ] Backup devices ready
- [ ] Emergency contacts available
- [ ] Troubleshooting guide accessible

---

**Remember**: Stakeholders understand that technology can have hiccups. Professional handling of issues often impresses more than perfect demos!
