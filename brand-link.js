// Mintlify's logo.href handles the destination. This small enhancement keeps
// the public site in a separate tab, so readers do not lose their place in docs.
const NEXUSAPI_WEBSITE = 'https://nexusapi.link/';

function configureBrandLinks() {
  const links = new Set(
    [...document.querySelectorAll('.nav-logo')]
      .map((logo) => logo.closest('a'))
      .filter(Boolean),
  );
  if (!links.size) return false;

  for (const link of links) {
    link.classList.add('nexusapi-brand-link');
    link.href = NEXUSAPI_WEBSITE;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'NexusAPI — open website in a new tab');

    if (!link.querySelector('.nexusapi-wordmark')) {
      const wordmark = document.createElement('span');
      wordmark.className = 'nexusapi-wordmark';
      wordmark.textContent = 'NexusAPI';
      wordmark.setAttribute('aria-hidden', 'true');
      link.append(wordmark);
    }
  }
  return true;
}

if (!configureBrandLinks()) {
  const observer = new MutationObserver(() => {
    if (configureBrandLinks()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}
