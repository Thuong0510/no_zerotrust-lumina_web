// Database access for catalog. Inputs are validated by services; values use bound parameters.
import { one, all, run, stmt } from './database.js';
export const listEntityQuery1 = (...args: any[]) => all(`SELECT u.id,u.name,u.username,u.email,u.phone,u.employee_id,u.status,u.last_login,u.created_at,r.name role,e.name employee FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id LEFT JOIN employees e ON e.id=u.employee_id WHERE u.deleted_at IS NULL ORDER BY u.id DESC`, ...args);
export const listEntityQuery2 = (part0: any, ...args: any[]) => all(`SELECT p.*,c.name category,s.name supplier,COALESCE(SUM(i.quantity),0) stock FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN product_variants v ON v.product_id=p.id LEFT JOIN inventory i ON i.variant_id=v.id ${part0} GROUP BY p.id,c.name,s.name ORDER BY p.id DESC`, ...args);
export const listEntityQuery3 = (...args: any[]) => all(`SELECT c.*,COUNT(o.id) total_orders,COALESCE(SUM(CASE WHEN o.status='Completed' THEN o.total ELSE 0 END),0) total_spending FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id ORDER BY c.id DESC`, ...args);
export const listEntityQuery4 = (userId: number, role: string, _role: string) => all(`SELECT n.*,CASE WHEN nr.user_id IS NULL THEN 'Unread' ELSE 'Read' END read_status FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id=n.id AND nr.user_id=? WHERE (n.target_user_id=? OR (n.target_user_id IS NULL AND (n.audience IN ('All',?) OR ?='Admin'))) ORDER BY n.id DESC`, userId,userId,role,role);
export const listEntityQuery5 = (part0: any, ...args: any[]) => all(`SELECT * FROM ${part0} ORDER BY id DESC`, ...args);
export const detailEntityQuery1 = (...args: any[]) => all('SELECT v.*,i.quantity,i.threshold FROM product_variants v JOIN inventory i ON i.variant_id=v.id WHERE v.product_id=?', ...args);
export const detailEntityQuery2 = (...args: any[]) => all('SELECT code,total,status,created_at FROM orders WHERE customer_id=? ORDER BY id DESC', ...args);
export const detailEntityQuery3 = (...args: any[]) => all('SELECT id,name,sku,status FROM products WHERE supplier_id=?', ...args);
export const mutateEntityQuery1 = (part0: any, ...args: any[]) => one(`SELECT id FROM ${part0} WHERE id=?${part0 === 'users' ? ' AND deleted_at IS NULL' : ''}`, ...args);
export const softDeleteUser = (id: number) => run("UPDATE users SET deleted_at=CURRENT_TIMESTAMP,status='Disabled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL", id);
export const mutateEntityQuery2 = (part0: any, ...args: any[]) => run(`UPDATE ${part0} SET status=? WHERE id=?`, ...args);
export const mutateEntityQuery3 = (...args: any[]) => run('DELETE FROM sessions WHERE user_id=?', ...args);
export const mutateEntityQuery4 = (part0: any, ...args: any[]) => run(`DELETE FROM ${part0} WHERE id=?`, ...args);
export const mutateEntityQuery5 = (part0: any, part1: any, ...args: any[]) => run(`UPDATE ${part0} SET ${part1},updated_at=CURRENT_TIMESTAMP WHERE id=?`, ...args);
export const mutateEntityQuery6 = (part0: any, part1: any, part2: any, ...args: any[]) => run(`INSERT INTO ${part0}(${part1}) VALUES(${part2})`, ...args);
export const mutateEntityQuery7 = (...args: any[]) => stmt('DELETE FROM user_roles WHERE user_id=?', ...args);
export const mutateEntityQuery8 = (...args: any[]) => stmt('INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name=?', ...args);
export const mutateEntityQuery9 = (...args: any[]) => stmt('DELETE FROM sessions WHERE user_id=?', ...args);
export const variantsQuery1 = (...args: any[]) => one('SELECT id FROM products WHERE id=?', ...args);
export const variantsQuery2 = (...args: any[]) => stmt('INSERT INTO product_variants(product_id,sku,size,color) VALUES(?,?,?,?)', ...args);
export const variantsQuery3 = (...args: any[]) => stmt('INSERT INTO inventory(variant_id,quantity) SELECT id,? FROM product_variants WHERE sku=?', ...args);
export const variantsQuery4 = (...args: any[]) => stmt("INSERT INTO inventory_transactions(variant_id,action,quantity,employee_id,note) SELECT id,'Stock In',?,?,'Khởi tạo biến thể' FROM product_variants WHERE sku=?", ...args);

