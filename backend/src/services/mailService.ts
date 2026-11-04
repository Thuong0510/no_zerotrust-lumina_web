import nodemailer from 'nodemailer';
import { config } from '../config/runtime.js';
export async function sendResetEmail(email:string, token:string) {
  if(!process.env.SMTP_HOST || !process.env.SMTP_FROM) return false;
  const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT || 587),secure:process.env.SMTP_SECURE==='true',requireTLS:config.production,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,auth:process.env.SMTP_USER ? {user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD} : undefined});
  const link=new URL('/?reset='+token,config.origin).href;
  await transport.sendMail({from:process.env.SMTP_FROM,to:email,subject:'LUMINA — Đặt lại mật khẩu',text:'Liên kết có hiệu lực 15 phút và chỉ dùng một lần: '+link+'\nNếu bạn không yêu cầu, hãy bỏ qua email này.'});
  return true;
}

