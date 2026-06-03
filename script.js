'use strict';

function formatTime(sec) {
  if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatName(filename) {
  return filename
    .replace(/\.(mp3|wav|ogg|flac|aac|m4a)$/i, '')
    .replace(/_/g, ' ');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const AudioPlayer = (() => {
  const audio = new Audio();
  let currentRowEl = null;
  let currentSrc = null;

  const $ = id => document.getElementById(id);

  function _setRowState(rowEl, playing) {
    if (!rowEl) return;
    rowEl.classList.toggle('song-row--playing', playing);
    const btn = rowEl.querySelector('.song-row__play');
    if (btn) btn.textContent = playing ? '⏸' : '▶';
  }

  function _syncBar() {
    const dur = audio.duration;
    const cur = audio.currentTime;
    $('playerProgress').value = dur ? (cur / dur) * 100 : 0;
    $('playerCurrentTime').textContent = formatTime(cur);
    $('playerTotalTime').textContent = formatTime(dur);
  }

  audio.addEventListener('timeupdate', _syncBar);

  audio.addEventListener('loadedmetadata', () => {
    $('playerTotalTime').textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => {
    _setRowState(currentRowEl, false);
    $('playerPlayBtn').textContent = '▶';
    currentRowEl = null;
  });

  function play(src, rowEl, name, category) {
    if (currentRowEl && currentRowEl !== rowEl) {
      _setRowState(currentRowEl, false);
    }

    if (currentSrc !== src) {
      audio.src = src;
      currentSrc = src;
    }

    currentRowEl = rowEl;
    audio.play();
    _setRowState(rowEl, true);

    $('playerSongName').textContent = name;
    $('playerCategory').textContent = category;
    $('playerPlayBtn').textContent = '⏸';
    $('audioPlayer').classList.add('visible');
  }

  function pause() {
    audio.pause();
    _setRowState(currentRowEl, false);
    $('playerPlayBtn').textContent = '▶';
  }

  function toggle(src, rowEl, name, category) {
    if (currentSrc === src && !audio.paused) {
      pause();
    } else {
      play(src, rowEl, name, category);
    }
  }

  function seek(pct) {
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = (pct / 100) * audio.duration;
    }
  }

  function setVolume(v) {
    audio.volume = v;
  }

  function initControls() {
    $('playerPlayBtn').addEventListener('click', () => {
      if (!currentSrc) return;
      if (audio.paused) {
        audio.play();
        _setRowState(currentRowEl, true);
        $('playerPlayBtn').textContent = '⏸';
      } else {
        pause();
      }
    });

    $('playerProgress').addEventListener('input', e => seek(parseFloat(e.target.value)));
    $('playerVolume').addEventListener('input', e => setVolume(parseFloat(e.target.value)));
  }

  return { play, pause, toggle, seek, setVolume, initControls };
})();

function initNav() {
  const category = document.body.dataset.category || null;

  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a, .navbar__mobile a').forEach(link => {
    const href = link.getAttribute('href');
    const isHome = href === 'index.html' && page === 'index.html';
    const isCategory = category && href === `${category}.html`;
    const isExact = !category && href === page;

    if (isHome || isCategory || isExact) {
      link.classList.add('active');
    }
  });

  const hamburger = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.querySelector('.navbar__mobile');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
  }
}

function renderSkeletons(container) {
  container.innerHTML = Array.from({ length: 3 }, () => `
    <div class="skeleton-row">
      <div class="skeleton skeleton-play"></div>
      <div class="skeleton skeleton-name"></div>
      <div class="skeleton skeleton-duration"></div>
      <div class="skeleton skeleton-download"></div>
    </div>
  `).join('');
}

