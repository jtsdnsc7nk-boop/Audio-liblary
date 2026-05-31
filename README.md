# Audio Library

A static music library website organized by vibe. No build tools required — open `index.html` in a browser or deploy directly to GitHub Pages.

## Adding Songs

1. Drop your `.mp3` file into the matching category folder (e.g. `aesthetic/my_song.mp3`)
2. Open that folder's `songs.json` and add the filename to the array:
   ```json
   ["existing_song.mp3", "my_song.mp3"]
   ```
3. Save the file. The site will display the new song automatically.

**Filename tip:** Use underscores instead of spaces — `my_cool_song.mp3` displays as "My Cool Song".

## Categories

| Folder | Vibe |
|--------|------|
| `aesthetic/` | Purple/blue dreamy |
| `chill/` | Teal/green relaxed |
| `badass/` | Orange/red intense |
| `hot/` | Pink/red energetic |
| `phonk/` | Purple/dark heavy |
| `sad/` | Blue/grey melancholic |
| `soft/` | Lavender/pink gentle |

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select **Deploy from a branch** and choose `main` (or `master`), root `/`.
4. Click **Save**. Your site will be live at `https://<username>.github.io/<repo>/`.

> **Note:** The audio player uses `fetch()` to load `songs.json`. GitHub Pages serves files correctly, but opening `index.html` directly as a local `file://` URL will block fetch requests due to CORS. Use a local HTTP server during development:
> ```bash
> python3 -m http.server 8000
> # then open http://localhost:8000
> ```
