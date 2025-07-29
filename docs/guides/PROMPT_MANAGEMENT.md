# 📚 Prompt Management System Documentation

## 🎯 Overview

Sistem prompt ini dibuat untuk mengelola semua prompt AI secara terpusat, menggantikan prompt yang tersebar di berbagai file kode. Ini memudahkan maintenance, customization, dan konsistensi prompt di seluruh aplikasi.

## 📁 File Structure

```
backend/
├── prompts.py              # ✅ File prompt terpusat (BARU)
├── ffmpeg_free_main.py     # ✅ Updated: menggunakan prompts.py  
├── multi_model_chat.py     # ✅ Updated: menggunakan prompts.py
└── other_files.py          # Tidak berubah
```

## 🔧 Functions Available

### Summary Generation
- `get_summary_prompt(transcript_text: str) -> str`
  - Prompt utama untuk generate summary dari transcript
  - Digunakan di: `ffmpeg_free_main.py -> _generate_summary_simple_sync()`

### Enhanced Chat Prompts  
- `get_enhanced_summary_prompt(context: str, query: str) -> str`
  - Prompt untuk enhanced summary dengan format terstruktur
  - Digunakan di: `multi_model_chat.py -> _build_mistral_prompt()`

- `get_standard_chat_prompt(context: str, query: str) -> str`
  - Prompt standar untuk chat biasa (bukan summary)
  - Digunakan di: `multi_model_chat.py -> _build_mistral_prompt()`

### Fallback Responses
- `get_fallback_responses() -> dict`
  - Default responses ketika AI tidak tersedia
  - Keys: `summary_fallback`, `chat_not_available`, `enhanced_chat_not_available`, `load_error`

### Utility Functions
- `truncate_transcript(transcript_text: str, max_length: int = 6000) -> str`
  - Truncate transcript untuk prompt yang terlalu panjang

- `is_summary_query(query: str) -> bool`
  - Deteksi apakah query meminta summary/ringkasan

- `validate_prompt_length(prompt: str, max_length: int = 8000) -> bool`
  - Validasi panjang prompt untuk mencegah error

- `get_prompt_stats(prompt: str) -> dict`
  - Get statistik prompt untuk debugging

## 🔄 How It Works

### Before (Prompts scattered in code):
```python
# Dalam ffmpeg_free_main.py
prompt = f"""Analyze this Indonesian conversation/meeting transcript...
{transcript_text}
INSTRUCTIONS:
1. SUMMARY: Create a professional...
[150+ lines of prompt dalam kode]
"""

# Dalam multi_model_chat.py  
prompt = f"""Anda adalah AI analyst expert...
[80+ lines of prompt dalam kode]
"""
```

### After (Centralized prompts):
```python
# Dalam ffmpeg_free_main.py
from prompts import get_summary_prompt
prompt = get_summary_prompt(transcript_text)

# Dalam multi_model_chat.py
from prompts import get_enhanced_summary_prompt, is_summary_query
if is_summary_query(query):
    prompt = get_enhanced_summary_prompt(context, query)
else:
    prompt = get_standard_chat_prompt(context, query)
```

## 📝 Usage Examples

### 1. Generate Summary
```python
from prompts import get_summary_prompt

transcript = "[00:01] Speaker 1: Hello, today we discuss..."
prompt = get_summary_prompt(transcript)
# Sends structured prompt to Mistral AI
```

### 2. Enhanced Chat
```python
from prompts import get_enhanced_summary_prompt, is_summary_query

query = "Ringkas meeting ini dalam format terstruktur"
if is_summary_query(query):
    prompt = get_enhanced_summary_prompt(context, query)
    # Returns structured summary prompt
```

### 3. Fallback Handling
```python
from prompts import get_fallback_responses

if mistral_client is None:
    fallback = get_fallback_responses()
    return fallback["summary_fallback"]
```

## ✨ Benefits

### 1. **Centralized Management**
- ✅ Semua prompt dalam satu file
- ✅ Mudah di-maintain dan di-update
- ✅ Tidak perlu cari prompt di berbagai file

### 2. **Consistency**
- ✅ Format output yang konsisten
- ✅ Prompt style yang seragam
- ✅ Error handling yang terpusat

### 3. **Easy Customization**
- ✅ Edit prompt tanpa menyentuh kode utama
- ✅ A/B testing prompt lebih mudah
- ✅ Version control untuk prompt changes

### 4. **Better Debugging**
- ✅ Utility functions untuk validasi
- ✅ Prompt statistics untuk monitoring
- ✅ Centralized error handling

## 🧪 Testing

Sistem ini sudah ditest dan berfungsi dengan baik:

```bash
# Test prompts file
python -c "from prompts import *; print('✅ All imports work!')"

# Test enhanced summary
curl -X POST "http://localhost:8000/api/chat/enhanced" \
  -H "Content-Type: application/json" \
  -d '{"query": "Ringkas meeting ini dalam format terstruktur", "model": "mistral", "job_id": "job_20250729_044446_1060"}'
```

## 📊 Output Format

### Enhanced Summary Structure:
```
### 📋 TOPIK UTAMA YANG DIBAHAS
- **Topik 1**: Penjelasan detail

### 👥 KONTRIBUSI PEMBICARA  
- **Pembicara 1**: Kontribusi dan peran

### 🎯 POIN KUNCI & INSIGHT
- **Insight 1**: Penjelasan insight

### ✅ ACTION ITEMS & NEXT STEPS
- Action item spesifik dengan PIC
```

## 🔮 Future Enhancements

1. **Prompt Templates**
   - Template system untuk different use cases
   - Dynamic prompt generation based on context

2. **A/B Testing**
   - Multiple prompt versions untuk testing
   - Performance metrics untuk prompt optimization

3. **Multi-language Support**
   - Language-specific prompts
   - Automatic language detection

4. **Prompt Analytics**
   - Success rate tracking
   - Response quality metrics
   - Usage statistics

## 🏷️ Version History

- **v1.0** (Current): Basic centralized prompt management
- **v1.1** (Planned): Template system and A/B testing
- **v2.0** (Future): AI-powered prompt optimization

---

**✅ Sistem prompt terpusat sudah aktif dan berfungsi dengan baik!**
**📝 Edit prompts di `backend/prompts.py` untuk customization**
