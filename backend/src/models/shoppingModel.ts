import { all, one, run } from './database.js';
export const variant = (id: number) => one(`SELECT v.id variant_id,v.sku,v.size,v.color,p.id product_id,p.name,p.price,p.image,p.category_id,p.status,i.quantity
  FROM product_variants v JOIN products p ON p.id=v.product_id JOIN inventory i ON i.variant_id=v.id WHERE v.id=?`, id);
export const savedAddress = (userId: number) => one('SELECT name,email,phone,address FROM customers WHERE user_id=?', userId);
export const saveCustomer = (userId: number, d: {name:string;email:string;phone:string;address:string}) => run(`INSERT INTO customers(user_id,name,email,phone,address) VALUES(?,?,?,?,?)
  ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,email=excluded.email,phone=excluded.phone,address=excluded.address,updated_at=CURRENT_TIMESTAMP RETURNING id`, userId,d.name,d.email,d.phone,d.address);
export const previousCheckout = (userId: number, key: string) => one('SELECT id,checkout_fingerprint FROM orders WHERE buyer_id=? AND checkout_key=?',userId,key);
const publicFields = 'id,code,total,shipping_fee,status,payment,payment_method,created_at,updated_at,shipping_name,shipping_email,shipping_phone,shipping_address,shipping_notes';
export const ownOrders = (userId: number) => all(`SELECT ${publicFields} FROM orders WHERE buyer_id=? ORDER BY id DESC LIMIT 200`, userId);
export const ownOrder = (userId: number, id: number) => one(`SELECT ${publicFields} FROM orders WHERE buyer_id=? AND id=?`, userId,id);
export const ownItems = (id: number) => all(`SELECT oi.variant_id,oi.quantity,oi.price,p.name,p.image,p.category_id,v.sku,v.size,v.color
  FROM order_items oi JOIN product_variants v ON v.id=oi.variant_id JOIN products p ON p.id=v.product_id WHERE oi.order_id=? ORDER BY oi.id`,id);
export const insertOrder = (...args: any[]) => run(`INSERT INTO orders(code,customer_id,total,payment_method,payment,status,created_by,buyer_id,shipping_name,shipping_email,shipping_phone,shipping_address,shipping_notes,shipping_fee,checkout_key,checkout_fingerprint)
  VALUES(?,?,?,'Cash','Unpaid','Pending',?,?,?,?,?,?,?,?,?,?) RETURNING id`,...args);
export const notifyBuyer = (userId: number, title: string, message: string) => run("INSERT INTO notifications(title,message,audience,target_user_id) VALUES(?,?,'All',?)", title,message,userId);
