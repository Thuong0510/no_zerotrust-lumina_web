import * as store from '../models/storeModel.js';
import { AppError } from '../middleware/security.js';
import { config } from '../config/runtime.js';

function publicImage(row:any) {
    return {...row,image:typeof row.image==='string'&&/^\/api\/media\/[a-f0-9]{64}\.(png|jpg)$/.test(row.image)?row.image.replace('/api/media/','/api/store/media/'):null};
}
export async function publicProducts(id?:number) {
    if(id===undefined)return (await store.products()).map(publicImage);
    const row=await store.product(id);
    if(!row)throw new AppError(404,'Sản phẩm không còn được mở bán.');
    return {...publicImage(row),variants:await store.variants(id)};
}
export async function publicMedia(key:string) {
    if(!/^[a-f0-9]{64}\.(png|jpg)$/.test(key)||!await store.publishedImage('/api/media/'+key))throw new AppError(404,'Không tìm thấy ảnh sản phẩm.');
}
export const shopPolicy=()=>({shipping_fee:config.shippingFee,free_shipping_threshold:config.freeShippingThreshold,support_email:config.supportEmail,support_phone:config.supportPhone});
