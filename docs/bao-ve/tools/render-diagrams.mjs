// Run from repository root: node docs/bao-ve/tools/render-diagrams.mjs
// Code-native diagrams. PNG only; no duplicate SVG files are written.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const out='docs/bao-ve/diagrams';
await fs.mkdir(out,{recursive:true});
const colors={catalog:'#2563eb',sale:'#a16207',auth:'#7c3aed',system:'#07836b',plain:'#64748b'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,size=22,color='#182c49',weight=400)=>`<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`;
const rect=(x,y,w,h,fill='white')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="13" fill="${fill}" stroke="#cdd8e8" stroke-width="2"/>`;
async function png(name,title,sub,w,h,body){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f4f7fc"/>${text(60,60,title,36,'#182c49',700)}${text(60,102,sub,21,'#536781')}${body}${text(60,h-25,'LUMINA FASHION | Schema mã nguồn: migration 001–003 | 20/10/2026 | Không xác nhận trạng thái cloud',17,'#64748b')}</svg>`;
 await sharp(Buffer.from(svg)).png().toFile(`${out}/${name}.png`);
}
function flowBox(x,y,w,h,title,lines,col='#2563eb'){
 return rect(x,y,w,h)+`<rect x="${x}" y="${y+14}" width="5" height="${h-28}" fill="${col}"/>`+text(x+20,y+35,title,23,col,700)+lines.map((l,i)=>text(x+20,y+73+i*31,l,21)).join('');
}
function line(points,color='#64748b'){
 const p=points.at(-1),prev=points.at(-2),a=Math.atan2(p[1]-prev[1],p[0]-prev[0])*180/Math.PI;
 return `<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/><path d="M0,0 L-15,-8 L-15,8 Z" fill="${color}" transform="translate(${p[0]},${p[1]}) rotate(${a})"/>`;
}
await png('01-kien-truc','01 / KIẾN TRÚC HỆ THỐNG','MVC + Service • API khách kiểm ownership; API nội bộ kiểm permission • Cùng database',1800,1050,
 line([[480,250],[680,250]])+line([[1100,250],[1300,250]])+line([[1510,340],[1510,460]])+line([[1300,550],[1100,550]])+line([[680,550],[480,550]])+line([[890,640],[890,785]])+
 flowBox(60,160,420,180,'REACT SPA',['Public / Guest: storefront','Login Admin/Employee: workspace','Giỏ / checkout / đơn cá nhân'])+
 flowBox(680,160,420,180,'ADAPTER / DISPATCH',['Node local hoặc Vercel','Origin, session, CSRF','Body limit, request ID'])+
 flowBox(1300,160,420,180,'CONTROLLER',['HTTP resource / method','Gọi Service / trả JSON'])+
 flowBox(1300,460,420,180,'SERVICE',['Store: Active-only / ảnh công bố','Auth / business / shopping','RBAC + ownership + idempotency'])+
 flowBox(680,460,420,180,'MODEL / PG',['SQL parameters + transaction','Advisory lock + constraints','Revision + checkout key'])+
 flowBox(60,460,420,180,'POSTGRESQL / SUPABASE',['Orders + snapshot giao hàng','Customers gắn user','Thông báo riêng'],colors.system)+
 flowBox(680,785,620,145,'DỊCH VỤ NGOÀI',['Ảnh: Sharp + Supabase private Storage','Email reset: Nodemailer / SMTP nếu cấu hình'],colors.system));

