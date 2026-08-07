// Mintlify's logo.href handles the destination. This small enhancement keeps
// the public site in a separate tab, so readers do not lose their place in docs.
const NEXUSAPI_WEBSITE = 'https://nexusapi.link/';

function configureBrandLink() {
  const brand = document.querySelector('nav-logo');
  const link = brand?.matches('a') ? brand : brand?.querySelector('a');
  if (!link) return false;

  link.href = NEXUSAPI_WEBSITE;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'NexusAPI — open website in a new tab');
  return true;
}

if (!configureBrandLink()) {
  const observer = new MutationObserver(() => {
    if (configureBrandLink()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}
