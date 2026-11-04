import { all, one, run, transaction } from '../models/database.js';
import { demoKey, demoPrefix, fashionProducts, fashionSuppliers, fashionCustomers, fashionOrderStates } from '../data/fashionDemo.js';

const label = ' [Demo LUMINA]';
type Variant = { id: number; sku: string; product: number; price: number; opening: number; balance: number };

// Fixed, internal identifiers; all data remains bound parameters. Batch to reduce remote DB round trips.
async function insertRows(table: string, columns: string[], rows: any[][], returning = '') {
  const results: any[] = [];
  for (let i = 0; i < rows.length; i += 250) {
    const batch = rows.slice(i, i + 250);
    const placeholders = batch.map(() => '(' + columns.map(() => '?').join(',') + ')').join(',');
    const result = await run(`INSERT INTO ${table}(${columns.join(',')}) VALUES ${placeholders}${returning}`, ...batch.flat());
    results.push(...result.results);
  }
  return results;
}

// A separate, append-only seed: never calls initialize(), changes accounts, or resets existing stock.
export async function seedFashionDemo(createdBy?: number) {
  return transaction(async () => {
    const previous = await one('SELECT value FROM settings WHERE key=?', demoKey);
    if (previous) return { skipped: true, ...JSON.parse(previous.value) };

    // Incomplete/conflicting namespaces are rejected rather than attached to somebody else's data.
    const collisions = await one(`SELECT
      (SELECT COUNT(*) FROM products WHERE sku LIKE ?) +
      (SELECT COUNT(*) FROM product_variants WHERE sku LIKE ?) +
      (SELECT COUNT(*) FROM orders WHERE code LIKE ?) +
      (SELECT COUNT(*) FROM customers WHERE email LIKE ?) +
      (SELECT COUNT(*) FROM suppliers WHERE email LIKE ?) +
      (SELECT COUNT(*) FROM categories WHERE name LIKE ?) AS n`,
    demoPrefix + '%', demoPrefix + '%', demoPrefix + '%', 'lf-demo-%@example.invalid', 'lf-demo-%@example.invalid', '%' + label);
    if (Number(collisions.n)) throw new Error('Namespace LF-DEMO đã có dữ liệu nhưng thiếu dấu hoàn tất. Không ghi đè; hãy kiểm tra dữ liệu trước.');

    const actors = await all(`SELECT DISTINCT u.id FROM users u
      JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      WHERE u.status='Active' AND (r.name='Admin' OR (r.name='Employee' AND EXISTS (
        SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id
        WHERE rp.role_id=r.id AND p.name='order.create')))
      ORDER BY u.id`);
    const actor = createdBy === undefined ? actors[0]?.id : actors.find(u => u.id === createdBy)?.id;
    if (!actor) throw new Error('Cần tài khoản Admin/Employee đang Active có quyền tạo đơn. Script không tạo hoặc sửa tài khoản.');

    const categoryIds = new Map<string, number>();
    for (const category of new Set(fashionProducts.map(p => p.category))) {
      const result = await run('INSERT INTO categories(name,description) VALUES(?,?)', category + label, 'Danh mục mô phỏng doanh nghiệp thời trang Việt Nam – LUMINA FASHION.');
      categoryIds.set(category, result.meta.last_row_id);
    }
    const supplierIds: number[] = [];
    for (const [i, [name, contact, city]] of fashionSuppliers.entries()) {
      const result = await run('INSERT INTO suppliers(name,contact_person,phone,email,address,status) VALUES(?,?,?,?,?,?)',
        name + label, contact, '028000000' + String(i).padStart(2, '0'), `lf-demo-supplier-${i + 1}@example.invalid`, 'Địa chỉ mô phỏng, ' + city, i === 4 ? 'Inactive' : 'Active');
      supplierIds.push(result.meta.last_row_id);
    }
    const variants: Variant[][] = [];
    for (const product of fashionProducts) {
      const result = await run('INSERT INTO products(name,sku,description,category_id,price,cost,supplier_id,status) VALUES(?,?,?,?,?,?,?,?)',
        product.name, product.sku, product.description, categoryIds.get(product.category), product.price, product.cost, supplierIds[product.supplier], product.status);
      const rows: Variant[] = [];
      const combinations = product.sizes.flatMap(size => product.colors.map(color => ({ size, color,
        sku: `${product.sku}-${size.replaceAll(' ', '')}-${color.code}` })));
      const inserted = await insertRows('product_variants', ['product_id', 'sku', 'size', 'color'],
        combinations.map(v => [result.meta.last_row_id, v.sku, v.size, v.color.name]), ' RETURNING id,sku');
      const variantIds = new Map(inserted.map(v => [v.sku, v.id]));
      for (const { sku } of combinations) {
        const opening = product.index === 0 ? 0 : product.index === 1 ? 3 : product.index === 2 ? 10 : 60 + product.index % 7 * 10;
        rows.push({ id: variantIds.get(sku), sku, product: product.index, price: product.price, opening, balance: opening });
      }
      variants.push(rows);
    }
    const cities = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Huế'];
    const customers: number[] = [];
    for (const [i, name] of fashionCustomers.entries()) {
      const result = await run('INSERT INTO customers(name,email,phone,address) VALUES(?,?,?,?)', name,
        `lf-demo-customer-${String(i + 1).padStart(2, '0')}@example.invalid`, '090000' + String(i + 1).padStart(4, '0'), `Địa chỉ mô phỏng số ${i + 1}, ${cities[i % cities.length]}`);
      customers.push(result.meta.last_row_id);
    }

    // Historical records span the previous six months; imported once, never regenerated on rerun.
    const now = new Date();
    const stamp = (months: number, day: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, day, 3)).toISOString();
    const openingDate = stamp(7, 1);
    let movementCount = 0;
    const movements: any[][] = [];
    const orderItems: any[][] = [];
    const movement = async (variant: Variant, action: string, quantity: number, note: string, date: string) => {
      movements.push([variant.id, action, quantity, actor, note, date, date]);
      movementCount++;
    };
    for (const variant of variants.flat()) {
      if (variant.opening) await movement(variant, 'Stock In', variant.opening, `${demoKey}: Nhập đầu kỳ từ nhà cung cấp`, openingDate);
      if (variant.product >= 4) {
        await movement(variant, 'Stock In', 7, `${demoKey}: Nhập bổ sung`, stamp(7, 2));
        await movement(variant, 'Stock Out', -2, `${demoKey}: Xuất mẫu trưng bày`, stamp(7, 3));
        await movement(variant, 'Adjustment', -1, `${demoKey}: Kiểm kê giảm do lỗi may`, stamp(7, 4));
        variant.balance += 4;
      }
    }
    let itemCount = 0;
    for (let i = 0; i < 60; i++) {
      const code = `${demoPrefix}ORDER-${String(i + 1).padStart(3, '0')}`;
      const status = fashionOrderStates[i % fashionOrderStates.length];
      const payment = status === 'Completed' || (status !== 'Cancelled' && i % 2 === 0) ? 'Paid' : 'Unpaid';
      const date = stamp(6 - Math.floor(i / 10), 1 + i % 10);
      const items = [0, 1].map(j => {
        const rows = variants[4 + (i * 2 + j) % 90];
        return { variant: rows[(i + j) % rows.length], quantity: 1 + (i + j) % 3 };
      });
      const total = items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
      const order = await run('INSERT INTO orders(code,customer_id,total,payment_method,payment,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
        code, customers[i % customers.length], total, ['Bank Transfer', 'Cash', 'Card'][i % 3], payment, status, actor, date, date);
      for (const { variant, quantity } of items) {
        orderItems.push([order.meta.last_row_id, variant.id, quantity, variant.price, date, date]);
        await movement(variant, 'Stock Out', -quantity, code, date);
        variant.balance -= quantity;
        if (status === 'Cancelled') {
          await movement(variant, 'Stock In', quantity, 'Hoàn kho ' + code, date);
          variant.balance += quantity;
        }
        itemCount++;
      }
    }
    for (const variant of variants.flat()) {
      if (variant.balance < 0) throw new Error('Tồn kho demo âm: ' + variant.sku);
    }
    await insertRows('order_items', ['order_id', 'variant_id', 'quantity', 'price', 'created_at', 'updated_at'], orderItems);
    await insertRows('inventory_transactions', ['variant_id', 'action', 'quantity', 'employee_id', 'note', 'created_at', 'updated_at'], movements);
    await insertRows('inventory', ['variant_id', 'quantity', 'threshold'], variants.flat().map(v => [v.id, v.balance, 10]));
    for (const audience of ['All', 'Admin', 'Employee', 'Guest']) {
      await run('INSERT INTO notifications(title,message,audience) VALUES(?,?,?)', `[LF-DEMO] Thông báo ${audience}`, `Dữ liệu mô phỏng kiểm thử phạm vi hiển thị ${audience}.`, audience);
    }
    const summary = { products: fashionProducts.length, categories: categoryIds.size, variants: variants.flat().length, suppliers: supplierIds.length, customers: customers.length, orders: 60, orderItems: itemCount, inventoryTransactions: movementCount, notifications: 4, createdBy: actor };
    await run('INSERT INTO activity_logs(user_id,action,resource,ip) VALUES(?,?,?,?)', actor, 'SYSTEM_SEED', demoKey, 'local-script');
    await run('INSERT INTO settings(key,value) VALUES(?,?)', demoKey, JSON.stringify(summary));
    return { skipped: false, ...summary };
  }, true);
}