await png('03-tao-don','03 / CHECKOUT COD VÀ ĐƠN NỘI BỘ','Báo giá chưa giữ hàng • Giá / phí / tồn được kiểm lại ở thời điểm tạo đơn',1800,1390,
 line([[480,240],[680,240]])+line([[1100,240],[1300,240]])+line([[1510,330],[1510,460]])+line([[1300,550],[1100,550]])+line([[680,550],[480,550]])+line([[890,640],[890,790]])+line([[890,970],[890,1110]])+
 flowBox(60,150,420,180,'CHỌN HÀNG',['Product Active / size / màu','Giỏ sessionStorage theo user','Nhập địa chỉ nhận hàng'])+
 flowBox(680,150,420,180,'POST checkout/quote',['Giá DB + kiểm số lượng','Phí 30.000đ; free từ 500.000đ','Trả quote_hash + tổng COD'])+
 flowBox(1300,150,420,180,'KHÁCH XÁC NHẬN',['Xem tổng và đồng ý chính sách','POST checkout + UUID key','Không nhận buyer/total từ client'])+
 flowBox(1300,460,420,180,'TRANSACTION + LOCK',['Key cũ, cùng nội dung: replay','Key cũ, khác nội dung: 409','Chưa có: kiểm giá / phí / tồn'])+
 flowBox(680,460,420,180,'GHI CÙNG TRANSACTION',['Customer.user_id + buyer_id','Snapshot địa chỉ / phí + items','Trừ kho + logs + notifications'])+
 flowBox(60,460,420,180,'NẾU LỖI',['Rollback, không tạo dở dang','Giá / tồn đổi: khách xem lại','Retry không trừ kho lần hai'],'#c2414b')+
 flowBox(680,790,620,180,'COMMIT → ĐƠN CỦA TÔI',['Trả mã đơn; frontend mới xóa giỏ','GET my-orders chỉ trả đơn của user','Pending / Unpaid: khách tự hủy, hoàn kho'],colors.system)+
 flowBox(680,1110,850,155,'NHÂN VIÊN XỬ LÝ TRÊN ORDERS',['Pending → Confirmed → Processing → Shipped → Completed','Giữ snapshot phí; hoàn tất phải Paid; thông báo riêng cho người mua'],colors.auth));

await png('04-trang-thai-don','04 / TRẠNG THÁI ĐƠN HÀNG','Khách chỉ tự hủy Pending / Unpaid • Nhân viên quản lý trạng thái bằng quyền Orders',1800,950,
 line([[370,260],[480,260]])+line([[790,260],[900,260]])+line([[1210,260],[1320,260]])+
 line([[215,340],[215,640],[480,640]],'#c2414b')+line([[635,340],[635,550]],'#c2414b')+line([[1055,340],[1055,550]],'#c2414b')+line([[1475,340],[1475,550]],colors.system)+
 flowBox(60,170,310,170,'PENDING',['COD: Unpaid / trừ kho','Được sửa items'])+flowBox(480,170,310,170,'CONFIRMED',['Nhân viên xác nhận','Được sửa items'])+flowBox(900,170,310,170,'PROCESSING',['Đang chuẩn bị hàng','Không sửa items'])+flowBox(1320,170,310,170,'SHIPPED',['Đang giao hàng','Không được hủy'])+
 flowBox(480,550,730,190,'CANCELLED / HOÀN KHO',['Pending/Unpaid: chủ đơn hoặc nhân viên','Confirmed/Processing: nhân viên theo quy trình','Transaction + revision; hủy lặp không hoàn kho lần hai'],'#c2414b')+flowBox(1320,550,390,190,'COMPLETED',['Nhân viên xác nhận','payment phải Paid','Không sửa tiếp'],colors.system)+text(60,830,'Giá vận chuyển và địa chỉ được lưu trên đơn; cập nhật hồ sơ không thay lịch sử nhận hàng.',24));

