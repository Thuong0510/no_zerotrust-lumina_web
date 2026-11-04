// Database access for auth. Inputs are validated by services; values use bound parameters.
import { one, all, run, stmt } from './database.js';
export const authQuery1 = (...args: any[]) => one('SELECT * FROM users WHERE deleted_at IS NULL AND (lower(email)=lower(?) OR lower(username)=lower(?))', ...args);
export const authQuery2 = (...args: any[]) => run('UPDATE users SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=4 THEN ? ELSE locked_until END WHERE id=?', ...args);
export const authQuery3 = (...args: any[]) => run('UPDATE users SET failed_attempts=0,locked_until=0,last_login=CURRENT_TIMESTAMP WHERE id=?', ...args);
export const authQuery4 = (...args: any[]) => one('SELECT id FROM users WHERE deleted_at IS NULL AND (lower(email)=lower(?) OR lower(username)=lower(?))', ...args);
export const authQuery5 = (...args: any[]) => run('INSERT INTO users(name,username,email,phone,password_hash,status) VALUES(?,?,?,?,?,?)', ...args);
export const authQuery6 = (...args: any[]) => run('INSERT INTO user_roles(user_id,role_id) VALUES(?,3)', ...args);
export const authQuery7 = (...args: any[]) => run("INSERT INTO notifications(title,message,audience) VALUES('Tài khoản mới chờ duyệt',?,'Admin')", ...args);
export const authQuery8 = (...args: any[]) => one('SELECT id FROM users WHERE deleted_at IS NULL AND lower(email)=lower(?)', ...args);
export const authQuery9 = (...args: any[]) => run('INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES(?,?,?)', ...args);
export const authQuery10 = (...args: any[]) => one('SELECT t.* FROM password_reset_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.used=0 AND t.expires_at>? AND u.deleted_at IS NULL', ...args);
export const authQuery11 = (...args: any[]) => stmt('UPDATE users SET password_hash=?,failed_attempts=0,locked_until=0 WHERE id=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM password_reset_tokens WHERE token_hash=? AND user_id=users.id AND used=0 AND expires_at>?)', ...args);
export const authQuery12 = (...args: any[]) => stmt('UPDATE password_reset_tokens SET used=1 WHERE user_id=?', ...args);
export const authQuery13 = (...args: any[]) => stmt('DELETE FROM sessions WHERE user_id=?', ...args);
export const authQuery14 = (...args: any[]) => run('DELETE FROM sessions WHERE token_hash=?', ...args);
export const authQuery15 = (...args: any[]) => one('SELECT password_hash FROM users WHERE id=?', ...args);
export const authQuery16 = (...args: any[]) => stmt('UPDATE users SET password_hash=? WHERE id=?', ...args);
export const authQuery17 = (...args: any[]) => stmt('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', ...args);

export const upgradePasswordHash = (hash:string,id:number) => run('UPDATE users SET password_hash=? WHERE id=?',hash,id);

