// Database access for demoSeed. Inputs are validated by services; values use bound parameters.
import { one, all, run, stmt } from './database.js';
export const ensureSeedQuery1 = (...args: any[]) => one("SELECT value FROM settings WHERE key='seeded'", ...args);
export const seedQuery1 = (...args: any[]) => stmt('INSERT OR IGNORE INTO roles(id,name) VALUES(?,?)', ...args);
export const seedQuery2 = (...args: any[]) => stmt('INSERT OR IGNORE INTO permissions(id,name) VALUES(?,?)', ...args);
export const seedQuery3 = (...args: any[]) => stmt('INSERT OR IGNORE INTO role_permissions(role_id,permission_id) VALUES(?,?)', ...args);
export const seedQuery4 = (...args: any[]) => stmt('INSERT OR IGNORE INTO employees(id,name,email,phone,department,position,join_date,status,address) VALUES(?,?,?,?,?,?,?,?,?)', ...args);
export const seedQuery5 = (...args: any[]) => stmt('INSERT OR IGNORE INTO users(id,name,username,email,phone,employee_id,password_hash,status) VALUES(?,?,?,?,?,?,?,?)', ...args);
export const seedQuery6 = (...args: any[]) => stmt('INSERT OR IGNORE INTO user_roles(user_id,role_id) VALUES(?,?)', ...args);
export const seedQuery7 = (...args: any[]) => stmt('INSERT OR IGNORE INTO categories(id,name,description) VALUES(?,?,?)', ...args);
export const seedQuery8 = (...args: any[]) => stmt('INSERT OR IGNORE INTO suppliers(id,name,contact_person,phone,email,address,status) VALUES(?,?,?,?,?,?,?)', ...args);
export const seedQuery9 = (...args: any[]) => stmt('INSERT OR IGNORE INTO products(id,name,sku,description,category_id,price,cost,supplier_id,status) VALUES(?,?,?,?,?,?,?,?,?)', ...args);
export const seedQuery10 = (...args: any[]) => stmt('INSERT OR IGNORE INTO product_variants(id,product_id,sku,size,color) VALUES(?,?,?,?,?)', ...args);
export const seedQuery11 = (...args: any[]) => stmt('INSERT OR IGNORE INTO inventory(variant_id,quantity) VALUES(?,?)', ...args);
export const seedQuery12 = (...args: any[]) => stmt('INSERT OR IGNORE INTO inventory_transactions(id,variant_id,action,quantity,employee_id,note) VALUES(?,?,?,?,?,?)', ...args);
export const seedQuery13 = (...args: any[]) => stmt('INSERT OR IGNORE INTO customers(id,name,email,phone,address) VALUES(?,?,?,?,?)', ...args);
export const seedQuery14 = (...args: any[]) => stmt('INSERT OR IGNORE INTO orders(id,code,customer_id,total,payment_method,payment,status,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)', ...args);
export const seedQuery15 = (...args: any[]) => stmt('INSERT OR IGNORE INTO order_items(id,order_id,variant_id,quantity,price) VALUES(?,?,?,?,?)', ...args);
export const seedQuery16 = (...args: any[]) => stmt('INSERT OR IGNORE INTO notifications(id,title,message,audience) VALUES(?,?,?,?)', ...args);
export const seedQuery17 = (...args: any[]) => stmt("INSERT INTO activity_logs(user_id,action,resource,ip) VALUES(1,'SYSTEM_SEED','Khởi tạo dữ liệu demo','system')", ...args);
export const seedQuery18 = (...args: any[]) => stmt("INSERT OR IGNORE INTO settings(key,value) VALUES('seeded','1')", ...args);

