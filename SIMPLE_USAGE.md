# 🎯 Voice Note AI - Simplified Usage

## 🚀 Essential Commands (All You Need!)

### 🟢 **Start Everything**
```bash
./start.sh
```
*This starts frontend + backend + whisper (if enabled)*

### 🔴 **Stop Everything**
```bash
./stop.sh
```
*This stops all services cleanly*

### 🧹 **Emergency Cleanup**
```bash
./cleanup.sh
```
*Use this if something is stuck*

## ⚙️ Configuration

Edit `.env` file for all settings:
```bash
# Copy template first time
cp .env.master .env

# Edit with your settings
nano .env
```

## 🎤 Optional Whisper Commands

Only if you want to manage Whisper separately:

```bash
./start-whisper.sh    # Start only Whisper
./stop-whisper.sh     # Stop only Whisper  
./test-whisper.sh     # Test Whisper setup
```

## 📁 File Structure (Simplified)

```
voice-note-ai/
├── start.sh         ← Main starter
├── stop.sh          ← Main stopper  
├── cleanup.sh       ← Emergency cleanup
├── .env             ← All configuration
├── frontend/        ← React app
├── backend/         ← Python API
└── docs/            ← Documentation
```

## 🎯 That's It!

**90% of the time you only need:**
1. `./start.sh` to start
2. `./stop.sh` to stop
3. Edit `.env` to configure

Simple and clean! 🎉
