import { handle } from './routes/apiRoutes.js';
import { requestTransaction } from './models/database.js';
import { config } from './config/runtime.js';
import { randomUUID } from 'node:crypto';
import { apiPath } from './config/apiPath.js';

// Injectable dispatch dependencies support isolated application tests.
export function createDispatcher(dependencies: {
  transaction?: typeof requestTransaction;
  handler?: typeof handle;
} = {}) {
  const transact = dependencies.transaction ?? requestTransaction;
  const handler = dependencies.handler ?? handle;
  return async function dispatch(request: Request, trustedIp: string) {
    const id = randomUUID();
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.delete('x-lumina-client-ip');
    headers.set('x-lumina-client-ip', trustedIp);
    const finish = (response: Response) => {
      for (const [key,value] of Object.entries({
        'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
        'X-Frame-Options':'DENY', 'Referrer-Policy':'no-referrer',
        'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        'X-Request-ID':id
      })) response.headers.set(key,value);
      if (config.production) response.headers.set('Strict-Transport-Security','max-age=31536000');
      if (response.status>=400) {
        const route=apiPath(url.pathname);
        console.warn('API rejected',{requestId:id,method:request.method,status:response.status,resource:route?.[0] || 'invalid-route',...(route?.[0]==='auth'?{action:route[1]}:{})});
      }
      return response;
    };
    const reply = (status:number, error:string, code?:string) => finish(new Response(JSON.stringify({error,code,requestId:id}), {status,headers:{'Content-Type':'application/json'}}));
    if (config.production && url.origin !== new URL(config.origin).origin) return reply(403,'Tên miền chưa được cấu hình cho ứng dụng.');
    if (headers.get('sec-fetch-site') === 'cross-site') return reply(403,'Yêu cầu không hợp lệ.');
    if (!['GET','HEAD','POST','PUT','DELETE'].includes(request.method)) return reply(405,'Phương thức không được hỗ trợ.');

    try {
      let body: Uint8Array | undefined;
      if (!['GET','HEAD'].includes(request.method)) {
        const chunks:Uint8Array[]=[]; let size=0;
        const reader=request.body?.getReader();
        if(reader) { try { for(;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3*1024*1024){await reader.cancel();return reply(413,'Tệp quá lớn.');}chunks.push(value);} } finally {reader.releaseLock();} }
        body=Buffer.concat(chunks);
        if(body.length && !/^(application\/json|multipart\/form-data)(;|$)/i.test(headers.get('content-type') || ''))return reply(415,'Content-Type không hợp lệ.');
      }
      const req=new Request(url,{method:request.method,headers,...(body?{body:body as BodyInit}:{})});
      const result=await transact(req,()=>handler(req));
      return finish(result);
    } catch(error:any) {
      console.error('API failed',{requestId:id,name:error?.name,code:error?.code});
      return reply(503,'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại.');
    }
  };
}

export const dispatch = createDispatcher();