await png('06-phan-quyen-va-shopping','06 / STOREFRONT, ĐĂNG NHẬP VÀ PHÂN QUYỀN','Giữ role Guest • Khách vãng lai là user null • Không đổi schema / không mở bucket public',1800,1280,
 line([[480,245],[680,245]])+line([[1100,245],[1300,245]])+line([[1510,330],[1510,490]])+line([[1510,330],[1510,410],[890,410],[890,490]])+line([[1510,660],[1510,820]])+
 flowBox(60,160,420,170,'MỞ LINK / CHƯA LOGIN',['Trang chủ mua sắm công khai','Xem catalog / chi tiết / chính sách','Không thấy chức năng quản lý'])+flowBox(680,160,420,170,'GET /store/*',['Chỉ Product Active + safe fields','Ảnh chỉ khi Active tham chiếu','Thêm giỏ / mua cần đăng nhập'])+flowBox(1300,160,420,170,'ĐĂNG NHẬP',['Session cookie + CSRF','Role lấy từ database','Không tự chọn quyền qua URL'])+
 flowBox(1300,490,420,170,'ROLE GUEST',['Giữ shell mua sắm riêng','Tiếp tục chọn sản phẩm','Giỏ / COD / đơn / hồ sơ cá nhân'])+flowBox(680,490,420,170,'ADMIN / EMPLOYEE',['Chuyển về workspace','Menu và API theo permission','Không dùng shell Guest'])+flowBox(60,490,420,170,'PHẦN NỘI BỘ ĐƯỢC BẢO VỆ',['Chưa login gọi API private: 401','Guest không quyền quản lý: 403','UI ẩn không thay thế RBAC'],'#c2414b')+
 flowBox(1300,820,420,170,'ĐẶT COD / ĐƠN CỦA TÔI',['Quote kiểm giá / tồn / phí','Place có CSRF + idempotency','Own-order lọc buyer từ session'])+
 flowBox(60,1080,1660,125,'LOGOUT VỀ TRANG CHỦ',['Chưa login mở giỏ / đơn / hồ sơ: yêu cầu đăng nhập; không hiển thị dữ liệu tài khoản trước.'],colors.system));

