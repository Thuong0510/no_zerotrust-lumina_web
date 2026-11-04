import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { api, money } from '../../lib/client';
import { CartItem, cartCount, cartTotal, MAX_CART_QUANTITY } from '../../lib/cart';
import { Empty, ErrorBox, Modal, PageTitle, ProductArt } from './ui';

export function AddToCart({ productId, items, onAdd, onClose }: {
    productId: number; items: CartItem[]; onAdd: (item: CartItem) => void; onClose: () => void;
}) {
    const [product, setProduct] = useState<any>();
    const [variantId, setVariantId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let live = true;
        setLoading(true); setError(''); setProduct(undefined);
        api('products/' + productId).then(data => {
            if (!live) return;
            setProduct(data);
            setVariantId(String(data.variants.find((variant: any) => variant.available)?.id || ''));
        }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
        return () => { live = false; };
    }, [productId, attempt]);
    const variant = product?.variants.find((row: any) => String(row.id) === variantId);
    const existing = items.find(item => item.variantId === variant?.id)?.quantity || 0;
    const available = product?.status === 'Active' && variant?.available === true;
    const validQuantity = Number.isInteger(Number(quantity)) && Number(quantity) >= 1 && Number(quantity) + existing <= MAX_CART_QUANTITY;
    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!available || !validQuantity) return;
        onAdd({ productId: product.id, variantId: variant.id, name: product.name, sku: variant.sku, size: variant.size, color: variant.color,
            image: product.image, categoryId: product.category_id, unitPrice: Number(product.price), quantity: Number(quantity) });
        onClose();
    }
    return <Modal title="Thêm vào giỏ hàng" subtitle="Chọn size, màu và số lượng phù hợp với bạn." onClose={onClose}>
        <ErrorBox error={error}/>
        {loading ? <p role="status">Đang tải sản phẩm…</p> : !product ? <button className="btn" onClick={() => setAttempt(value => value + 1)}>Thử lại</button> : <form onSubmit={submit}>
            <div className="shopping-product"><ProductArt category={product.category_id} image={product.image} name={product.name}/><div><h3>{product.name}</h3><p>{product.category}</p><strong>{money(Number(product.price))}</strong></div></div>
            {product.status !== 'Active' ? <ErrorBox error="Sản phẩm này hiện chưa mở bán."/> : !product.variants.some((row: any) => row.available) ? <ErrorBox error="Sản phẩm hiện chưa có biến thể còn hàng."/> : null}
            <label>Size / Màu<select required aria-label="Chọn size và màu" value={variantId} onChange={e => setVariantId(e.target.value)}><option value="">Chọn biến thể</option>{product.variants.map((row: any) => <option key={row.id} value={row.id} disabled={!row.available}>{row.size} / {row.color} · {row.sku}{!row.available ? ' · Hết hàng' : ''}</option>)}</select></label>
            <label>Số lượng<input aria-label="Số lượng thêm vào giỏ" type="number" min={1} max={Math.max(0, MAX_CART_QUANTITY - existing)} step={1} required value={quantity} onChange={e => setQuantity(e.target.value)}/></label>
            {!validQuantity && <ErrorBox error={`Mỗi biến thể tối đa ${MAX_CART_QUANTITY} sản phẩm trong giỏ${existing ? ` (đã có ${existing})` : ''}.`}/>}
            <div className="shopping-subtotal"><span>Tạm tính</span><strong>{money(Number(product.price) * (Number(quantity) || 0))}</strong></div>
            <footer className="modal-footer"><button type="button" className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={!available || !validQuantity}><ShoppingCart size={16}/>Thêm vào giỏ</button></footer>
        </form>}
    </Modal>;
}

function OrderSummary({ items, children }: { items: CartItem[]; children?: React.ReactNode }) {
    return <aside className="panel shopping-summary"><h3>Tóm tắt giỏ hàng</h3><div className="summary-lines">{items.map(item => <div key={item.variantId}><span>{item.name}<small>{item.size} / {item.color} · SL {item.quantity}</small></span><strong>{money(item.unitPrice * item.quantity)}</strong></div>)}</div><div className="summary-row"><span>Số lượng sản phẩm</span><strong>{cartCount(items)}</strong></div><div className="summary-row"><span>Phí giao hàng</span><span>Chưa tính</span></div><div className="shopping-subtotal"><span>Tạm tính</span><strong>{money(cartTotal(items))}</strong></div><p className="help-text">Giá và phí giao hàng sẽ được xác nhận khi đặt hàng.</p>{children}</aside>;
}

export function CartPage({ items, setQuantity, remove, clear, navigate }: {
    items: CartItem[]; setQuantity: (id: number, quantity: number) => void; remove: (id: number) => void; clear: () => void; navigate: (page: string) => void;
}) {
    return <><PageTitle eyebrow="LUMINA / SHOPPING" title="Giỏ hàng" subtitle={`${cartCount(items)} sản phẩm · Lựa chọn của bạn, trong một nơi.`}><button className="btn" onClick={() => navigate('products')}><ArrowLeft size={15}/>Tiếp tục chọn sản phẩm</button></PageTitle>
        {!items.length ? <section className="panel shopping-empty"><Empty text="Giỏ hàng của bạn đang trống" hint="Khám phá sản phẩm và chọn size, màu yêu thích."/><button className="btn primary" onClick={() => navigate('products')}>Khám phá sản phẩm<ArrowRight size={15}/></button></section> : <div className="shopping-layout"><section className="panel cart-panel"><div className="panel-heading"><h3>Sản phẩm đã chọn</h3><button className="text-btn" onClick={clear}>Xóa tất cả</button></div>{items.map(item => <article className="cart-item" key={item.variantId}>
            <ProductArt category={item.categoryId} image={item.image} name={item.name}/><div className="cart-item-info"><strong>{item.name}</strong><small>{item.size} / {item.color} · {item.sku}</small><span>{money(item.unitPrice)} / sản phẩm</span></div>
            <div className="quantity-control"><button className="icon-btn" disabled={item.quantity <= 1} aria-label={`Giảm số lượng ${item.sku}`} onClick={() => setQuantity(item.variantId, item.quantity - 1)}><Minus size={14}/></button><input aria-label={`Số lượng ${item.sku}`} type="number" min={1} max={MAX_CART_QUANTITY} step={1} value={item.quantity} onChange={e => setQuantity(item.variantId, Number(e.target.value))}/><button className="icon-btn" disabled={item.quantity >= MAX_CART_QUANTITY} aria-label={`Tăng số lượng ${item.sku}`} onClick={() => setQuantity(item.variantId, item.quantity + 1)}><Plus size={14}/></button></div>
            <strong className="cart-line-total">{money(item.unitPrice * item.quantity)}</strong><button className="icon-btn danger" aria-label={`Xóa ${item.sku} khỏi giỏ`} onClick={() => remove(item.variantId)}><Trash2 size={16}/></button>
        </article>)}</section><OrderSummary items={items}><button className="btn primary checkout-link" onClick={() => navigate('checkout')}>Tiến hành thanh toán<ArrowRight size={16}/></button></OrderSummary></div>}
    </>;
}

export { CheckoutPage } from './customer-shopping';
