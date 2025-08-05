# Speaker Filter Feature - Tab Segments

## Overview

Filter speaker telah ditambahkan ke tab "Segments" untuk memungkinkan pengguna memfilter transkrip berdasarkan speaker tertentu atau menampilkan semua speaker.

## Features

### 1. Speaker Filter Dropdown
- **Lokasi**: Di bagian kontrol tab Segments, sebelah kanan filter "Show"
- **Opsi**: 
  - "All Speakers" - Menampilkan semua segmen dari semua speaker
  - "[Speaker Name] (count)" - Menampilkan hanya segmen dari speaker tertentu dengan jumlah segmen

### 2. Visual Indicators
- **Active Filter Badge**: Ketika speaker tertentu dipilih, muncul badge dengan nama speaker dan emoji 📢
- **Results Count**: Menampilkan jumlah segmen yang ditemukan vs total segmen
- **Dynamic Info**: Info hasil berubah dinamis berdasarkan filter aktif

### 3. Filter Controls
- **Clear Speaker Filter**: Tombol untuk menghapus filter speaker saja
- **Clear Search**: Tombol untuk menghapus pencarian teks saja  
- **Clear All Filters**: Tombol merah untuk menghapus semua filter sekaligus

### 4. Combined Filtering
- Filter speaker dapat dikombinasikan dengan pencarian teks
- Pagination otomatis reset ketika filter berubah
- Hasil menampilkan segmen yang cocok dengan kedua kriteria

## User Interface

### Filter Controls Layout
```
[Show: 10] [Speaker: All Speakers ▼] [Search: ___________🔍]
```

### Results Info Bar
```
Found 15 of 45 segments [📢 Speaker 2] Showing 10 of 15 Page 1 of 2
```

### Clear Filter Controls
```
[Clear search] [Clear speaker filter] [Clear all filters]
```

## Implementation Details

### State Management
- `selectedSpeaker`: String state untuk speaker yang dipilih (default: "all")
- Filter terintegrasi dengan search dan pagination yang sudah ada

### Speaker Detection
- Menggunakan `segment.speaker` atau `segment.speaker_name` dari data transkrip
- Otomatis mendeteksi speaker unik dan menghitung jumlah segmen
- Sorting alfabetis untuk daftar speaker

### Filter Logic
```typescript
const filteredSegments = transcription.segments?.filter(segment => {
  const matchesSearch = segment.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (segment.speaker && segment.speaker.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const matchesSpeaker = selectedSpeaker === "all" || 
    segment.speaker === selectedSpeaker ||
    segment.speaker_name === selectedSpeaker ||
    (segment.speaker && segment.speaker.includes(selectedSpeaker));
  
  return matchesSearch && matchesSpeaker;
}) || [];
```

## Usage Examples

### Scenario 1: Meeting dengan Multiple Speakers
1. Upload file meeting dengan 3 speakers
2. Buka tab "Segments"
3. Pilih "Speaker 2 (12)" dari dropdown
4. Hanya segmen dari Speaker 2 yang ditampilkan
5. Gunakan pencarian untuk mencari kata kunci dalam segmen Speaker 2

### Scenario 2: Interview Analysis
1. File interview dengan interviewer dan interviewee
2. Filter hanya "Interviewer" untuk melihat pertanyaan
3. Filter hanya "Interviewee" untuk melihat jawaban
4. Gunakan "Clear all filters" untuk kembali ke semua

### Scenario 3: Large Conversation
1. File dengan 100+ segmen dari 4 speakers
2. Filter "Speaker 3" untuk fokus pada kontribusi spesifik
3. Pagination tetap bekerja dalam filter
4. Jump to page untuk navigasi cepat dalam hasil filter

## Technical Benefits

1. **Performance**: Filter dilakukan di client-side, response cepat
2. **User Experience**: Visual feedback jelas untuk status filter
3. **Accessibility**: Dropdown standard dengan keyboard navigation
4. **Consistency**: Menggunakan pola UI yang sama dengan kontrol lain
5. **Extensibility**: Mudah untuk menambah filter tambahan

## Future Enhancements

1. **Multi-Speaker Selection**: Pilih beberapa speaker sekaligus
2. **Speaker Color Coding**: Warna konsisten untuk setiap speaker
3. **Speaker Statistics**: Grafik distribusi waktu bicara per speaker
4. **Quick Speaker Buttons**: Tombol cepat untuk speaker utama
5. **Speaker Search**: Pencarian dalam nama speaker

## Testing

### Manual Testing Checklist
- [ ] Filter speaker menampilkan hasil yang benar
- [ ] Kombinasi dengan search text bekerja
- [ ] Pagination reset ketika filter berubah
- [ ] Badge speaker muncul ketika filter aktif
- [ ] Clear buttons berfungsi dengan benar
- [ ] Dropdown menampilkan count yang akurat
- [ ] UI responsive di berbagai ukuran layar

### Test Cases
1. **No Speakers**: File tanpa speaker - filter tidak muncul
2. **Single Speaker**: File dengan 1 speaker - filter menampilkan 1 opsi + All
3. **Multiple Speakers**: File dengan 3+ speakers - semua opsi tersedia
4. **Empty Results**: Filter menghasilkan 0 segmen - pesan yang sesuai
5. **Combined Filters**: Search + speaker filter menghasilkan intersection

## Code Files Modified

- `/frontend/src/components/SessionTranscriptionCard.tsx`
  - Added `selectedSpeaker` state
  - Modified filter logic for segments
  - Added speaker dropdown UI
  - Enhanced results info display
  - Added clear filter controls

## Dependencies

Tidak ada dependency baru yang ditambahkan. Fitur menggunakan:
- React hooks yang sudah ada
- Styling inline yang konsisten
- Logic JavaScript standar
