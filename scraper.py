import requests
from bs4 import BeautifulSoup
import re
import json
from datetime import datetime

def to_iso_datetime(date, time):
    """Convert date and time string to ISO format with current timezone"""
    day, month, year = date.split('-')
    return f"{year}-{month}-{day}T{time}:00+02:00"

def scrape_schedule():
    # URL target
    url = "https://rereyano.ru"
    print(f"🔄 Mengambil data dari: {url}")

    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Gagal mengakses {url}: {e}")
        return False

    soup = BeautifulSoup(response.content, 'html.parser')
    textarea = soup.find('textarea')
    
    if not textarea:
        print("❌ Error: Textarea tidak ditemukan di halaman")
        return False

    text = textarea.get_text()
    print("✅ Berhasil mendapatkan data mentah")
    
    # Debug: Simpan data mentah ke file
    with open('debug_raw.txt', 'w', encoding='utf-8') as f:
        f.write(text)

    schedule_pattern = re.compile(r'(\d{2}-\d{2}-\d{4})\s+\((\d{2}:\d{2})\)\s+(.+?)\s+((?:\(CH\d+\w+\)\s*)+)')
    matches = schedule_pattern.findall(text)
    print(f"🔍 Ditemukan {len(matches)} jadwal")

    if not matches:
        print("⚠️ Tidak ada jadwal yang ditemukan!")
        return False

    # Proses data jadwal baru
    new_matches = []
    for match in matches:
        try:
            date, time, event, channels = match
            
            # Split event into competition and teams
            event_parts = event.split(' : ', 1)
            competition = event_parts[0] if len(event_parts) > 1 else ''
            teams = event_parts[1] if len(event_parts) > 1 else event

            # Proses channel
            channel_list = []
            for channel in re.findall(r'CH\d+\w+', channels):
                channel_number = re.search(r'\d+', channel).group()
                url = f"https://envivo.govoet.my.id/{channel_number}"
                channel_list.append({
                    'name': channel,
                    'url': url
                })

            # Tambahkan data match
            match_data = {
                'date': date,
                'time': time,
                'iso_datetime': to_iso_datetime(date, time),
                'competition': competition,
                'teams': teams,
                'channels': channel_list,
                'is_live': False,
                'last_updated': datetime.utcnow().isoformat() + 'Z'  # Tambahkan timestamp
            }
            new_matches.append(match_data)
            
        except Exception as e:
            print(f"⚠️ Gagal memproses jadwal: {str(e)}")
            continue

    # Baca data lama untuk perbandingan
    try:
        with open('schedule.json', 'r', encoding='utf-8') as f:
            old_matches = json.load(f)
            print("ℹ️ Menimpa jadwal yang ada")
    except (FileNotFoundError, json.JSONDecodeError):
        print("ℹ️ File schedule.json tidak ditemukan atau rusak, membuat yang baru")

    # Simpan ke file JSON
    with open('schedule.json', 'w', encoding='utf-8') as f:
        json.dump(new_matches, f, ensure_ascii=False, indent=2)
    
    print("✅ Jadwal berhasil disimpan")
    return True

if __name__ == '__main__':
    scrape_sync = scrape_schedule()
    if not scrape_sync:
        print("❌ Gagal memperbarui jadwal")
