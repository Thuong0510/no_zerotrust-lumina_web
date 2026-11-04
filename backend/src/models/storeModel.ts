import { all, one } from './database.js';

// Deliberately select public fields; never reuse a SELECT p.* management payload.
const fields = `p.id,p.name,p.sku,p.description,p.category_id,c.name category,p.price,p.image,
  EXISTS(SELECT 1 FROM product_variants v JOIN inventory i ON i.variant_id=v.id WHERE v.product_id=p.id AND i.quantity>0) available`;
export const products = () => all(`SELECT ${fields} FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.status='Active' ORDER BY p.id DESC`);
export const product = (id:number) => one(`SELECT ${fields} FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=? AND p.status='Active'`,id);
export const variants = (id:number) => all(`SELECT v.id,v.sku,v.size,v.color,(i.quantity>0) available FROM product_variants v JOIN inventory i ON i.variant_id=v.id WHERE v.product_id=? ORDER BY v.id`,id);
export const publishedImage = (image:string) => one("SELECT id FROM products WHERE status='Active' AND image=? LIMIT 1",image);
