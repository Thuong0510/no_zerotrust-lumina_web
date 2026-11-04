// Database access for security. Inputs are validated by services; values use bound parameters.
import { one, all, run, stmt } from './database.js';
export const throttleQuery1 = (...args: any[]) => run('INSERT INTO rate_limits(key,count,rate_window) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.rate_window=excluded.rate_window THEN rate_limits.count+1 ELSE 1 END,rate_window=excluded.rate_window', ...args);
export const throttleQuery2 = (...args: any[]) => one('SELECT count FROM rate_limits WHERE key=?', ...args);
export const auditQuery1 = (...args: any[]) => run('INSERT INTO activity_logs(user_id,action,resource,ip) VALUES(?,?,?,?)', ...args);
export const currentUserQuery1 = (...args: any[]) => one(`SELECT u.id,u.name,u.username,u.email,u.phone,u.employee_id,u.status,u.last_login,s.csrf,s.token_hash,r.name role,COALESCE(u.avatar,e.avatar) avatar,e.department,e.position FROM sessions s JOIN users u ON u.id=s.user_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id LEFT JOIN employees e ON e.id=u.employee_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='Active' AND u.deleted_at IS NULL`, ...args);
export const currentUserQuery2 = (...args: any[]) => all('SELECT p.name FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=?', ...args);
export const startSessionQuery1 = (...args: any[]) => run('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)', ...args);

