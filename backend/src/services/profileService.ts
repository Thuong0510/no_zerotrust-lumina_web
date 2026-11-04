import {z} from 'zod';
import * as systemModel from '../models/systemModel.js';
import * as authModel from '../models/authModel.js';
import {AppError, audit, db, verifyPassword} from '../middleware/security.js';
import {assertMediaAccess} from './mediaService.js';
import {parse} from './validation.js';

export async function updateProfile(req:Request,user:any,input:unknown) {
  const d=parse(z.object({
    name:z.string().min(2).max(100),phone:z.string().max(20),
    email:z.string().trim().email().max(150).transform(value=>value.toLowerCase()),
    avatar:z.union([z.string().regex(/^\/api\/media\/[a-f0-9]{64}\.(png|jpg)$/),z.literal(''),z.null()]).optional(),
    current_password:z.string().max(128).optional()
  }).strict(),input);
  const emailChanged=d.email!==user.email.toLowerCase();
  if(emailChanged) {
    const stored=await authModel.authQuery15(user.id);
    if(!d.current_password || !stored || !await verifyPassword(d.current_password,stored.password_hash))
      throw new AppError(403,'Vui lòng nhập đúng mật khẩu hiện tại để đổi email.');
  }
  if(d.avatar)await assertMediaAccess(user,d.avatar);
  await systemModel.handleQuery1(d.name,d.phone,d.email,d.avatar || null,user.id);
  if(user.employee_id)await systemModel.handleQuery2(d.name,d.phone,d.email,d.avatar || null,user.employee_id);
  if(emailChanged) {
    // Recovery tokens belong to the former email; retain only the reauthenticated session.
    await db().batch([authModel.authQuery12(user.id),authModel.authQuery17(user.id,user.token_hash)]);
    await audit(req,user.id,'CHANGE_RECOVERY_EMAIL','Own account');
  }
  await audit(req,user.id,'UPDATE_PROFILE','Own profile');
  return {ok:true};
}
