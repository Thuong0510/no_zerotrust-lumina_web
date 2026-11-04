import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from './config/runtime.js';
import { requestUrl, isCanonicalHost } from './config/requestUrl.js';
import { dispatch } from './app.js';
import { pool, requestTransaction } from './models/database.js';
import { migrate } from './models/migrate.js';
import { initialize } from './services/initializeService.js';
const dist=path.resolve('frontend/dist');
const origin=new URL(config.origin);
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
export function createAppServer() {
  return createServer(async(req,res)=> {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    const strictCsp = csp.replace("'unsafe-inline'", "");
    res.setHeader('Content-Security-Policy', strictCsp);
    if(origin.protocol==='https:')res.setHeader('Strict-Transport-Security','max-age=31536000');
    try {
      if(config.production && !isCanonicalHost(req.headers.host,config.origin)) {
        res.writeHead(403,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end('{"error":"Tên miền chưa được cấu hình cho ứng dụng."}');return;
      }
      const pathname=new URL(req.url || '/',config.origin).pathname;
      let decodedPath:string;
      try { decodedPath=decodeURIComponent(pathname); }
      catch {
        res.writeHead(400,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify({error:'Đường dẫn URL không hợp lệ.'}));return;
      }
      const sensitivePath =
        /(^|\/)\.(?!well-known(?:\/|$))/.test(decodedPath) ||
        /\.(?:sql|sqlite|db|bak|backup|pem|key)$/i.test(decodedPath);
      if (sensitivePath) {
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        res.end('Not Found');
        return;
      }
      if(pathname==='/healthz') {
        await pool.query('SELECT 1');res.writeHead(200,{'Content-Type':'application/json'});res.end('{"status":"ok"}');return;
      }
      if(pathname.startsWith('/api/')) {
        const requestHeaders=new Headers();
        for(const [key,value] of Object.entries(req.headers)) {
          if(value!==undefined && key !== 'x-lumina-client-ip')requestHeaders.set(key,Array.isArray(value)?value.join(','):value);
        }
        // Forwarded headers are untrusted without a verified proxy peer allowlist.
        const remote=req.socket.remoteAddress || 'local';
        const ip=remote;
        requestHeaders.set('x-lumina-client-ip',ip);
        // Streaming input size cap includes chunked/multipart requests.
        let size=0;const chunks:Buffer[]=[];
        for await(const chunk of req) {size+=chunk.length;if(size>3*1024*1024){res.writeHead(413,{'Content-Type':'application/json'});res.end('{"error":"Tệp quá lớn."}');return;}chunks.push(chunk);}
        const url=requestUrl(req.url || '/',req.headers.host,req.socket.remoteAddress,config);
        const request=new Request(url,{method:req.method,headers:requestHeaders,...(!['GET','HEAD'].includes(req.method || '')?{body:Buffer.concat(chunks)}:{})});
        const response=await dispatch(request,ip);
        res.statusCode=response.status;
        response.headers.forEach((value,key)=>res.setHeader(key,value));
        res.end(Buffer.from(await response.arrayBuffer()));return;
      }
      if(!['GET','HEAD'].includes(req.method || '')){res.writeHead(405);res.end();return;}
      const decoded=decodeURIComponent(pathname);
      const target=path.resolve(dist,'.'+decoded);
      if(target!==dist && !target.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}
      let file=target;
      try {if(!(await stat(file)).isFile())file=path.join(dist,'index.html');}
      catch {if(path.extname(decoded)){res.writeHead(404);res.end();return;}file=path.join(dist,'index.html');}
      const bytes=await readFile(file);
      res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control',file.includes(path.sep+'assets'+path.sep)?'public, max-age=31536000, immutable':'no-cache');
      res.end(req.method==='HEAD'?undefined:bytes);
    } catch(error:any) {
      console.error('Request failed',{name:error.name,code:error.code});
      if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end('{"error":"Internal Server Error. Vui lòng thử lại."}');
    }
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    // Run npm run db:seed explicitly before the first start.
    const server=createAppServer();
    server.listen(config.port,'0.0.0.0',()=>console.log('LUMINA ready at '+config.origin));
    for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=> {
      server.close(async()=>{await pool.end();process.exit(0);});
      setTimeout(()=>process.exit(1),10000).unref();
    });
  } catch(error:any){console.error('Startup failed:',error.message);await pool.end();process.exitCode=1;}
}
