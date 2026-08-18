const $ = (id) => document.getElementById(id);
const siteRoot = new URL('../', window.location.href);

const ui = {
  player: $('video-player'),
  title: $('generation-title'),
  meta: $('generation-meta'),
  summary: $('generation-summary'),
  history: $('generation-list'),
  error: $('page-error'),
};

let catalog;
let activeEntry;

const formatPublished = (iso) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
}).format(new Date(iso));

const cacheBoundUrl = (url, sha256) => {
  const resolved = new URL(url, siteRoot);
  resolved.searchParams.set('v', sha256.slice(0, 16));
  return resolved.href;
};

const setError = (message = '') => {
  ui.error.textContent = message;
  ui.error.hidden = !message;
};

const renderGenerationList = () => {
  ui.history.replaceChildren();
  for (const entry of catalog.generations) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'generation-button';
    button.dataset.generationId = entry.id;
    button.setAttribute('aria-pressed', String(entry.id === activeEntry?.id));

    const badge = document.createElement('span');
    badge.className = `scope-badge ${entry.artifact_label.toLowerCase()}`;
    badge.textContent = entry.artifact_label.replaceAll('_', ' ');

    const title = document.createElement('strong');
    title.textContent = entry.title;

    const details = document.createElement('span');
    details.textContent = `${formatPublished(entry.published_at_utc)} · ${entry.duration_seconds.toFixed(1)}초 · ${entry.width}×${entry.height} ${entry.fps}fps`;

    button.append(badge, title, details);
    button.addEventListener('click', () => selectGeneration(entry.id, {autoplay: false}));
    item.append(button);
    ui.history.append(item);
  }
};

async function selectGeneration(id, {autoplay = false} = {}) {
  const entry = catalog.generations.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Unknown generation: ${id}`);
  setError();
  activeEntry = entry;
  renderGenerationList();

  ui.player.pause();
  ui.player.src = cacheBoundUrl(entry.source.url, entry.sha256);
  ui.player.load();
  ui.title.textContent = entry.title;
  ui.meta.textContent = `${entry.artifact_label.replaceAll('_', ' ')} · ${entry.qa_status.replaceAll('_', ' ')} · ${entry.duration_seconds.toFixed(1)}초 · ${entry.width}×${entry.height} ${entry.fps}fps · SHA-256 ${entry.sha256.slice(0, 12)}…`;
  ui.summary.textContent = entry.summary;

  const url = new URL(window.location.href);
  url.searchParams.set('generation', entry.id);
  window.history.replaceState({}, '', url);

  if (autoplay) {
    try { await ui.player.play(); } catch { /* Playback can require a user gesture. */ }
  }
}

const start = async () => {
  try {
    const response = await fetch('../media/manifest.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    catalog = await response.json();
    if (catalog.schema_version !== 2 || !Array.isArray(catalog.generations)) throw new Error('Unsupported video manifest');
    const requested = new URLSearchParams(window.location.search).get('generation');
    const initial = catalog.generations.some((entry) => entry.id === requested) ? requested : catalog.active_generation;
    await selectGeneration(initial);
  } catch (error) {
    setError(`영상 히스토리를 불러오지 못했습니다: ${error.message}`);
  }
};

ui.player.addEventListener('error', () => setError('선택한 영상 파일을 재생할 수 없습니다. 다른 세대를 선택하거나 잠시 후 다시 시도해 주세요.'));
start();
