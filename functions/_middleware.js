// One address for the site. Once the domain is connected, the pages.dev address and the www
// spelling send people (and search engines) to stoicsoulclub.com, so the site has one canonical
// home. Preview deployments (<hash>.stoic-soul-club.pages.dev) and local dev are left alone.
const HOME = 'stoicsoulclub.com';
const MOVED = new Set(['stoic-soul-club.pages.dev', `www.${HOME}`]);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (MOVED.has(url.hostname)) {
    url.hostname = HOME; url.protocol = 'https:'; url.port = '';
    return Response.redirect(url.href, 301);
  }
  return next();
}