const nodes=[],edges=[];
const n=(id,x,y,group,fields,h=210)=>nodes.push({id,x,y,w:440,h,group,fields});
n('categories',80,200,'catalog',['PK id','name, description'],170);
n('suppliers',80,520,'catalog',['PK id','name, contact_person','phone, email, address, status'],195);
n('products',670,200,'catalog',['PK id; UK sku','FK category_id → categories','FK supplier_id → suppliers','name, price, cost, image, status'],230);
n('product_variants',1260,200,'catalog',['PK id; UK sku','FK product_id → products','UK (product_id,size,color)','size, color'],230);
n('inventory',1850,200,'catalog',['PK id; FK,UK variant_id','quantity ≥ 0; threshold'],170);
n('inventory_transactions',1850,520,'catalog',['PK id; FK variant_id','FK? employee_id → users.id','action, quantity, note'],195);
n('customers',80,850,'sale',['PK id; FK?,UK user_id → users','name, email, phone, address','Địa chỉ lần checkout thành công'],200);
n('orders',670,850,'sale',['PK id; UK code','FK customer_id; FK created_by','FK? buyer_id → users','shipping_name/email/phone/address','shipping_notes, shipping_fee','checkout_key/fingerprint, revision','status, payment, total'],325);
n('order_items',1260,850,'sale',['PK id; FK order_id','FK variant_id','quantity > 0; price snapshot'],195);
n('password_reset_tokens',2440,850,'auth',['PK token_hash; FK user_id','expires_at, used'],170);
n('employees',670,1320,'auth',['PK id; UK email','name, department, position','join_date, status, avatar'],195);
n('users',1260,1320,'auth',['PK id; UK username/email','FK? employee_id → employees','password_hash, status','failed_attempts, locked_until','name, phone, avatar'],260);
n('sessions',1850,1320,'auth',['PK token_hash; FK user_id','csrf, expires_at'],170);
n('activity_logs',2440,1320,'system',['PK id; FK? user_id','action, resource, ip, created_at'],170);
n('uploaded_media',2440,1720,'system',['PK url; FK user_id → users','created_at; URL PNG/JPEG nội bộ','File nằm ở Storage / filesystem'],195);
n('notifications',80,1720,'system',['PK id; FK? target_user_id','title, message, audience','Target user ưu tiên hơn audience'],200);
n('notification_reads',670,1720,'system',['PK,FK user_id','PK,FK notification_id','PK ghép (user_id,notification_id)'],195);
n('user_roles',1260,1720,'auth',['PK,FK user_id; PK,FK role_id','PK ghép (user_id,role_id)'],170);
n('roles',1260,2070,'auth',['PK id; UK name','Admin / Employee / Guest'],170);
n('role_permissions',1850,2070,'auth',['PK,FK role_id; PK,FK permission_id','PK ghép (role_id,permission_id)'],170);
n('permissions',2440,2070,'auth',['PK id; UK name','Ví dụ: product.view / order.edit'],170);
n('rate_limits',80,2260,'plain',['PK key; count, rate_window'],140);
n('settings',670,2260,'plain',['PK key; value'],140);
n('schema_migrations',80,2470,'plain',['PK name; checksum, applied_at'],140);
const e=(p,c,points,label,lx,ly,unique=false,optional=false)=>edges.push({p,c,points,label,lx,ly,unique,optional});
e('categories','products',[[520,285],[670,285]],'category_id',530,263);
e('suppliers','products',[[520,610],[595,610],[595,385],[670,385]],'supplier_id',530,650);
e('products','product_variants',[[1110,300],[1260,300]],'product_id',1120,278);
e('product_variants','inventory',[[1700,290],[1850,290]],'variant_id',1715,268,true);
e('product_variants','inventory_transactions',[[1650,430],[1650,625],[1850,625]],'variant_id',1680,605);
e('product_variants','order_items',[[1460,430],[1460,850]],'variant_id',1480,790);
e('customers','orders',[[520,940],[670,940]],'customer_id',527,918);
e('orders','order_items',[[1110,965],[1260,965]],'order_id',1135,943);
e('users','orders',[[1330,1320],[1330,1230],[950,1230],[950,1175]],'created_by',1050,1210);
e('users','orders',[[1420,1320],[1420,1280],[800,1280],[800,1175]],'buyer_id?',880,1260,false,true);
e('users','customers',[[1360,1580],[1360,1605],[625,1605],[625,1100],[300,1100],[300,1050]],'user_id? UNIQUE',80,1130,true,true);
e('employees','users',[[1110,1420],[1260,1420]],'employee_id?',1115,1395,false,true);
e('users','sessions',[[1700,1400],[1850,1400]],'user_id',1730,1378);
e('users','password_reset_tokens',[[1660,1320],[1660,1270],[2370,1270],[2370,945],[2440,945]],'user_id',2380,1100);
e('users','activity_logs',[[1660,1580],[1660,1620],[2370,1620],[2370,1410],[2440,1410]],'user_id?',2325,1655,false,true);
e('users','inventory_transactions',[[1610,1320],[1610,1200],[2320,1200],[2320,680],[2290,680]],'employee_id? → users',1850,1180,false,true);
e('users','user_roles',[[1475,1580],[1475,1720]],'user_id',1495,1670);
e('roles','user_roles',[[1475,2070],[1475,1890]],'role_id',1495,2000);
e('roles','role_permissions',[[1700,2150],[1850,2150]],'role_id',1730,2128);
e('permissions','role_permissions',[[2440,2150],[2290,2150]],'permission_id',2295,2128);
e('users','notification_reads',[[1320,1580],[1320,1640],[900,1640],[900,1720]],'user_id',1040,1620);
e('notifications','notification_reads',[[520,1815],[670,1815]],'notification_id',521,1793);
e('users','notifications',[[1260,1530],[560,1530],[560,1610],[300,1610],[300,1720]],'target_user_id?',80,1580,false,true);
e('users','uploaded_media',[[1700,1530],[2340,1530],[2340,1815],[2440,1815]],'user_id',2345,1793);

