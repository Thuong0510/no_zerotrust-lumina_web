// Vercel Node.js function. No listen(), migration, seeding, or local-file writes.
import { ipAddress } from '@vercel/functions';
import { dispatch } from '../backend/src/app.js';
import { vercelRequest } from '../backend/src/config/vercelRequest.js';
export default {
  async fetch(request: Request) {
    let rewritten: Request;
    try { rewritten = vercelRequest(request); }
    catch { return new Response('{"error":"Invalid API path"}', { status:400, headers:{'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'} }); }
    return dispatch(rewritten, ipAddress(request) || 'unknown');
  }
};

