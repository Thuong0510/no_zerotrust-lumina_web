// Reject ambiguous and malformed cookies identically in preflight and controller.
export function sessionToken(request: Request): string | undefined {
  const matches = [...(request.headers.get('cookie') || '').matchAll(/(?:^|;\s*)lumina_session=([^;]*)/g)];
  return matches.length === 1 && /^[a-f0-9]{64}$/.test(matches[0][1]) ? matches[0][1] : undefined;
}
