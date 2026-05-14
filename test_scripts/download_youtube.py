import sys
import os
import subprocess
import re
import urllib.request
import threading
import time
from datetime import timedelta

def get_urls(watch_url):
    print("--------------------------------------------------")
    
    match = re.search(r'/video/(\d+)', watch_url)
    if not match:
        raise ValueError("URL invalida. Use: https://watch.thechosen.tv/video/XXXXXXXXX")
    
    video_id = match.group(1)
    print(f"ID do video: {video_id}")

    # URLs diretas CDN - sem API, sem loop, sem autenticacao
    video_url = f"https://cdn.thechosen.media/manifests-10-4/{video_id}/video_2160p.m3u8"
    audio_url = f"https://cdn.thechosen.media/manifests-10-4/{video_id}/audio_pt_br_portuguese_brazil.m3u8"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': f'https://watch.thechosen.tv/video/{video_id}',
        'Origin': 'https://watch.thechosen.tv',
    }

    # Verifica se as URLs estao acessiveis
    for nome, url in [("Video 4K", video_url), ("Audio PT-BR", audio_url)]:
        try:
            req = urllib.request.Request(url, headers=headers)
            urllib.request.urlopen(req, timeout=10).read(100)
            print(f"[OK] {nome} encontrado")
        except Exception as e:
            raise Exception(f"Erro ao acessar {nome}: {e}")

    return video_url, audio_url, headers

def calculate_video_duration(video_url, headers):
    try:
        req = urllib.request.Request(video_url, headers=headers)
        content = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        return sum(float(x) for x in re.findall(r'#EXTINF:([\d\.]+),', content))
    except:
        return 0

def download_and_merge(watch_url, output_filename="the_chosen_episodio.mp4"):
    downloads_dir = os.path.join(os.path.expanduser('~'), 'Downloads')
    final_output_path = os.path.join(downloads_dir, output_filename)

    try:
        video_url, audio_url, headers = get_urls(watch_url)
    except Exception as e:
        print(f"\n[ERRO] {e}")
        return

    print("[...] Calculando duracao do video...")
    total_seconds = calculate_video_duration(video_url, headers)

    print(f"Destino: {final_output_path}")
    print("--------------------------------------------------")
    print("Iniciando download 4K + Audio PT-BR...\n")
    print("[AVISO] Aguarde 30-60s ate aparecer a barra de progresso.\n")

    user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    referer = f'https://watch.thechosen.tv/'

    command = [
        'ffmpeg', '-y', '-nostdin',
        '-headers', f'Referer: {referer}\r\nOrigin: https://watch.thechosen.tv\r\n',
        '-user_agent', user_agent,
        '-i', video_url,
        '-headers', f'Referer: {referer}\r\nOrigin: https://watch.thechosen.tv\r\n',
        '-user_agent', user_agent,
        '-i', audio_url,
        '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'copy',
        '-progress', 'pipe:1', '-nostats', '-loglevel', 'error',
        final_output_path
    ]

    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            universal_newlines=True,
            encoding='utf-8',
            bufsize=1
        )

        first_progress = threading.Event()
        def spinner():
            chars = ['|', '/', '-', '\\']
            i = 0
            while not first_progress.is_set():
                sys.stdout.write(f"\r  Conectando... {chars[i % 4]}  ")
                sys.stdout.flush()
                time.sleep(0.15)
                i += 1
        threading.Thread(target=spinner, daemon=True).start()

        current_speed = "1x"
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            line = line.strip()

            if "speed=" in line:
                current_speed = line.split("=")[1].strip()
            elif line.startswith("out_time_ms="):
                ms = line.split("=")[1].strip()
                if ms.isdigit() and total_seconds > 0:
                    first_progress.set()
                    current_sec = int(ms) / 1000000
                    pct = min((current_sec / total_seconds) * 100, 100)
                    filled = int((pct / 100) * 30)
                    bar = '#' * filled + '.' * (30 - filled)
                    sys.stdout.write(
                        f"\r[{bar}] {pct:.1f}% | {current_speed} | "
                        f"{timedelta(seconds=int(current_sec))} / {timedelta(seconds=int(total_seconds))} "
                    )
                    sys.stdout.flush()

        process.wait()

        if process.returncode == 0:
            print(f"\n\n[SUCESSO] Salvo em: {final_output_path}")
        else:
            print(f"\n\n[ERRO] FFmpeg codigo: {process.returncode}")

    except KeyboardInterrupt:
        print("\n\nDownload interrompido pelo usuario.")
        process.terminate()
    except Exception as e:
        print(f"\n[ERRO] {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python download_youtube.py <URL>")
        print("Ex:  python download_youtube.py \"https://watch.thechosen.tv/video/184683594353\"")
    else:
        watch_url = sys.argv[1]

        print("\n" + "="*50)
        nome = input("Nome do arquivo (Ex: Temp2Episodio1): ").strip()
        if not nome:
            nome = "the_chosen_episodio"
        if not nome.endswith('.mp4'):
            nome += '.mp4'
        print("="*50 + "\n")

        download_and_merge(watch_url, nome)
