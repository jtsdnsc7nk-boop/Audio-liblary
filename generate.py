#!/usr/bin/env python3
"""
Scans each category folder for audio files and writes songs.json.
Run this locally after adding audio files:
    python3 generate.py
"""

import json
import os

CATEGORIES = ['aesthetic', 'chill', 'badass', 'hot', 'phonk', 'sad', 'soft']
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'}

root = os.path.dirname(os.path.abspath(__file__))

for cat in CATEGORIES:
    folder = os.path.join(root, cat)
    if not os.path.isdir(folder):
        os.makedirs(folder)

    songs = sorted(
        f for f in os.listdir(folder)
        if os.path.splitext(f)[1].lower() in AUDIO_EXTENSIONS
    )

    json_path = os.path.join(folder, 'songs.json')
    with open(json_path, 'w', encoding='utf-8') as fp:
        json.dump(songs, fp, indent=2, ensure_ascii=False)

    print(f'{cat}/songs.json → {len(songs)} song(s): {songs}')
