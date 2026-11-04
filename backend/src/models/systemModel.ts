// Database access for system. Inputs are validated by services; values use bound parameters.
import { one, all, run, stmt } from './database.js';
export const handleQuery1 = (...args: any[]) => run('UPDATE users SET name=?,phone=?,email=?,avatar=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', ...args);
export const handleQuery2 = (...args: any[]) => run('UPDATE employees SET name=?,phone=?,email=?,avatar=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', ...args);
export const handleQuery3 = (...args: any[]) => run('INSERT OR IGNORE INTO notification_reads(user_id,notification_id) VALUES(?,?)', ...args);
export const handleQuery4 = (...args: any[]) => all('SELECT t.*,p.name,v.sku,v.size,v.color,u.name employee FROM inventory_transactions t JOIN product_variants v ON v.id=t.variant_id JOIN products p ON p.id=v.product_id LEFT JOIN users u ON u.id=t.employee_id ORDER BY t.id DESC', ...args);
export const handleQuery5 = (...args: any[]) => all('SELECT * FROM roles', ...args);
export const handleQuery6 = (...args: any[]) => all('SELECT * FROM permissions', ...args);
export const handleQuery7 = (...args: any[]) => all('SELECT * FROM role_permissions', ...args);
export const handleQuery8 = (...args: any[]) => all('SELECT id,name FROM permissions', ...args);
export const handleQuery9 = (...args: any[]) => stmt('DELETE FROM role_permissions WHERE role_id=?', ...args);
export const handleQuery10 = (...args: any[]) => stmt('INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?)', ...args);
export const handleQuery11 = (...args: any[]) => all('SELECT l.*,u.username FROM activity_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 1000', ...args);
export const handleQuery12 = (part0: any, part1: any, ...args: any[]) => all(`SELECT id,name FROM ${part0} WHERE name LIKE ? ${part1} LIMIT 5`, ...args);
export const handleQuery13 = (...args: any[]) => all('SELECT id,code name FROM orders WHERE code LIKE ? LIMIT 5', ...args);

