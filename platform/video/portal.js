const current = new URL(window.location.href);
if (current.searchParams.has('generation')) {
  const history = new URL('./history/', current);
  history.search = current.search;
  window.location.replace(history);
}
