#!/usr/bin/env python3
"""
spotify_lookup.py
-----------------
Reads audio files from each category folder, extracts ID3 tags (or parses
filenames as fallback), searches the Spotify API, and writes spotify.json
per category: { "filename.wav": "spotify_track_id", ... }

Requirements:
    pip install mutagen requests        (system: pacman -S python-mutagen python-requests)

Usage:
    export SPOTIFY_CLIENT_ID=your_client_id
    export SPOTIFY_CLIENT_SECRET=your_client_secret
    python3 spotify_lookup.py

How to get credentials (free):
    1. Go to https://developer.spotify.com/dashboard
    2. Log in → "Create app" → fill any name/description → check Web API
    3. Copy Client ID and Client Secret from the app settings

The script skips files already in spotify.json so you can re-run safely.
"""

import os, re, json, time, sys
from pathlib import Path

# ─── Dependency check ─────────────────────────────────────────────────────────
try:
    import requests
except ImportError:
    sys.exit("Missing dependency — run:  pip install requests")

try:
    from mutagen import File as MutagenFile
except ImportError:
    sys.exit("Missing dependency — run:  pip install mutagen")

# ─── Config ───────────────────────────────────────────────────────────────────
CATEGORIES    = ['aesthetic', 'chill', 'badass', 'hot', 'phonk', 'sad', 'soft']
AUDIO_EXTS    = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'}
REQUEST_DELAY = 0.15   # seconds between API calls

# Noise phrases added by editors — stripped before searching
_EDIT_NOISE = re.compile(
    r'\[beatmarked\]|\(beatmarked\)|beatmarked'
    r'|\[slowed\]|\(slowed\)|slowed|superslowed'
    r'|\[reverb\]|\(reverb\)|reverb'
    r'|\(intro muffle\)|\[intro muffle\]|intro muffle|with intro muffle'
    r'|\bintro\b'
    r'|\bmuffle\b'
    r'|\bp\s*\d+\b'    # p2, p3 …
    r'|\bv\s*\d+\b',   # v2, v3 …
    re.IGNORECASE
)

# " by Issyn" / " By Lory" at end of filename = editor credit, not original artist
_EDITOR_CREDIT = re.compile(r'\s+by\s+[\w\s]+$', re.IGNORECASE)

# ─── Spotify auth ─────────────────────────────────────────────────────────────
def _get_token() -> str:
    cid  = os.environ.get('SPOTIFY_CLIENT_ID', '').strip()
    csec = os.environ.get('SPOTIFY_CLIENT_SECRET', '').strip()
    if not cid or not csec:
        print("\nERROR: Spotify credentials not set.")
        print("  export SPOTIFY_CLIENT_ID=xxx")
        print("  export SPOTIFY_CLIENT_SECRET=xxx")
        print("  Get them at https://developer.spotify.com/dashboard\n")
        sys.exit(1)
    r = requests.post(
        'https://accounts.spotify.com/api/token',
        data={'grant_type': 'client_credentials'},
        auth=(cid, csec),
        timeout=10,
    )
    r.raise_for_status()
    return r.json()['access_token']

# ─── Tag extraction ───────────────────────────────────────────────────────────
def _extract_tags(path: Path) -> tuple[str, str]:
    """Return (title, artist) from embedded tags, or parse from filename."""
    try:
        audio = MutagenFile(str(path), easy=True)
        if audio:
            title  = ((audio.get('title')  or [''])[0]).strip()
            artist = ((audio.get('artist') or [''])[0]).strip()
            if title:
                return title, artist
    except Exception:
        pass

    # Filename fallback
    stem = path.stem
    stem = _EDITOR_CREDIT.sub('', stem)          # remove " by Issyn"
    stem = _EDIT_NOISE.sub(' ', stem)             # remove edit markers
    stem = re.sub(r'[\[\](){}]', ' ', stem)       # remove brackets
    stem = re.sub(r'[-_]+', ' ', stem)
    stem = re.sub(r'\s{2,}', ' ', stem).strip()
    stem = re.sub(r'[,.\-]+$', '', stem).strip()  # trailing punctuation
    return stem, ''

# ─── Spotify search ───────────────────────────────────────────────────────────
def _search(token: str, title: str, artist: str) -> str | None:
    def _call(q: str) -> str | None:
        try:
            r = requests.get(
                'https://api.spotify.com/v1/search',
                params={'q': q, 'type': 'track', 'limit': 1, 'market': 'US'},
                headers={'Authorization': f'Bearer {token}'},
                timeout=10,
            )
            if r.status_code == 429:
                wait = int(r.headers.get('Retry-After', 5))
                print(f"  Rate limited — waiting {wait}s …")
                time.sleep(wait)
                return _call(q)
            if not r.ok:
                return None
            items = r.json().get('tracks', {}).get('items', [])
            return items[0]['id'] if items else None
        except Exception as e:
            print(f"  Request error: {e}")
            return None

    # Try with artist filter first, then title-only
    if artist:
        result = _call(f'track:{title} artist:{artist}')
        if result:
            return result
    return _call(f'track:{title}')

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("Connecting to Spotify …")
    token = _get_token()
    print("✓ Authenticated\n")

    root = Path(__file__).parent
    total_files = total_found = 0

    for cat in CATEGORIES:
        folder = root / cat
        if not folder.is_dir():
            continue

        files = sorted(f for f in folder.iterdir() if f.suffix.lower() in AUDIO_EXTS)
        if not files:
            continue

        out_path = folder / 'spotify.json'
        existing: dict = {}
        if out_path.exists():
            try:
                existing = json.loads(out_path.read_text(encoding='utf-8'))
            except Exception:
                pass

        result = dict(existing)
        print(f"── {cat.upper()} ({len(files)} files) ──────────────────────────────────")

        for fp in files:
            fname = fp.name
            total_files += 1

            if fname in result:
                print(f"  [cached]  {fname}")
                total_found += 1
                continue

            title, artist = _extract_tags(fp)
            label = f'"{title}"' + (f' — {artist}' if artist else '')
            print(f"  Searching {label}")

            track_id = _search(token, title, artist)
            if track_id:
                result[fname] = track_id
                total_found += 1
                print(f"    ✓ https://open.spotify.com/track/{track_id}")
            else:
                print(f"    ✗ Not found on Spotify")

            time.sleep(REQUEST_DELAY)

        out_path.write_text(
            json.dumps(result, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )
        print(f"  → {cat}/spotify.json saved ({len(result)}/{len(files)} matched)\n")

    print(f"{'─'*56}")
    print(f"Done. {total_found}/{total_files} tracks matched.")
    print(f"Run  python3 generate.py  to also refresh songs.json files.")

if __name__ == '__main__':
    main()
