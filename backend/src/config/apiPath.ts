// Share one canonical route grammar with the transaction and rate limiter.
export function apiPath(pathname: string): string[] | null {
  if (!/^\/api\/[a-z0-9-]+(?:\/[a-zA-Z0-9.-]+){0,2}$/.test(pathname)) return null;
  const parts = pathname.slice(5).split('/');
  const valid = /^(?:auth\/(?:login|register|forgot|reset|logout|change-password)|store\/(?:policy|products(?:\/[^/]+)?|media\/[^/]+)|(?:bootstrap|dashboard|shop-policy|profile|upload|roles|activity|reports|search)|checkout(?:\/(?:address|quote))?|my-orders(?:\/[^/]+(?:\/cancel)?)?|media\/[^/]+|inventory(?:\/history)?|orders(?:\/[^/]+(?:\/items)?)?|(?:products|categories|suppliers|customers|employees|users|notifications)(?:\/[^/]+)?|products\/[^/]+\/variants|notifications\/[^/]+\/read)$/.test(parts.join('/'));
  return valid ? parts : null;
}