async function erd(name,title,ids,height=2800){
 const selected=nodes.filter(n=>!ids||ids.includes(n.id));
 const relations=edges.filter(e=>selected.some(n=>n.id===e.p)&&selected.some(n=>n.id===e.c));
 let b='';
 for(const e of relations){
  const col=colors[nodes.find(n=>n.id===e.c).group],a=e.points[0],next=e.points[1],z=e.points.at(-1),prev=e.points.at(-2);
  b+=`<polyline points="${e.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round"/>`;
  const start=Math.atan2(next[1]-a[1],next[0]-a[0])*180/Math.PI,end=Math.atan2(z[1]-prev[1],z[0]-prev[0])*180/Math.PI;
  b+=`<g transform="translate(${a[0]},${a[1]}) rotate(${start})" fill="none" stroke="${col}" stroke-width="3"><path d="M14,-11 V11"/>${e.optional?'<circle cx="30" cy="0" r="7" fill="#f4f7fc"/>':'<path d="M28,-11 V11"/>'}</g>`;
  b+=`<g transform="translate(${z[0]},${z[1]}) rotate(${end})" fill="none" stroke="${col}" stroke-width="3"><circle cx="-38" cy="0" r="7" fill="#f4f7fc"/>${e.unique?'<path d="M-14,-11 V11"/>':'<path d="M0,-13 L-23,0 L0,13 M-23,0 L0,0"/>'}</g>`;
 }
 for(const n of selected){const col=colors[n.group];b+=rect(n.x,n.y,n.w,n.h)+`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="56" rx="10" fill="${col}"/>`+text(n.x+18,n.y+37,n.id,25,'white',700)+n.fields.map((s,i)=>text(n.x+18,n.y+89+i*32,s,21)).join('');}
 for(const e of relations)b+=text(e.lx,e.ly,e.label,18,colors[nodes.find(n=>n.id===e.c).group],600);
 b+=rect(2440,200,440,480)+['CHÚ GIẢI','PK: khóa chính; FK: khóa ngoại','UK: unique; FK?: cho phép NULL','|| — o< : một đến 0..nhiều','o| — o< : cha có thể không có','|| — o| : một đến 0..một','Đường nối: cha → con','Tên cạnh là FK tại bảng con.','N:N dùng bảng nối.','Checkout key unique theo buyer.','Đơn nội bộ cũ: buyer_id null.'].map((s,i)=>text(2460,242+i*39,s,i?22:27,'#334a69',i?400:700)).join('');
 if(height>2000)b+=['LƯU Ý MÔ HÌNH','customers.user_id unique: tối đa một hồ sơ mua hàng / tài khoản.','orders: buyer_id là chủ đơn; created_by là người tạo, có thể khác.','notifications.target_user_id: chỉ người nhận xem thông báo riêng.','Snapshot shipping_* không đổi khi sửa hồ sơ khách hàng.','inventory_transactions.employee_id thực tế tham chiếu users.id.','uploaded_media lưu owner; products.image / avatar không có FK đến URL.','Giỏ sessionStorage, chưa có bảng cart hoặc workflow đổi trả.'].map((s,i)=>text(1260,2370+i*38,s,i?22:27,'#536781',i?400:700)).join('');
 await png(name,title,`${selected.length} bảng hiển thị • ${relations.length} FK • Thuộc tính chính; cột thời gian/phụ được rút gọn`,3000,height,b);
}
await erd('08-erd-tong-the','08 / ERD TỔNG THỂ — CHECKOUT COD VÀ MEDIA',null);
await erd('05-erd','05 / ERD SẢN PHẨM, KHO, ĐƠN VÀ CHỦ SỞ HỮU',['categories','suppliers','products','product_variants','inventory','inventory_transactions','customers','orders','order_items','users'],1740);
await erd('07-erd-tai-khoan','07 / ERD TÀI KHOẢN, PHÂN QUYỀN VÀ MEDIA',['employees','users','sessions','password_reset_tokens','activity_logs','uploaded_media','notifications','notification_reads','roles','permissions','user_roles','role_permissions','customers','orders','rate_limits','settings','schema_migrations']);
if(nodes.length!==24||edges.length!==24)throw new Error('ERD entity/FK count mismatch');
console.log('Generated 7 updated PNG diagrams; login sequence 02 remains applicable.');
