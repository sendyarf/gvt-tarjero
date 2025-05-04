import requests
from bs4 import BeautifulSoup
import re

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

# Template HTML untuk main-content
html_template = """
<div id="main-content" class="container mt-4">
    <h2 class="mb-4">Today's Matches</h2>
    {match_items}
</div>
"""

match_item_template = """
<div class="match-card" data-time="{iso_datetime}" onclick="toggleChannels(this)">
    <div class="match-time"></div>
    <div class="match-competition">{competition}</div>
    <div class="match-teams">{teams} <span class="live-indicator">- LIVE</span></div>
    <div class="channels">
        {buttons}
    </div>
</div>
"""

button_template = """
<button class="channel-btn" data-bs-toggle="modal" data-bs-target="#streamModal" data-stream="{url}">{channel}</button>
"""

# Fungsi untuk mengubah tanggal dan waktu ke format ISO 8601 tanpa konversi
def to_iso_datetime(date, time):
    # Format tanggal dari dd-mm-yyyy ke yyyy-mm-dd
    day, month, year = date.split('-')
    formatted_date = f"{year}-{month}-{day}"
    # Gabungkan dengan waktu dan tambahkan timezone +02:00
    return f"{formatted_date}T{time}:00+02:00"

# Membuat HTML untuk main-content
match_items = ""
for match in matches:
    date, time, event, channels = match
    
    # Split event into competition and teams
    event_parts = event.split(' : ', 1)
    competition = event_parts[0] if len(event_parts) > 1 else ''
    teams = event_parts[1] if len(event_parts) > 1 else event

    # Membuat tombol player
    buttons = ""
    channel_list = re.findall(r'CH\d+\w+', channels)
    for channel in channel_list:
        channel_number = re.search(r'\d+', channel).group()
        url = f"https://govoet-envivo.blogspot.com/{channel_number}"
        buttons += button_template.format(url=url, channel=channel)

    # Menambahkan match item ke HTML dengan waktu asli
    iso_datetime = to_iso_datetime(date, time)
    match_items += match_item_template.format(
        iso_datetime=iso_datetime,
        competition=competition,
        teams=teams,
        buttons=buttons
    )

# Bungkus semua match_items dalam container
html_output = html_template.format(match_items=match_items)

# Menyimpan hasil ke scheduletar.txt
with open("scheduletar.txt", "w", encoding="utf-8") as file:
    file.write(html_output)

# Memperbarui index.html
def update_index_html():
    try:
        # Baca index.html
        with open("index.html", "r", encoding="utf-8") as file:
            index_soup = BeautifulSoup(file, 'html.parser')

        # Baca scheduletar.txt
        with open("scheduletar.txt", "r", encoding="utf-8") as file:
            new_content = BeautifulSoup(file, 'html.parser')

        # Temukan div dengan id='main-content' di index.html
        main_content = index_soup.find('div', {'id': 'main-content'})
        if main_content:
            main_content.replace_with(new_content)
        else:
            print("main-content tidak ditemukan di index.html")

        # Simpan kembali ke index.html
        with open("index.html", "w", encoding="utf-8") as file:
            file.write(str(index_soup))

        print("index.html berhasil diperbarui")

    except Exception as e:
        print(f"Gagal memperbarui index.html: {e}")

# Jalankan pembaruan index.html
update_index_html()

print("Scraping selesai, hasil disimpan ke scheduletar.txt dan index.html diperbarui.")