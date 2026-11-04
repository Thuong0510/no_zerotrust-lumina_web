const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const loopbackPeers = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isCanonicalHost(host: string | undefined, origin: string): boolean {
    if (!host || /[\s\\/@?#]/.test(host)) return false;
    try { return new URL(new URL(origin).protocol + '//' + host).host === new URL(origin).host; }
    catch { return false; }
}

export function requestUrl(target: string, host: string | undefined, remoteAddress: string | undefined, config: { origin: string; production: boolean }): URL {
    const configured = new URL(config.origin);
    const url = new URL(target, configured);
    // Vite preserves the browser's Host, including its frontend port. Only local
    // development connections may use it; deployed requests retain APP_ORIGIN.
    if (config.production || !loopbackHosts.has(configured.hostname) || !loopbackPeers.has(remoteAddress || '') || !host)
        return url;
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host))
        return url;
    try {
        const local = new URL(`${configured.protocol}//${host}`);
        url.host = local.host;
    } catch {
        // Malformed authorities must never select an origin.
    }
    return url;
}
