import requests
from bs4 import BeautifulSoup
import re
import json

def to_iso_datetime(date, time):
    """Convert date and time string to ISO format"""
    day, month, year = date.split('-')
    return f"{year}-{month}-{day}T{time}:00+02:00"

def scrape_schedule():
    # URL target
    url = "https://rereyano.ru"

    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Gagal mengakses {url}: {e}")
        return False

    soup = BeautifulSoup(response.content, 'html.parser')
    textarea = soup.find('textarea')
    
    if not textarea:
        print("Textarea tidak ditemukan di halaman.")
        return False

    text = textarea.get_text()
    schedule_pattern = re.compile(r'(\d{2}-\d{2}-\d{4})\s+\((\d{2}:\d{2})\)\s+(.+?)\s+((?:\(CH\d+\w+\)\s*)+)')
    matches = schedule_pattern.findall(text)

    # Proses data jadwal baru
    new_matches = []
    for match in matches:
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
            'is_live': False
        }
        new_matches.append(match_data)
    
    # Selalu timpa file dengan data terbaru
    with open('schedule.json', 'w', encoding='utf-8') as f:
        json.dump(new_matches, f, ensure_ascii=False, indent=2)
    
    print("Jadwal berhasil diperbarui.")
    return True

if __name__ == '__main__':
    scrape_schedule()
