const retryBtn = document.getElementById('retry');

const params = new URLSearchParams(window.location.search);
const pendingUrl = params.get('pending');

if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    if (pendingUrl) {
      window.location.href = pendingUrl;
    } else {
      window.location.href = 'chrome://newtab/';
    }
  });
}
