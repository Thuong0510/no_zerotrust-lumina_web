import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
export const config = {
  port: Number(process.env.PORT || 3000),
  origin: process.env.APP_ORIGIN || 'http://localhost:3000',
  schema: process.env.DATABASE_SCHEMA || 'lumina',
  databaseUrl: process.env.DATABASE_URL || '',
  uploadsDir: path.resolve(process.env.UPLOADS_DIR || './uploads'),
  production: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
  demo: process.env.DEMO_MODE === 'true',
  shippingFee: Number(process.env.SHIPPING_FEE ?? 30000),
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 500000),
  supportEmail: process.env.SHOP_SUPPORT_EMAIL || '',
  supportPhone: process.env.SHOP_SUPPORT_PHONE || '',
};
const appOrigin = new URL(config.origin);
if (!['http:', 'https:'].includes(appOrigin.protocol) || appOrigin.username || appOrigin.password ||
    appOrigin.pathname !== '/' || appOrigin.search || appOrigin.hash) throw new Error('APP_ORIGIN must be an HTTP(S) origin without credentials, path, query or fragment.');
if (![config.shippingFee, config.freeShippingThreshold].every(v => Number.isSafeInteger(v) && v >= 0 && v <= 1000000000)) throw new Error('Invalid shipping configuration');
if (!config.databaseUrl) throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
if (config.production && config.demo) throw new Error('Production requires DEMO_MODE=false. Use NODE_ENV=development for local demo.');
function uploadPath(key: string) {
  if (!/^uploads\/[a-f0-9]{64}\.(png|jpg)$/.test(key)) throw new Error('Invalid upload key');
  return path.join(config.uploadsDir, key.slice(8));
}
if (!/^[a-z][a-z0-9_]{0,62}$/.test(config.schema)) throw new Error('Invalid DATABASE_SCHEMA');
if (config.production && process.env.DATABASE_SSL !== 'true') throw new Error('Production requires DATABASE_SSL=true.');
if (config.production && process.env.TRUST_PROXY === 'true') throw new Error('TRUST_PROXY=true is unsupported without verified proxy peer addresses. Use the Vercel adapter for trusted platform IPs.');
if (config.production && !process.env.APP_ORIGIN?.startsWith('https://')) throw new Error('Production requires HTTPS APP_ORIGIN.');
const cloudStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_STORAGE_KEY);
if (config.production && !cloudStorage) throw new Error('Production requires Supabase private storage configuration.');
async function storage() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_STORAGE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(process.env.SUPABASE_BUCKET || 'lumina-private');
}
export const env = {
  DEMO_MODE: config.demo ? 'true' : 'false',
  DEMO_PASSWORD: process.env.DEMO_PASSWORD,
  BUCKET: {
    async get(key: string) {
      uploadPath(key); // Validate before filesystem or network access.
      if (cloudStorage) {
        const { data, error } = await (await storage()).download(key);
        if (error) { if (Number((error as any).statusCode) === 404) return null; throw error; }
        return { body: new Uint8Array(await data.arrayBuffer()), httpMetadata: {contentType:key.endsWith('.png') ? 'image/png' : 'image/jpeg'} };
      }
      try {
        const body = await readFile(uploadPath(key));
        return { body: new Uint8Array(body), httpMetadata: {contentType: key.endsWith('.png') ? 'image/png' : 'image/jpeg'} };
      } catch (error: any) { if (error.code === 'ENOENT') return null; throw error; }
    },
    async put(key: string, bytes: Uint8Array, _options?: unknown) {
      uploadPath(key);
      if (cloudStorage) {
        const { error } = await (await storage()).upload(key, bytes, {contentType:key.endsWith('.png') ? 'image/png' : 'image/jpeg', upsert:false});
        if (error) throw error;
        return;
      }
      await mkdir(config.uploadsDir, {recursive:true});
      await writeFile(uploadPath(key), bytes, {flag:'wx', mode:0o600});
    }
  }
};
