import { useEffect, useRef, useState } from 'react';
import { api, money, date } from '../../lib/client';
import { CartItem } from '../../lib/cart';
import { Badge, Empty, ErrorBox, Modal, PageTitle, ProductArt } from './ui';

type Navigate = (page:string,id?:number)=>void;
export const orderStatus:Record<string,string>={Pending:'Chờ xác nhận',Confirmed:'Đã xác nhận',Processing:'Đang chuẩn bị',Shipped:'Đang giao',Completed:'Hoàn tất',Cancelled:'Đã hủy'};
type Policy={shipping_fee:number;free_shipping_threshold:number;support_email:string;support_phone:string};
export function PolicyContent({policy}:{policy:Policy}) {
    return <div className="shop-policy">
        <h3>Giao hàng và thanh toán</h3>
        <p>Thanh toán khi nhận hàng (COD). Phí giao hàng {money(policy.shipping_fee)}/đơn; miễn phí từ {money(policy.free_shipping_threshold)} tiền hàng. Tổng tiền cuối cùng được hiển thị trước khi xác nhận đặt hàng.</p>
        <p>Phục vụ địa chỉ tại Việt Nam. Cửa hàng xác nhận khả năng giao và thời gian dự kiến sau khi nhận đơn; thời gian thực tế phụ thuộc địa chỉ và đơn vị vận chuyển. Không có thanh toán thẻ hoặc chuyển khoản tự động trên website.</p>
        <h3>Hủy đơn</h3>
        <p>Bạn có thể tự hủy đơn chưa thanh toán ở trạng thái Chờ xác nhận trong “Đơn của tôi”. Sau khi đơn đã được xác nhận, vui lòng liên hệ cửa hàng để được hỗ trợ; không bảo đảm hủy được đơn đang giao.</p>
        <h3>Đổi trả trong 7 ngày</h3>
        <p>Liên hệ trong 7 ngày kể từ khi nhận hàng, cung cấp mã đơn và ảnh tình trạng sản phẩm. Hàng đổi size/màu cần còn tem nhãn, chưa sử dụng, chưa giặt và không hư hỏng; việc đổi phụ thuộc tồn kho.</p>
        <p>Nếu giao sai hoặc sản phẩm lỗi từ cửa hàng, cửa hàng chịu phí vận chuyển đổi trả sau khi xác minh. Đổi do nhu cầu size/màu, khách chịu chi phí vận chuyển thực tế được báo trước. Sản phẩm đã sử dụng, giặt hoặc hư hỏng do sử dụng không thuộc diện đổi theo nhu cầu.</p>
        <p>Việc nhận trả/hoàn tiền được cửa hàng xác nhận theo từng yêu cầu, không tự động trên website; không ảnh hưởng quyền của khách theo quy định áp dụng.</p>
        <h3>Thông tin cá nhân và hỗ trợ</h3>
        <p>Thông tin nhận hàng được lưu để xử lý đơn và điền lại cho lần mua tiếp theo; mỗi đơn giữ bản thông tin riêng. Không nhập số thẻ hoặc mã OTP vào ghi chú.</p>
        {policy.support_email && <p>Email: <a href={'mailto:'+policy.support_email}>{policy.support_email}</a></p>}
        {policy.support_phone && <p>Điện thoại: <a href={'tel:'+policy.support_phone}>{policy.support_phone}</a></p>}
        {!policy.support_email&&!policy.support_phone&&<p>Kênh liên hệ trực tuyến chưa được cửa hàng cung cấp. Đối với yêu cầu sau xác nhận hoặc đổi trả, vui lòng liên hệ trực tiếp nơi bán và cung cấp mã đơn.</p>}
    </div>;
}
export function ShopPolicyPage() {
    const [policy,setPolicy]=useState<Policy>(),[error,setError]=useState('');
    useEffect(()=>{let live=true;api('shop-policy').then(p=>{if(live)setPolicy(p);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
    return <><PageTitle title="Chính sách mua hàng" subtitle="Phí giao hàng, thanh toán COD, hủy đơn và đổi trả."/><ErrorBox error={error}/>{policy?<section className="panel checkout-section"><PolicyContent policy={policy}/></section>:!error&&<p role="status">Đang tải chính sách…</p>}</>;
}

export function CheckoutPage({items,user,navigate,onPlaced}:{items:CartItem[];user:any;navigate:Navigate;onPlaced:()=>void}) {
    const [policy,setPolicy]=useState<Policy>(),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
    const [shipping,setShipping]=useState({name:user.name||'',email:user.email||'',phone:user.phone||'',address:'',notes:''});
    const [quote,setQuote]=useState<any>(),[reviewed,setReviewed]=useState(false),[accepted,setAccepted]=useState(false),[showPolicy,setShowPolicy]=useState(false),[uncertain,setUncertain]=useState(false);
    const pending=useRef<any>(undefined);
    const itemKey=JSON.stringify(items.map(i=>({variant_id:i.variantId,quantity:i.quantity})).sort((a,b)=>a.variant_id-b.variant_id));
    const storageKey='lumina.checkout.v1.'+String(user.id);
    useEffect(()=>{let live=true;setError('');Promise.all([api('shop-policy'),api('checkout/address')]).then(([p,a])=>{if(live){setPolicy(p);if(a)setShipping(s=>({...s,...a}));setReady(true);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[user.id,attempt]);
    async function review(e:React.FormEvent<HTMLFormElement>) {
        e.preventDefault(); if(!e.currentTarget.reportValidity())return;
        if(shipping.name.trim().length<2||shipping.address.trim().length<5){setError('Vui lòng nhập đầy đủ họ tên và địa chỉ nhận hàng.');setReviewed(false);return;}
        setBusy(true);setError('');setReviewed(false);
        try {const q=await api('checkout/quote','POST',{items:JSON.parse(itemKey)});setQuote(q);setReviewed(true);}
        catch(e:any){setError(e.message);setQuote(undefined);}finally{setBusy(false);}
    }
    async function place() {
        if(busy||!quote||!accepted)return;
        setBusy(true);setError('');
        try {
            if(!pending.current){
                let key=crypto.randomUUID();
                try{const saved=JSON.parse(window.sessionStorage.getItem(storageKey)||'null');if(saved?.items===itemKey&&typeof saved.key==='string')key=saved.key;else window.sessionStorage.setItem(storageKey,JSON.stringify({items:itemKey,key}));}catch{/* memory fallback */}
                pending.current={items:JSON.parse(itemKey),shipping,quote_hash:quote.quote_hash,idempotency_key:key,accept_policy:true};
            }
            const order=await api('checkout','POST',pending.current);
            try{window.sessionStorage.removeItem(storageKey);}catch{/* memory fallback */}
            pending.current=undefined;onPlaced();navigate('my-orders',order.id);
        }catch(e:any){
            setError(e.message+(e.status?'':' Nếu mạng bị gián đoạn, bấm thử lại hoặc kiểm tra Đơn của tôi trước khi tạo đơn khác.'));
            if(e.status===409){setReviewed(false);setQuote(undefined);pending.current=undefined;setUncertain(false);}else if(!e.status||e.status>=500){setUncertain(true);}else{pending.current=undefined;setUncertain(false);}
        }finally{setBusy(false);}
    }
    const changed=quote?.items.some((v:any)=>items.find(i=>i.variantId===v.variant_id)?.unitPrice!==v.price);
    if(!items.length)return <><PageTitle title="Thanh toán" subtitle="Hoàn tất đơn hàng COD."/><section className="panel shopping-empty"><Empty text="Chưa có sản phẩm để thanh toán" hint="Thêm sản phẩm vào giỏ trước khi tiếp tục."/><button className="btn primary" onClick={()=>navigate('products')}>Chọn sản phẩm</button></section></>;
    return <><PageTitle eyebrow="LUMINA / CHECKOUT" title="Đặt hàng COD" subtitle="Kiểm tra giá, phí giao hàng và thông tin nhận hàng trước khi xác nhận."><button className="btn" disabled={busy} onClick={()=>navigate('cart')}>Quay lại giỏ hàng</button><button className="text-btn" onClick={()=>navigate('my-orders')}>Đơn của tôi</button></PageTitle>
        <ErrorBox error={error}/>{!ready&&!error&&<p role="status">Đang tải thông tin nhận hàng…</p>}{!ready&&error&&<button className="btn" onClick={()=>setAttempt(a=>a+1)}>Thử tải lại thông tin</button>}
        {ready&&<div className="shopping-layout"><form className="checkout-form" onSubmit={review}>
            <section className="panel checkout-section"><h3>Thông tin giao hàng</h3><fieldset disabled={busy||uncertain} className="checkout-fields"><div className="form-grid">
                {(['name','email','phone','address','notes'] as const).map(key=><label key={key} className={['address','notes'].includes(key)?'span-2':''}>{({name:'Họ và tên',email:'Email',phone:'Số điện thoại',address:'Địa chỉ nhận hàng tại Việt Nam',notes:'Ghi chú'})[key]}{key!=='notes'&&' *'}
                    {['address','notes'].includes(key)?<textarea name={key} value={shipping[key]} required={key==='address'} minLength={key==='address'?5:undefined} maxLength={500} onChange={e=>{setShipping({...shipping,[key]:e.target.value});setReviewed(false);}}/>:
                    <input name={key} type={key==='email'?'email':key==='phone'?'tel':'text'} required minLength={key==='name'?2:undefined} maxLength={key==='name'?100:key==='email'?150:20} pattern={key==='phone'?'[+0-9 ()-]{8,20}':key==='name'?'.*\\S.*':undefined} value={shipping[key]} onChange={e=>{setShipping({...shipping,[key]:e.target.value});setReviewed(false);}}/>}
                </label>)}
            </div></fieldset><p className="help-text">Địa chỉ của đơn đặt thành công được dùng để điền sẵn cho lần mua tiếp theo.</p></section>
            <section className="panel checkout-section"><h3>Thanh toán khi nhận hàng</h3><p>Bạn thanh toán tiền hàng và phí giao hàng cho người giao hàng khi nhận sản phẩm.</p><p>Phí {money(policy.shipping_fee)}; miễn phí từ {money(policy.free_shipping_threshold)} tiền hàng.</p>
                <label className="checkbox"><input type="checkbox" checked={accepted} disabled={busy||uncertain} onChange={e=>setAccepted(e.target.checked)}/>Tôi đã đọc và đồng ý chính sách mua hàng.</label><button type="button" className="text-btn" onClick={()=>setShowPolicy(true)}>Đọc chính sách giao hàng, hủy đơn và đổi trả</button>
            </section>
            {!uncertain&&<button className="btn primary checkout-review" disabled={busy} type="submit">{busy?'Đang kiểm tra…':'Kiểm tra giá và xem lại đơn'}</button>}
            {(reviewed||uncertain)&&quote&&<section className="panel checkout-section checkout-reviewed" role="status"><h3>Thông tin đặt hàng</h3><p>{shipping.name} · {shipping.phone}</p><p>{shipping.email}</p><p>{shipping.address}</p>{shipping.notes&&<p>{shipping.notes}</p>}{changed&&<p>Giá sản phẩm đã được cập nhật theo giá hiện tại của cửa hàng.</p>}<strong>Tổng COD: {money(quote.total)}</strong><p>Bấm xác nhận sẽ tạo đơn và giữ hàng. Chưa thu tiền trực tuyến.</p><button type="button" className="btn primary checkout-place" disabled={busy||!accepted} onClick={place}>{busy?'Đang đặt hàng…':uncertain?'Thử lại yêu cầu đặt hàng':'Xác nhận đặt hàng COD'}</button></section>}
        </form><aside className="panel shopping-summary"><h3>Tóm tắt đơn hàng</h3>{(quote?.items||items.map(i=>({variant_id:i.variantId,name:i.name,size:i.size,color:i.color,quantity:i.quantity,price:i.unitPrice}))).map((i:any)=><div className="summary-row" key={i.variant_id}><span>{i.name}<small>{i.size} / {i.color} · SL {i.quantity}</small></span><strong>{money(i.price*i.quantity)}</strong></div>)}<div className="summary-row"><span>Tiền hàng</span><strong>{money(quote?.subtotal??items.reduce((s,i)=>s+i.unitPrice*i.quantity,0))}</strong></div><div className="summary-row"><span>Phí giao hàng</span><strong>{quote?money(quote.shipping_fee):'Kiểm tra trước khi đặt'}</strong></div><div className="shopping-subtotal"><span>Tổng COD</span><strong>{quote?money(quote.total):'Chưa xác nhận'}</strong></div></aside></div>}
        {showPolicy&&policy&&<Modal title="Chính sách mua hàng" onClose={()=>setShowPolicy(false)} wide><PolicyContent policy={policy}/></Modal>}
    </>;
}

export function MyOrdersPage({rows,initialDetail,reload,navigate}:{rows:any[];initialDetail?:number;reload:()=>void;navigate:Navigate}) {
    const [detail,setDetail]=useState<any>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
    useEffect(()=>{let live=true;setDetail(undefined);setError('');setConfirm(false);if(initialDetail)api('my-orders/'+initialDetail).then(o=>{if(live)setDetail(o);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[initialDetail,rows]);
    async function cancel(){setBusy(true);setError('');try{await api('my-orders/'+detail.id+'/cancel','POST',{});setConfirm(false);reload();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
    return <><PageTitle title="Đơn của tôi" subtitle="Theo dõi các đơn hàng đã đặt từ tài khoản của bạn."><button className="btn" onClick={reload}>Tải lại</button><button className="btn primary" onClick={()=>navigate('products')}>Tiếp tục mua sắm</button></PageTitle><ErrorBox error={error}/>
        {!rows.length?<section className="panel shopping-empty"><Empty text="Bạn chưa có đơn hàng" hint="Khám phá sản phẩm và đặt đơn COD đầu tiên."/></section>:<section className="panel customer-orders">{rows.map(o=><button className="customer-order-row" key={o.id} onClick={()=>navigate('my-orders',o.id)}><span><strong>{o.code}</strong><small>{date(o.created_at)}</small></span><span>{orderStatus[o.status]||o.status}</span><strong>{money(o.total)}</strong></button>)}{rows.length===200&&<p className="help-text">Hiển thị 200 đơn gần nhất.</p>}</section>}
        {detail&&<Modal title={detail.code} subtitle="Thông tin đặt hàng của bạn" wide onClose={()=>navigate('my-orders')}><ErrorBox error={error}/><p role="status"><Badge>{detail.status}</Badge> {orderStatus[detail.status]} · {detail.payment==='Paid'?'Đã thanh toán':'Chưa thanh toán (COD)'}</p>
            {detail.status!=='Cancelled'&&<ol className="order-progress">{['Pending','Confirmed','Processing','Shipped','Completed'].map((s,i)=><li key={s} className={i<=['Pending','Confirmed','Processing','Shipped','Completed'].indexOf(detail.status)?'reached':''}>{orderStatus[s]}</li>)}</ol>}
            <h3>Người nhận</h3><p>{detail.shipping_name} · {detail.shipping_phone}</p><p>{detail.shipping_email}</p><p>{detail.shipping_address}</p>{detail.shipping_notes&&<p>Ghi chú: {detail.shipping_notes}</p>}
            <div className="customer-order-items">{detail.items.map((i:any)=><div className="cart-item" key={i.variant_id}><ProductArt image={i.image} name={i.name} category={i.category_id}/><div><strong>{i.name}</strong><p>{i.size} / {i.color} · SL {i.quantity}</p></div><strong>{money(i.price*i.quantity)}</strong></div>)}</div>
            <p>Tiền hàng: {money(detail.subtotal)} · Phí giao hàng: {money(detail.shipping_fee)}</p><div className="shopping-subtotal"><span>Tổng tiền</span><strong>{money(detail.total)}</strong></div>
            {detail.status==='Pending'&&detail.payment==='Unpaid'&&(confirm?<div className="cancel-order-confirm"><p>Bạn chắc chắn muốn hủy đơn này? Sản phẩm sẽ được hoàn về kho.</p><button className="btn" disabled={busy} onClick={()=>setConfirm(false)}>Giữ đơn</button><button className="btn danger-btn" disabled={busy} onClick={cancel}>{busy?'Đang hủy…':'Xác nhận hủy đơn'}</button></div>:<button className="btn" onClick={()=>setConfirm(true)}>Hủy đơn hàng</button>)}
            <button className="text-btn" onClick={()=>navigate('shop-policy')}>Chính sách và liên hệ hỗ trợ</button>
        </Modal>}
    </>;
}
