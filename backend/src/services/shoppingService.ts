import { z } from 'zod';
import { config } from '../config/runtime.js';
import { AppError, authorize, audit, digest, random, db, run } from '../middleware/security.js';
import { transaction } from '../models/database.js';
import * as shopping from '../models/shoppingModel.js';
import * as business from '../models/businessModel.js';
import { parse } from './validation.js';

const itemsSchema = z.array(z.object({variant_id:z.number().int().positive(),quantity:z.number().int().min(1).max(99)}).strict()).min(1).max(50);
const shippingSchema = z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(150).transform(v=>v.toLowerCase()),phone:z.string().trim().regex(/^[+0-9 ()-]{8,20}$/),address:z.string().trim().min(5).max(500),notes:z.string().trim().max(500).default('')}).strict();
async function quote(user: any, input: z.infer<typeof itemsSchema>) {
  authorize(user,'product.view');
  const quantities = new Map<number,number>();
  for (const item of input) quantities.set(item.variant_id,(quantities.get(item.variant_id)||0)+item.quantity);
  const items = [];
  for (const [id,quantity] of [...quantities].sort(([a],[b])=>a-b)) {
    if(quantity>99) throw new AppError(422,'Mỗi biến thể tối đa 99 sản phẩm.');
    const v=await shopping.variant(id);
    if(!v || v.status!=='Active') throw new AppError(409,'Một sản phẩm đã ngừng bán. Vui lòng cập nhật giỏ hàng.');
    if(v.quantity<quantity) throw new AppError(409,`${v.name} (${v.size}/${v.color}) không đủ hàng cho số lượng đã chọn. Vui lòng giảm số lượng.`);
    const {status,quantity:stock,...safe}=v;
    items.push({...safe,quantity});
  }
  const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0);
  const shipping_fee=subtotal>=config.freeShippingThreshold ? 0 : config.shippingFee;
  const total=subtotal+shipping_fee;
  const quote_hash=await digest(JSON.stringify({user:user.id,items:items.map(i=>[i.variant_id,i.quantity,i.price]),shipping_fee}));
  return {items,subtotal,shipping_fee,total,quote_hash};
}
export async function checkoutQuote(user: any, data: unknown) { return quote(user,parse(z.object({items:itemsSchema}).strict(),data).items); }
export async function checkoutAddress(user: any) { return await shopping.savedAddress(user.id) || null; }
export async function myOrders(user: any, id?: number) {
  if(!id) return shopping.ownOrders(user.id);
  const row=await shopping.ownOrder(user.id,id);
  if(!row) throw new AppError(404,'Không tìm thấy đơn hàng của bạn.');
  return {...row,subtotal:row.total-row.shipping_fee,items:await shopping.ownItems(id)};
}
export async function placeCheckout(req: Request,user: any,data: unknown) {
  return transaction(async()=>{
    authorize(user,'product.view');
    const d=parse(z.object({items:itemsSchema,shipping:shippingSchema,quote_hash:z.string().regex(/^[a-f0-9]{64}$/),idempotency_key:z.string().uuid(),accept_policy:z.literal(true)}).strict(),data);
    // Safely replay a committed checkout even if stock or prices changed later.
    const fingerprint=await digest(JSON.stringify({...d,items:[...d.items].sort((a,b)=>a.variant_id-b.variant_id)}));
    const previous=await shopping.previousCheckout(user.id,d.idempotency_key);
    if(previous) {
      if(previous.checkout_fingerprint!==fingerprint) throw new AppError(409,'Yêu cầu đã được dùng cho thông tin khác. Hãy kiểm tra đơn hàng của bạn.');
      return myOrders(user,previous.id);
    }
    const q=await quote(user,d.items);
    if(q.quote_hash!==d.quote_hash) throw new AppError(409,'Giá hoặc phí giao hàng đã thay đổi. Vui lòng xem lại tổng tiền trước khi đặt.');
    const customer=await shopping.saveCustomer(user.id,d.shipping);
    const code='LM-'+Date.now().toString(36).toUpperCase()+'-'+random().slice(0,8).toUpperCase();
    const inserted=await shopping.insertOrder(code,customer.meta.last_row_id,q.total,user.id,user.id,d.shipping.name,d.shipping.email,d.shipping.phone,d.shipping.address,d.shipping.notes,q.shipping_fee,d.idempotency_key,fingerprint);
    for(const i of q.items) await db().batch([business.createOrderQuery4(i.quantity,i.variant_id),business.createOrderQuery5(i.variant_id,i.quantity,i.price,code),business.createOrderQuery6(i.variant_id,-i.quantity,user.id,code)]);
    await run("INSERT INTO notifications(title,message,audience) VALUES('Đơn COD mới',?,'Employee')",'Đơn hàng '+code+' chờ xác nhận.');
    await shopping.notifyBuyer(user.id,'Đặt hàng thành công',`Đơn ${code} đang chờ xác nhận. Tổng COD: ${q.total.toLocaleString('vi-VN')}đ.`);
    await audit(req,user.id,'CHECKOUT_COD',code);
    return myOrders(user,inserted.meta.last_row_id);
  },true);
}
export async function cancelMyOrder(req: Request,user: any,id: number) {
  return transaction(async()=>{
    const own=await shopping.ownOrder(user.id,id);
    if(!own) throw new AppError(404,'Không tìm thấy đơn hàng của bạn.');
    if(own.status==='Cancelled') return {ok:true};
    if(own.status!=='Pending'||own.payment!=='Unpaid') throw new AppError(409,'Chỉ tự hủy đơn chưa thanh toán và đang chờ xác nhận. Vui lòng liên hệ cửa hàng.');
    const old=await business.updateOrderQuery1(id);
    const result=await db().batch([business.updateOrderQuery2(user.id,'Khách hủy '+old.code,id,old.status,old.revision),business.updateOrderQuery3(id,old.status,old.revision,id),business.updateOrderQuery4(old.code,id,old.status,old.revision),business.updateOrderQuery5('Cancelled',old.payment,old.payment_method,id,old.status,old.revision)]);
    if(!result.at(-1).meta.changes) throw new AppError(409,'Đơn đã thay đổi, hãy tải lại.');
    await shopping.notifyBuyer(user.id,'Đơn hàng đã hủy','Đơn '+old.code+' đã được hủy theo yêu cầu của bạn.');
    await audit(req,user.id,'CANCEL_OWN_ORDER',old.code);
    return {ok:true};
  },true);
}
