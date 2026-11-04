import { useEffect, useState } from 'react';

export const MAX_CART_QUANTITY = 99;
export type CartItem = {
    productId: number;
    variantId: number;
    name: string;
    sku: string;
    size: string;
    color: string;
    image?: string;
    categoryId?: number;
    unitPrice: number;
    quantity: number;
};
export const cartTotal = (items: CartItem[]) => items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
export const cartCount = (items: CartItem[]) => items.reduce((total, item) => total + item.quantity, 0);
const storageKey = (owner: string) => 'lumina.cart.v1.' + owner;

function restore(owner: string): CartItem[] {
    try {
        const value = JSON.parse(window.sessionStorage.getItem(storageKey(owner)) || '[]');
        if (!Array.isArray(value)) return [];
        const items: CartItem[] = [];
        for (const item of value) {
            if (!item || !Number.isSafeInteger(item.productId) || item.productId < 1 || !Number.isSafeInteger(item.variantId) || item.variantId < 1 ||
                !Number.isFinite(item.unitPrice) || item.unitPrice < 0 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_CART_QUANTITY ||
                !['name', 'sku', 'size', 'color'].every(key => typeof item[key] === 'string')) continue;
            if (!items.some(existing => existing.variantId === item.variantId)) items.push(item);
        }
        return items;
    } catch { return []; }
}

export function useCart(user: { id?: number; username?: string } | null) {
    const owner = user ? String(user.id ?? user.username ?? '') : '';
    const [state, setState] = useState<{ owner: string; items: CartItem[] }>({ owner: '', items: [] });
    const items = owner && state.owner === owner ? state.items : [];
    useEffect(() => { setState({ owner, items: owner ? restore(owner) : [] }); }, [owner]);
    useEffect(() => {
        if (!owner || state.owner !== owner) return;
        try { window.sessionStorage.setItem(storageKey(owner), JSON.stringify(state.items)); }
        catch { /* Browsers may disable storage; the in-memory cart still works. */ }
    }, [owner, state]);
    function update(transform: (items: CartItem[]) => CartItem[]) {
        if (!owner) return;
        setState(previous => ({ owner, items: transform(previous.owner === owner ? previous.items : []) }));
    }
    function add(item: CartItem) {
        update(previous => {
            const existing = previous.find(row => row.variantId === item.variantId);
            return existing ? previous.map(row => row.variantId === item.variantId ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, row.quantity + item.quantity) } : row) : [...previous, item];
        });
    }
    function setQuantity(variantId: number, quantity: number) {
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) return;
        update(previous => previous.map(item => item.variantId === variantId ? { ...item, quantity } : item));
    }
    return { items, add, setQuantity, remove: (id: number) => update(previous => previous.filter(item => item.variantId !== id)), clear: () => update(() => []) };
}
