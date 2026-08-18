const finalList = document.getElementById('final-list');
const pageError = document.getElementById('page-error');
const siteRoot = new URL('../', window.location.href);

const cacheBoundUrl = (url, sha256) => {
  const resolved = new URL(url, siteRoot);
  resolved.searchParams.set('v', sha256.slice(0, 16));
  return resolved.href;
};

const setPageError = (message = '') => {
  pageError.textContent = message;
  pageError.hidden = !message;
};

const assertFinalCatalog = (catalog) => {
  if (catalog.schema_version !== 1 || catalog.release_set !== 'MEGASTUDY_15_FINAL' || !Array.isArray(catalog.releases)) {
    throw new Error('Unsupported final manifest');
  }
  if (catalog.releases.length === 0) throw new Error('Final manifest is empty');
  if (new Set(catalog.releases.map((entry) => entry.id)).size !== catalog.releases.length) throw new Error('Duplicate final release');
  for (const entry of catalog.releases) {
    if (entry.artifact_label !== 'FINAL_RELEASE' || entry.qa_status !== 'PASS_DRIVE_IMPORT_FULL_DECODE' || entry.release_approved !== true) {
      throw new Error(`Non-final entry rejected: ${entry.id}`);
    }
  }
};

const renderRelease = (entry) => {
  const article = document.createElement('article');
  article.className = 'final-card';
  article.setAttribute('aria-label', `완성본 영상 ${entry.part}`);

  const videoWrap = document.createElement('div');
  videoWrap.className = 'video-wrap';

  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = cacheBoundUrl(entry.source.url, entry.sha256);
  video.setAttribute('aria-label', `완성본 영상 ${entry.part} 재생`);

  const videoError = document.createElement('p');
  videoError.className = 'video-error';
  videoError.hidden = true;
  videoError.setAttribute('role', 'alert');
  video.addEventListener('error', () => {
    videoError.textContent = '영상 파일을 재생할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    videoError.hidden = false;
  });

  videoWrap.append(video);
  article.append(videoWrap, videoError);
  return article;
};

const start = async () => {
  try {
    const response = await fetch('../media/final-manifest.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const catalog = await response.json();
    assertFinalCatalog(catalog);
    finalList.replaceChildren(...catalog.releases.map(renderRelease));
    setPageError();
  } catch (error) {
    setPageError(`완성본을 불러오지 못했습니다: ${error.message}`);
  }
};

start();
