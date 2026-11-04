import { AppError, hasPermission, audit } from '../middleware/security.js';
import * as media from '../models/mediaModel.js';

export async function recordUpload(req: Request, user: any, url: string) {
  await media.insertUpload(url,user.id);
  await audit(req, user.id, 'UPLOAD_IMAGE', url);
}

export async function assertMediaAccess(user: any, url: string) {
  if (user.role === 'Admin') return;
  if (await media.ownedUpload(url,user.id)) return;
  if (await media.ownAvatar(url,user.id)) return;
  if (hasPermission(user,'product.view') && await media.productImage(url,user.role)) return;
  if (hasPermission(user,'employee.view') && await media.employeeAvatar(url)) return;
  if (hasPermission(user,'user.manage') && await media.userAvatar(url)) return;
  throw new AppError(404, 'Không tìm thấy tệp.');
}
