import requests
from bs4 import BeautifulSoup
import re
import json
from datetime import datetime
import pytz

# URL target
url = "https://rereyano.ru"

# Mengambil konten dari URL
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
except requests.RequestException as e:
    print(f"Gagal mengakses {url}: {e}")
    exit(1)

soup = BeautifulSoup(response.content, 'html.parser')

# Mencari elemen textarea
textarea = soup.find('textarea')
if not textarea:
    print("Textarea tidak ditemukan di halaman.")
    exit(1)

# Mengambil teks dari textarea
text = textarea.get_text()

# Regex untuk mengekstrak jadwal pertandingan
schedule_pattern = re.compile(r'(\d{2}-\d{2}-\d{4})\s+\((\d{2}:\d{2})\)\s+(.+?)\s+((?:\(CH\d+\w+\)\s*)+)')

# Menyimpan hasil ekstraksi
matches = schedule_pattern.findall(text)

# Timezone Perancis
france_tz = pytz.timezone('Europe/Paris')

# List untuk menyimpan data jadwal
schedule_data = []

for match in matches:
    date, time, event, channels = match
    
    # Split event into competition and teams
    event_parts = event.split(' : ', 1)
    competition = event_parts[0] if len(event_parts) > 1 else ''
    teams = event_parts[1] if len(event_parts) > 1 else event

    # Buat datetime object dengan timezone Perancis
    day, month, year = map(int, date.split('-'))
    hour, minute = map(int, time.split(':'))
    
    # Buat naive datetime
    naive_dt = datetime(year, month, day, hour, minute)
    
    # Tambahkan timezone Perancis (akan menangani DST secara otomatis)
    france_dt = france_tz.localize(naive_dt, is_dst=None)
    
    # Konversi ke format ISO 8601 dengan timezone
    iso_datetime = france_dt.isoformat()
    
    # Ekstrak daftar channel
    channel_list = re.findall(r'CH\d+\w+', channels)
    channels_data = []
    for channel in channel_list:
        channel_number = re.search(r'\d+', channel).group()
        channels_data.append({
            'name': channel,
            'url': f"https://envivo.govoet.my.id/{channel_number}"
        })
    
    # Tambahkan ke data jadwal
    schedule_data.append({
        'datetime': iso_datetime,
        'competition': competition,
        'teams': teams,
        'channels': channels_data
    })

# Simpan ke file JSON
with open('schedule.json', 'w', encoding='utf-8') as f:
    json.dump({
        'last_updated': datetime.now(pytz.utc).isoformat(),
        'timezone': 'Europe/Paris',
        'matches': schedule_data
    }, f, indent=2, ensure_ascii=False)

print("Scraping selesai, hasil disimpan ke schedule.json dengan timezone Europe/Paris")
