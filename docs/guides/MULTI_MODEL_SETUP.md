# 🚀 Multi-Model AI Chat Setup Guide

## 📋 Overview

Sistem chat AI kini mendukung 3 model berbeda:
- **FAISS** (Free, Fast) - Pencarian lokal tanpa biaya
- **Mistral AI** (Balanced) - AI berkualitas tinggi dengan harga terjangkau  
- **DeepSeek AI** (Premium) - AI terbaik untuk analisis kompleks

## 🎯 Quick Start

### 1. **FAISS Only (Free)**
Jika hanya ingin menggunakan FAISS (gratis):
```bash
# Tidak perlu API key apapun
# Sistem akan otomatis menggunakan FAISS
```

### 2. **Hybrid FAISS + Mistral (Recommended)**
```bash
# Tambahkan ke .env
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 3. **Full Multi-Model (FAISS + Mistral + DeepSeek)**
```bash
# Tambahkan ke .env
MISTRAL_API_KEY=your_mistral_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

## 🔑 Mendapatkan API Keys

### **Mistral AI** (Recommended First)
1. Kunjungi: https://console.mistral.ai/
2. Daftar akun gratis
3. Pergi ke "API Keys" 
4. Buat API key baru
5. Copy ke `.env` sebagai `MISTRAL_API_KEY`

**Pricing:** ~$0.002 per query (sangat murah)

### **DeepSeek AI** (Optional Premium)
1. Kunjungi: https://platform.deepseek.com/
2. Daftar akun
3. Pergi ke "API Keys"
4. Buat API key baru  
5. Copy ke `.env` sebagai `DEEPSEEK_API_KEY`

**Pricing:** ~$0.002 per query (kualitas terbaik)

## ⚙️ Konfigurasi di UI

Setelah API keys terkonfigurasi:

1. **Buka Chat Tab**
2. **Klik ⚙️ Settings** di header
3. **Pilih Default Model:**
   - `FAISS` - Gratis, cepat, bagus untuk pertanyaan simple
   - `Mistral` - Balanced, bagus untuk sebagian besar pertanyaan  
   - `DeepSeek` - Premium, terbaik untuk analisis kompleks

4. **Enable Smart Routing** ✅
   - Otomatis pilih model terbaik berdasarkan kompleksitas pertanyaan

5. **Set Daily Limit:** $0.01 - $0.05 per hari (rekomendasi)

## 🧠 Smart Routing Logic

Sistem otomatis memilih model berdasarkan pertanyaan:

```
Simple Questions → FAISS (Free)
├── "Who are the speakers?"
├── "How long is the meeting?"
└── "What time did they discuss X?"

Medium Questions → FAISS first, fallback to Mistral
├── "What did they say about budget?"
├── "Any action items mentioned?"
└── "Key decisions made?"

Complex Questions → Mistral/DeepSeek
├── "Analyze the team dynamics"
├── "Summarize key insights"
└── "Compare different viewpoints"
```

## 💰 Cost Control

### **Built-in Safety Features:**
- ✅ Daily cost limits ($0.01 - $0.10)
- ✅ Auto-fallback ke FAISS jika limit terlampaui
- ✅ Real-time usage tracking
- ✅ Cost per query display

### **Typical Usage:**
- **Light usage:** $0.01/day (50-100 queries)
- **Medium usage:** $0.05/day (200-500 queries) 
- **Heavy usage:** $0.10/day (500+ queries)

## 🎛️ Settings Overview

### **Model Selection**
```
🔍 FAISS (Local Search)
✅ Free • ⚡ Fast • 📝 Good for simple queries

⚡ Mistral AI  
💰 ~$0.002/query • ⚖️ Balanced • 🎯 Good for most queries

🧠 DeepSeek AI
💰 ~$0.002/query • 🏆 Best quality • 🧠 Complex analysis
```

### **Smart Features**
- **Smart Routing** - Auto-pilih model terbaik
- **Enable Fallback** - Gunakan FAISS jika AI gagal
- **Prefer Speed** - Prioritaskan response cepat

## 🚀 Testing Setup

### Test Query Examples:

**Simple (akan ke FAISS):**
```
- "Who are the speakers?"
- "How long is the meeting?"
```

**Medium (FAISS first, then Mistral):**
```
- "What did they discuss about budget?"
- "Any action items mentioned?"
```

**Complex (langsung ke Mistral/DeepSeek):**
```
- "Analyze the team dynamics in this meeting"
- "Summarize the key insights and decisions"
```

## 🔧 Troubleshooting

### **API Key Issues:**
```bash
# Check if keys are loaded
curl -X GET http://localhost:8000/api/chat/settings

# Response should show:
{
  "api_keys_configured": {
    "mistral": true,
    "deepseek": true
  }
}
```

### **Fallback Behavior:**
1. **Enhanced endpoint fails** → Try legacy endpoint
2. **API quota exceeded** → Auto-fallback to FAISS
3. **Invalid API key** → Use FAISS with warning

### **Cost Monitoring:**
```bash
# Check today's usage
curl -X GET http://localhost:8000/api/chat/usage

# Response:
{
  "mistral_tokens": 1500,
  "deepseek_tokens": 500, 
  "cost_today": 0.004,
  "date": "2025-01-27"
}
```

## 📊 Performance Comparison

| Feature | FAISS | Mistral | DeepSeek |
|---------|-------|---------|----------|
| **Speed** | ⚡⚡⚡ 0.1s | ⚡⚡ 1-2s | ⚡ 2-3s |
| **Quality** | ⭐⭐⭐ Good | ⭐⭐⭐⭐ Very Good | ⭐⭐⭐⭐⭐ Excellent |
| **Cost** | 🆓 FREE | 💰 ~$0.002 | 💰 ~$0.002 |
| **Context** | 📄 Limited | 📄📄 32K tokens | 📄📄📄 64K tokens |
| **Indonesian** | ✅ Good | ✅ Very Good | ✅ Excellent |

## 🎯 Recommended Strategy

### **Phase 1: Start Simple**
```bash
# Setup hanya Mistral
MISTRAL_API_KEY=your_key
# Daily limit: $0.01
```

### **Phase 2: Add Premium**  
```bash
# Tambah DeepSeek untuk analisis complex
DEEPSEEK_API_KEY=your_key
# Daily limit: $0.05
```

### **Phase 3: Optimize**
- Monitor usage patterns via settings
- Adjust daily limits based on needs
- Fine-tune smart routing preferences

## 💡 Pro Tips

1. **Enable Smart Routing** - Hemat cost dengan routing otomatis
2. **Start with $0.01/day limit** - Scale up gradually  
3. **Use FAISS for fact-finding** - Simpan AI calls untuk analisis
4. **Monitor usage** - Check settings daily untuk cost tracking
5. **Test all models** - Bandingkan kualitas untuk use case Anda

## 🆘 Support

Jika ada masalah:
1. Check API keys di settings  
2. Verify daily limit belum terlampaui
3. Test dengan FAISS only mode
4. Check backend logs untuk error details

**Happy chatting!** 🚀
