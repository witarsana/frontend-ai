import whisper
import os
import requests
import re
from datetime import datetime

# === FFmpeg will be automatically detected on macOS ===
# No need to set PATH on macOS - Whisper will find ffmpeg automatically

# === CONFIG ===
MISTRAL_API_KEY = "jXiU2TQZM4Rj13JJD44Gp0mm4iLZVCJx"
MISTRAL_MODEL = "mistral-medium"

# === Load Whisper model ===
print("🔄 Loading Whisper model...")
whisper_model = whisper.load_model("base")
print("✅ Whisper model loaded!")

# === File selection helper ===
def select_file_from_source():
    """Show available files in source directory and let user choose"""
    source_dir = "source"
    
    if not os.path.exists(source_dir):
        print(f"❌ Source directory '{source_dir}' not found.")
        return None
    
    # Get all audio/video files from source directory
    supported_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.mp4', '.mov', '.mkv', '.avi', '.wmv', '.flv', '.webm']
    files = []
    
    for file in os.listdir(source_dir):
        if any(file.lower().endswith(ext) for ext in supported_extensions):
            files.append(file)
    
    if not files:
        print(f"❌ No audio/video files found in '{source_dir}' directory.")
        print(f"📝 Supported formats: {', '.join(supported_extensions)}")
        return None
    
    print(f"\n📁 Files found in '{source_dir}' directory:")
    print("-" * 60)
    for i, file in enumerate(files, 1):
        file_path = os.path.join(source_dir, file)
        file_size = os.path.getsize(file_path)
        size_mb = file_size / (1024 * 1024)
        print(f"{i:2d}. {file} ({size_mb:.1f} MB)")
    
    print("-" * 60)
    
    while True:
        try:
            choice = input(f"🎯 Pilih file (1-{len(files)}) atau 'q' untuk quit: ").strip()
            
            if choice.lower() == 'q':
                return None
            
            choice_num = int(choice)
            if 1 <= choice_num <= len(files):
                selected_file = files[choice_num - 1]
                full_path = os.path.join(source_dir, selected_file)
                print(f"✅ File dipilih: {selected_file}")
                return full_path
            else:
                print(f"❌ Pilihan tidak valid. Masukkan angka 1-{len(files)}")
                
        except ValueError:
            print("❌ Masukkan angka yang valid atau 'q' untuk quit")

