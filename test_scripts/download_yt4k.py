import sys
import os
import subprocess
import re
from datetime import timedelta

def download_youtube_4k(url, output_filename):
    downloads_dir = os.path.join(os.path.expanduser('~'), 'Downloads')
    
    # yt-dlp salva como .webm ou .mp4 dependendo dos codecs
    # Usamos output template sem extensao e deixamos o ffmpeg decidir
    output_template = os.path.join(downloads_dir, output_filename)

    print("--------------------------------------------------")
    print(f"URL: {url}")
    print(f"Destino: {output_template}")
    print("--------------------------------------------------")
    print("Buscando melhor qualidade disponivel (4K prioritario)...\n")

    command = [
        'python', '-m', 'yt_dlp',
        '--format', 'bestvideo[ext=mp4][height<=2160]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best',
        '--merge-output-format', 'mp4',
        '--ffmpeg-location', 'ffmpeg',
        '--output', output_template,
        '--no-playlist',
        '--progress',
        url
    ]

    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            encoding='utf-8',
            bufsize=1
        )

        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            line = line.rstrip()
            if line:
                print(f"\r{line[:100]}", end='', flush=True)
                if '[download]' in line or '[Merger]' in line or 'Destination' in line:
                    print()

        process.wait()

        if process.returncode == 0:
            print(f"\n\n[SUCESSO] Video salvo em: {downloads_dir}")
        else:
            print(f"\n\n[ERRO] yt-dlp encerrou com codigo: {process.returncode}")

    except KeyboardInterrupt:
        print("\n\nDownload interrompido pelo usuario.")
        process.terminate()
    except Exception as e:
        print(f"\n[ERRO] {e}")

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  DOWNLOADER YOUTUBE 4K")
    print("="*50)

    # Aceita URL por argumento ou pede interativamente
    if len(sys.argv) >= 2:
        url = sys.argv[1]
    else:
        url = input("\nCole a URL do YouTube: ").strip()

    if not url:
        print("[ERRO] URL nao informada.")
        sys.exit(1)

    nome = input("Nome do arquivo (sem .mp4): ").strip()
    if not nome:
        nome = "youtube_video_4k"
    if not nome.endswith('.mp4'):
        nome += '.mp4'

    print("="*50 + "\n")
    download_youtube_4k(url, nome)
