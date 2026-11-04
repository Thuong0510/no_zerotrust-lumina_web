import { apiPath } from './apiPath.js';

// Route permissions are checked before selecting business data. Services retain
// their ownership, audience, field-level and transaction checks.
export function requiredApiPermission(method: string, pathname: string): string | undefined {
  const parts = apiPath(pathname);
  if (!parts) return;
  const [resource, id, action] = parts;
  const read = method === 'GET';
  if (resource === 'products') return read ? 'product.view' : 'product.' + (method === 'DELETE' ? 'delete' : id ? 'edit' : 'create');
  if (resource === 'inventory') return read ? 'inventory.view' : 'inventory.edit';
  if (resource === 'orders') return read ? 'order.view' : method === 'POST' ? 'order.create' : 'order.edit';
  if (resource === 'notifications') return read || action === 'read' ? 'notification.view' : 'notification.manage';
  if (resource === 'users') return 'user.manage';
  if (resource === 'roles') return 'role.manage';
  if (resource === 'reports') return 'report.view';
  if (resource === 'activity') return 'activity.view';
  const entity = { categories: 'category', suppliers: 'supplier', customers: 'customer', employees: 'employee' }[resource];
  if (entity) return entity + (read ? '.view' : '.manage');
}
