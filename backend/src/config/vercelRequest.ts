import { apiPath } from './apiPath.js';

// Only one rewrite selector is accepted. All query parameters unrelated to
// routing survive, but cannot choose an alternate dispatcher or trust a header.
export function vercelRequest(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname !== '/api/index') return request;
  const routes = url.searchParams.getAll('path');
  if (routes.length !== 1) throw new Error('Invalid API route');
  const route = routes[0];
  if (!/^[a-zA-Z0-9./-]+$/.test(route)) throw new Error('Invalid API route');
  if (route.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error('Invalid API route');
  url.searchParams.delete('path');
  url.pathname = '/api/' + route;
  if (!apiPath(url.pathname)) throw new Error('Invalid API route');
  return new Request(url, request);
}
