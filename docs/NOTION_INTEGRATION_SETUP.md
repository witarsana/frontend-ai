# 🔗 Notion Integration Setup Guide

## 📋 Overview

Fitur integrasi Notion memungkinkan Anda untuk mengirim action items dari hasil transcription meeting langsung ke Notion database. Action items akan diperkaya dengan AI sebelum dikirim untuk memberikan context yang lebih detail.

## ⚙️ Setup Process

### **1. Buat Integration di Notion**

1. **Buka Notion integrations page:**
   - Pergi ke https://www.notion.so/my-integrations
   - Login dengan akun Notion Anda

2. **Buat New Integration:**
   - Klik "New integration"
   - Beri nama: "Voice Note AI"
   - Upload logo (optional)
   - Select workspace yang akan digunakan
   - Klik "Submit"

3. **Copy API Key:**
   - Setelah integration dibuat, copy "Internal Integration Token"
   - Format: `secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### **2. Setup Notion Database**

1. **Buat Database Baru:**
   - Buka Notion workspace Anda
   - Buat new page → Database → Table
   - Beri nama: "Action Items" atau "Task Management"

2. **Tambahkan Properties:**
   ```
   ✅ Required Properties:
   - Name (Title) - sudah ada secara default
   - Description (Rich Text)
   - Assignee (Rich Text)
   - Deadline (Date)
   - Priority (Select): High, Medium, Low
   - Status (Select): Not Started, In Progress, Done
   - Category (Select): Development, Design, Meeting, Documentation, Testing, Communication, Planning, Research, General
   - Meeting Source (Rich Text)
   - Created (Date)
   ```

3. **Share Database ke Integration:**
   - Klik tombol "Share" di database
   - Invite "Voice Note AI" integration
   - Berikan "Full access"

4. **Copy Database ID:**
   - URL database: `https://notion.so/username/database-name-{DATABASE_ID}?v=...`
   - Database ID adalah bagian setelah nama database dan sebelum `?v=`
   - Format: `ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### **3. Konfigurasi Backend**

1. **Environment Variables:**
   ```bash
   # Backend .env file
   NOTION_API_KEY=your_notion_api_key_here
   NOTION_DATABASE_ID=your_notion_database_id_here
   ```

2. **Install Dependencies:**
   ```bash
   cd backend
   pip install notion-client python-dateutil
   ```

### **4. Konfigurasi Frontend**

1. **Environment Variables:**
   ```bash
   # Frontend .env file
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_NOTION_DATABASE_ID=your_notion_database_id_here
   REACT_APP_NOTION_INTEGRATION=true
   ```

2. **Install Dependencies:**
   ```bash
   cd frontend
   npm install @notionhq/client @types/node
   ```

## 🧪 Testing Integration

### **1. Test Connection**

```bash
# Test backend health
curl http://localhost:8000/api/notion-integration/health

# Test database connection  
curl -X POST http://localhost:8000/api/notion/test-connection \
  -H "Content-Type: application/json" \
  -d '{"database_id": "your_database_id"}'
```

### **2. Manual Test**

```bash
# Test action item creation
curl -X POST http://localhost:8000/api/notion/create-action-item \
  -H "Content-Type: application/json" \
  -d '{
    "action_item": {
      "task": "Test task dari Voice Note AI",
      "assignee": "John Doe", 
      "deadline": "next week",
      "priority": "Medium",
      "status": "Not Started"
    },
    "meeting_context": "Test meeting context",
    "session_id": "test-123",
    "database_id": "your_database_id"
  }'
```

## 🚀 Usage

### **1. Dalam Aplikasi**

1. **Upload dan Process Audio:**
   - Upload file audio meeting
   - Tunggu hingga transcription selesai
   - Buka tab "Summary"

2. **Kirim Action Items:**
   - Scroll ke bagian "Action Items"
   - Klik tombol "📝 Add to Notion" pada action item yang diinginkan
   - Tunggu konfirmasi sukses

3. **Verifikasi di Notion:**
   - Buka database Notion Anda
   - Action item akan muncul dengan data yang sudah diperkaya AI

### **2. Fitur AI Enhancement**

Action items akan diperkaya dengan:
- **Detailed Description:** Context lengkap dan objectives
- **Priority Assessment:** Berdasarkan urgency keywords
- **Category Classification:** Otomatis berdasarkan content
- **Effort Estimation:** Estimasi waktu yang dibutuhkan
- **Dependencies:** Identifikasi prerequisites
- **Success Criteria:** Definisi "done"

## 🛠️ Troubleshooting

### **Common Issues:**

#### **1. "Notion API key invalid"**
```bash
# Solusi:
1. Pastikan API key benar dan tidak expired
2. Check workspace integration masih aktif
3. Regenerate API key jika perlu
```

#### **2. "Database not found"**
```bash
# Solusi:
1. Pastikan database ID benar
2. Check integration punya akses ke database
3. Re-share database ke integration
```

#### **3. "Database schema mismatch"**
```bash
# Solusi:
1. Pastikan semua required properties ada
2. Check property names exact match
3. Recreate database dengan schema yang benar
```

#### **4. "AI enhancement failed"**
```bash
# Solusi:
1. Check Mistral API key (optional)
2. Fallback description akan digunakan
3. Manual edit di Notion tetap bisa dilakukan
```

### **Debug Steps:**

1. **Check Backend Logs:**
   ```bash
   tail -f backend/logs/app.log
   ```

2. **Test API Endpoints:**
   ```bash
   # Health check
   curl http://localhost:8000/api/notion-integration/health
   
   # Database test
   curl -X POST http://localhost:8000/api/notion/test-connection \
     -H "Content-Type: application/json" \
     -d '{"database_id": "your_db_id"}'
   ```

3. **Check Browser Console:**
   - F12 → Console
   - Look for network errors atau API responses

## 📊 Database Schema Template

Copy template ini untuk membuat database yang compatible:

```sql
-- Notion Database Properties
Name: Title (default)
Description: Rich Text
Assignee: Rich Text  
Deadline: Date
Priority: Select (High, Medium, Low)
Status: Select (Not Started, In Progress, Done)
Category: Select (Development, Design, Meeting, Documentation, Testing, Communication, Planning, Research, General)
Meeting Source: Rich Text
Created: Date
```

## 🔒 Security Notes

1. **API Key Protection:**
   - Jangan commit API key ke Git
   - Gunakan environment variables
   - Rotate key secara berkala

2. **Database Access:**
   - Berikan minimal permissions yang dibutuhkan
   - Monitor integration usage di Notion

3. **Network Security:**
   - Pastikan HTTPS dalam production
   - Whitelist IP jika perlu

## 📈 Performance Tips

1. **Batch Processing:**
   - Process multiple action items sekaligus jika banyak
   - Avoid spamming API calls

2. **Caching:**
   - Cache database schema untuk performa
   - Reuse Notion client connections

3. **Error Handling:**
   - Implement retry logic untuk network issues
   - Fallback ke local storage jika Notion unavailable

## 🎯 Next Steps

Setelah setup berhasil:

1. **Customize Database:**
   - Tambah custom properties sesuai kebutuhan
   - Setup views dan filters

2. **Integration Workflow:**
   - Setup automations di Notion
   - Connect dengan tools lain (Slack, Email, etc.)

3. **Team Collaboration:**
   - Share database dengan team members
   - Setup notification rules

4. **Analytics:**
   - Track action item completion rates
   - Monitor meeting productivity

---

**🎉 Selamat! Notion integration sudah siap digunakan!**

Untuk support atau pertanyaan, check dokumentasi lengkap di `/docs/` folder.