# === Direct transcription ===
def transcribe_with_speakers(file_path):
    """Transcribe file and add simple speaker detection"""
    try:
        print(f"\n📝 Transcribing {os.path.basename(file_path)}...")
        
        # Direct transcription with Whisper
        result = whisper_model.transcribe(file_path, word_timestamps=True)
        
        print("✅ Transcription completed!")
        print("🗣️ Adding speaker labels...")
        
        # Simple speaker assignment: alternate every 30 seconds
        segments_with_speakers = []
        
        for segment in result["segments"]:
            # Assign speaker based on time (every 30 seconds = different speaker)
            speaker_id = int(segment['start'] // 30) % 2
            speaker_label = f"SPEAKER_{speaker_id:02d}"
            
            segments_with_speakers.append({
                "speaker": speaker_label,
                "start": segment['start'],
                "end": segment['end'],
                "text": segment['text'].strip()
            })
        
        return segments_with_speakers, result["text"]
        
    except Exception as e:
        print(f"❌ Error in transcription: {e}")
        import traceback
        traceback.print_exc()
        return [], ""

# === Format transcript with speakers ===
def format_transcript_with_speakers(segments):
    """Format segments into readable transcript with speaker labels"""
    if not segments:
        return ""
    
    formatted_lines = []
    current_speaker = None
    current_text = []
    
    for segment in segments:
        if segment['speaker'] != current_speaker:
            # New speaker, save previous and start new
            if current_speaker and current_text:
                formatted_lines.append(f"[{current_speaker}] {' '.join(current_text)}")
            
            current_speaker = segment['speaker']
            current_text = [segment['text']]
        else:
            # Same speaker, continue adding text
            current_text.append(segment['text'])
    
    # Add the last speaker's text
    if current_speaker and current_text:
        formatted_lines.append(f"[{current_speaker}] {' '.join(current_text)}")
    
    return "\n\n".join(formatted_lines)

# === Generate smart filename ===
def generate_filename_from_content(transcript_text, max_length=50):
    """Generate a smart filename based on transcript content"""
    if not transcript_text.strip():
        return f"transcript_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Extract key topics/words (filter out common words)
    common_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'}
    
    # Get first 200 characters and extract meaningful words
    sample_text = transcript_text[:200].lower()
    words = re.findall(r'\b[a-zA-Z]{3,}\b', sample_text)
    
    # Filter out common words and get unique meaningful words
    meaningful_words = []
    for word in words:
        if word not in common_words and len(meaningful_words) < 4:
            if word not in meaningful_words:
                meaningful_words.append(word)
    
    # Create filename
    if meaningful_words:
        filename_base = "_".join(meaningful_words)
    else:
        filename_base = "meeting_discussion"
    
    # Clean filename (remove invalid characters)
    filename_base = re.sub(r'[<>:"/\\|?*]', '', filename_base)
    
    # Truncate if too long
    if len(filename_base) > max_length:
        filename_base = filename_base[:max_length]
    
    # Add timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f"{filename_base}_{timestamp}"

# === Save results to file ===
def save_results_to_file(formatted_transcript, summary, original_filename=""):
    """Save transcript and summary to generated folder"""
    
    # Create generated folder if not exists
    generated_dir = "generated"
    if not os.path.exists(generated_dir):
        os.makedirs(generated_dir)
        print(f"📁 Created '{generated_dir}' directory")
    
    # Generate smart filename
    filename_base = generate_filename_from_content(formatted_transcript)
    output_filename = f"{filename_base}.txt"
    output_path = os.path.join(generated_dir, output_filename)
    
    # Prepare content
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    content = f"""# VOICE NOTE TRANSCRIPTION & SUMMARY
Generated on: {timestamp}
Original file: {original_filename}

{'=' * 70}
📄 TRANSCRIPT WITH SPEAKER LABELS
{'=' * 70}

{formatted_transcript}

{'=' * 70}
📋 MEETING SUMMARY
{'=' * 70}

{summary}

{'=' * 70}
✅ End of Report
{'=' * 70}
"""
    
    # Save to file
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"\n💾 Results saved to: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return None

# === Summarization with Mistral ===
def summarize_with_mistral(transcript_text):
    """Generate summary using Mistral API"""
    print("\n🧠 Generating summary with Mistral AI...")
    
    if not transcript_text.strip():
        return "❌ No transcript available for summarization."
    
    prompt = f"""
Berikut adalah transkrip meeting/percakapan dengan beberapa pembicara. Buatkan ringkasan berupa poin-poin penting dari diskusi ini:

{transcript_text}

Tolong buat ringkasan yang mencakup:
1. Topik utama yang dibahas
2. Poin-poin penting dari setiap pembicara
3. Keputusan atau kesimpulan yang diambil
4. Action items (jika ada)
"""

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MISTRAL_MODEL,
        "messages": [
            {"role": "system", "content": "Kamu adalah asisten cerdas yang ahli dalam merangkum percakapan rapat dan meeting."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.5,
        "max_tokens": 1500
    }

    try:
        response = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
        
    except requests.exceptions.RequestException as e:
        return f"❌ Error calling Mistral API: {e}"
    except KeyError as e:
        return f"❌ Unexpected response format from Mistral API: {e}"

# === Main function ===
def main():
    print("🎵 Voice Note Transcriber & Summarizer")
    print("Supported formats: MP3, WAV, M4A, FLAC, OGG, MP4, MOV, MKV, AVI, WMV, FLV, WEBM")
    print("=" * 70)
    
    # Select file
    file_path = select_file_from_source()
    if not file_path:
        print("👋 Program selesai.")
        return
    
    # Check file type
    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".mp4", ".mov", ".mkv", ".avi", ".wmv", ".flv", ".webm"]:
        print(f"\n📹 File video terdeteksi ({ext})")
        print("⚡ Whisper akan langsung memproses video (TIDAK perlu convert!)")
    elif ext in [".mp3", ".wav", ".m4a", ".flac", ".ogg"]:
        print(f"\n🎵 File audio terdeteksi ({ext})")
        print("✅ File audio siap diproses langsung...")
    
    # Transcribe with speaker detection
    segments, full_text = transcribe_with_speakers(file_path)
    
    if not segments:
        print("❌ Transcription failed.")
        return
    
    # Format transcript with speakers
    formatted_transcript = format_transcript_with_speakers(segments)
    
    # Generate summary
    summary = summarize_with_mistral(full_text)
    
    # Save results to file
    original_filename = os.path.basename(file_path)
    saved_file = save_results_to_file(formatted_transcript, summary, original_filename)
    
    # Display results
    print("\n" + "="*70)
    print("📄 TRANSCRIPT WITH SPEAKER LABELS")
    print("="*70)
    print(formatted_transcript)
    
    print("\n" + "="*70)
    print("📋 MEETING SUMMARY")
    print("="*70)
    print(summary)
    print("="*70)
    
    if saved_file:
        print(f"📁 Full results saved to: {saved_file}")
    
    print("✅ Processing completed!")

# === Entry point ===
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Program dihentikan oleh user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