function renderSongs(songs, category, container, spotifyMap) {
  if (!songs.length) {
    container.innerHTML = `
      <div class="song-empty">
        No songs yet — drop <code>.mp3</code> files into <code>${category}/</code> and add their filenames to <code>${category}/songs.json</code>.
      </div>`;
    return;
  }

  const catLabel = capitalize(category);
  const html = songs.map(filename => {
    const name     = formatName(filename);
    const trackId  = spotifyMap && spotifyMap[filename];

    
    const src = `${category}/${encodeURIComponent(filename)}`;
    const spotifyHref = trackId
      ? `https://open.spotify.com/track/${trackId}`
      : `https://open.spotify.com/search/${encodeURIComponent(name)}`;
    return `
      <div class="song-row" data-src="${src}" data-name="${name}" data-cat="${catLabel}">
        <button class="song-row__play" aria-label="Play ${name}">▶</button>
        <span class="song-row__name">${name}</span>
        <span class="song-row__duration">--:--</span>
        <div class="song-row__actions">
          <a class="song-row__spotify" href="${spotifyHref}" target="_blank" rel="noopener" aria-label="Open ${name} on Spotify">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            Spotify
          </a>
          <a class="song-row__download" href="${src}" download="${filename}" aria-label="Download ${name}">⬇</a>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = html;

  
  container.querySelectorAll('.song-row').forEach(row => {
    const { src, name, cat } = row.dataset;

    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.src = src;
    tempAudio.addEventListener('loadedmetadata', () => {
      const durEl = row.querySelector('.song-row__duration');
      if (durEl) durEl.textContent = formatTime(tempAudio.duration);
    });

    row.querySelector('.song-row__play').addEventListener('click', () => {
      AudioPlayer.toggle(src, row, name, cat);
    });
  });
}

async function loadSongs(category) {
  const container = document.getElementById('songList');
  if (!container) return;

  renderSkeletons(container);

  try {
    const [songsRes, spotifyRes] = await Promise.all([
      fetch(`${category}/songs.json`),
      fetch(`${category}/spotify.json`).catch(() => null),
    ]);

    if (!songsRes.ok) throw new Error(`HTTP ${songsRes.status}`);
    const songs = await songsRes.json();

    let spotifyMap = null;
    if (spotifyRes && spotifyRes.ok) {
      spotifyMap = await spotifyRes.json();
    }

    renderSongs(songs, category, container, spotifyMap);
  } catch {
    container.innerHTML = `
      <div class="song-empty">
        Could not load song list — make sure <code>${category}/songs.json</code> exists.
      </div>`;
  }
}

const Search = (() => {
  const CATEGORIES = ['aesthetic', 'chill', 'badass', 'hot', 'phonk', 'sad', 'soft'];
  let cache = null;
  let overlay, input, results;

  const SVG_SEARCH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  function _inject() {
    
    const hamburger = document.querySelector('.navbar__hamburger');
    if (hamburger) {
      const btn = document.createElement('button');
      btn.className = 'navbar__search';
      btn.setAttribute('aria-label', 'Search songs');
      btn.innerHTML = SVG_SEARCH;
      btn.addEventListener('click', open);
      hamburger.parentNode.insertBefore(btn, hamburger);
    }

    
    const el = document.createElement('div');
    el.className = 'search-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Search songs');
    el.innerHTML = `
      <div class="search-box">
        <div class="search-input-wrap">
          ${SVG_SEARCH}
          <input class="search-input" type="text" placeholder="Search songs across all categories…" autocomplete="off" spellcheck="false" />
          <button class="search-close" aria-label="Close">✕</button>
        </div>
        <p class="search-hint">Press <kbd>Esc</kbd> to close &nbsp;·&nbsp; <kbd>Ctrl K</kbd> to open</p>
        <div class="search-results"></div>
      </div>`;
    document.body.appendChild(el);

    overlay = el;
    input   = el.querySelector('.search-input');
    results = el.querySelector('.search-results');

    el.addEventListener('click', e => { if (e.target === el) close(); });
    el.querySelector('.search-close').addEventListener('click', close);
    input.addEventListener('input', () => _query(input.value));
  }

  async function _loadAll() {
    if (cache) return;
    cache = {};
    await Promise.all(CATEGORIES.map(async cat => {
      try {
        const res = await fetch(`${cat}/songs.json`);
        cache[cat] = res.ok ? await res.json() : [];
      } catch { cache[cat] = []; }
    }));
  }

  function _highlight(text, q) {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    return text.slice(0, i)
      + `<mark>${text.slice(i, i + q.length)}</mark>`
      + text.slice(i + q.length);
  }

  async function _query(q) {
    await _loadAll();
    q = q.trim();
    if (!q) { results.innerHTML = ''; return; }

    const hits = [];
    for (const [cat, songs] of Object.entries(cache)) {
      for (const filename of songs) {
        const name = formatName(filename);
        if (name.toLowerCase().includes(q.toLowerCase())) {
          hits.push({ cat, filename, name });
        }
      }
    }

    if (!hits.length) {
      results.innerHTML = `<div class="search-empty">No results for "<strong>${q}</strong>"</div>`;
      return;
    }

    results.innerHTML = hits.slice(0, 40).map(({ cat, name }) => `
      <a class="search-result" href="${cat}.html">
        <div class="search-result__play">▶</div>
        <span class="search-result__name">${_highlight(name, q)}</span>
        <span class="search-result__cat">${capitalize(cat)}</span>
      </a>`).join('');
  }

  function open() {
    if (!overlay) _inject();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 60);
    _query(input.value);
  }

  function close() {
    overlay && overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function init() {
    _inject();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
    });
  }

  return { init, open, close };
})();

function loadProfilePics() {
  const EXTS  = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  document.querySelectorAll('.creator-avatar[data-pfp]').forEach(wrapper => {
    const folder = wrapper.dataset.pfp;
    const person = folder.split('/').pop();
    const img    = wrapper.querySelector('img');
    if (!img) return;

    
    const names = ['avatar', person, 'pfp', 'profile'];
    const candidates = names.flatMap(n => EXTS.map(e => `${folder}/${n}.${e}`));

    let i = 0;
    function tryNext() {
      if (i >= candidates.length) return;
      img.src = candidates[i++];
    }
    img.onerror = tryNext;
    img.onload  = () => wrapper.classList.add('has-pfp');
    tryNext();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  AudioPlayer.initControls();
  Search.init();
  loadProfilePics();
  const category = document.body.dataset.category;
  if (category) loadSongs(category);
});
