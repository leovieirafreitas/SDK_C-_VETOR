import urllib.request, re

video_id = '184683594353'

# Testa pelo manifests (que era outra rota usada antes)
urls_to_test = [
    f'https://cdn.thechosen.media/manifests-10-4/{video_id}/video_2160p.m3u8',
    f'https://cdn.thechosen.media/manifests-10-4/{video_id}/audio_pt_br_portuguese_brazil.m3u8',
    f'https://api.frontrow.cc/channels/12884901895/VIDEO/{video_id}/v2/hls.m3u8',
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': f'https://watch.thechosen.tv/video/{video_id}',
    'Origin': 'https://watch.thechosen.tv',
}

for url in urls_to_test:
    try:
        req = urllib.request.Request(url, headers=headers)
        r = urllib.request.urlopen(req, timeout=10)
        content = r.read(800).decode('utf-8')
        print(f'[OK] {url[:70]}')
        # Mostra resoluções disponíveis
        for line in content.split('\n'):
            if 'RESOLUTION' in line or '2160' in line or 'http' in line.lower()[:10]:
                print(f'     {line.strip()[:100]}')
    except Exception as e:
        print(f'[ERRO] {url[:70]}')
        print(f'       {e}')
    print()
