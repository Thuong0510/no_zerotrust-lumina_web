import { one, run } from './database.js';

export const insertUpload = (url:string, userId:number) => run('INSERT INTO uploaded_media(url,user_id) VALUES(?,?)',url,userId);
export const ownedUpload = (url:string, userId:number) => one('SELECT 1 FROM uploaded_media WHERE url=? AND user_id=?',url,userId);
export const ownAvatar = (url:string, userId:number) => one('SELECT 1 FROM users u LEFT JOIN employees e ON e.id=u.employee_id WHERE u.id=? AND (u.avatar=? OR e.avatar=?)',userId,url,url);
export const productImage = (url:string, role:string) => one("SELECT 1 FROM products WHERE image=? AND (?<>'Guest' OR status='Active')",url,role);
export const employeeAvatar = (url:string) => one('SELECT 1 FROM employees WHERE avatar=?',url);
export const userAvatar = (url:string) => one('SELECT 1 FROM users WHERE avatar=?',url);
