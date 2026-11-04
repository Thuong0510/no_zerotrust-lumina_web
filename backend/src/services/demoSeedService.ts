
import * as demoSeedModel from '../models/demoSeedModel.js';
import { env } from '../config/runtime.js';
import { db, one, stmt, hashPassword } from '../middleware/security.js';

export const permissionNames = [
  'product.view', 'product.create', 'product.edit', 'product.delete',
  'category.view', 'category.manage',
  'inventory.view', 'inventory.edit',
  'order.view', 'order.create', 'order.edit',
  'customer.view', 'customer.manage',
  'supplier.view', 'supplier.manage',
  'employee.view', 'employee.manage',
  'user.manage', 'role.manage',
  'report.view',
  'notification.view', 'notification.manage',
  'activity.view'
];

export const defaults: Record<string, string[]> = {
  Admin: permissionNames,
  Employee: [
    'product.view', 'category.view',
    'inventory.view', 'inventory.edit',
    'order.view', 'order.create', 'order.edit',
    'customer.view', 'notification.view'
  ],
  Guest: ['product.view', 'notification.view']
};

let seeding: Promise<void> | null = null;

export async function ensureSeed() {
  if (await demoSeedModel.ensureSeedQuery1()) return;

  if (!seeding) {
    seeding = seed().finally(() => {
      seeding = null;
    });
  }

  await seeding;
}

async function seed() {
  if (!env.DEMO_PASSWORD) {
    throw new Error('DEMO_PASSWORD not configured');
  }

  const password = await hashPassword(env.DEMO_PASSWORD);
  const statements: any[] = [];

  for (let i = 0; i < 3; i++) {
    statements.push(
      demoSeedModel.seedQuery1(i + 1, ['Admin', 'Employee', 'Guest'][i])
    );
  }

  permissionNames.forEach((p, i) =>
    statements.push(demoSeedModel.seedQuery2(i + 1, p))
  );

  Object.entries(defaults).forEach(([r, ps]) =>
    ps.forEach(p =>
      statements.push(
        demoSeedModel.seedQuery3(
          ['Admin', 'Employee', 'Guest'].indexOf(r) + 1,
          permissionNames.indexOf(p) + 1
        )
      )
    )
  );

  // Dữ liệu nhân viên
  const names = [
    'Nguyễn Minh Anh',
    'Trần Hoàng Nam',
    'Lê Thảo Linh',
    'Phạm Đức Huy'
  ];

  names.forEach((name, i) =>
    statements.push(
      demoSeedModel.seedQuery4(
        i + 1,
        name,
        ['admin', 'employee01', 'employee02', 'employee03'][i] + '@lumina.vn',
        '090123456' + i,
        ['Management', 'Sales', 'Warehouse', 'Marketing'][i],
        [
          'Giám đốc vận hành',
          'Chuyên viên bán hàng',
          'Chuyên viên quản lý kho',
          'Chuyên viên marketing'
        ][i],
        '2025-08-01',
        'Active',
        'Quận 1, TP. Hồ Chí Minh'
      )
    )
  );

  // Dữ liệu tài khoản demo
  ['admin', 'employee01', 'employee02', 'employee03', 'guest01', 'guest02']
    .forEach((username, i) => {
      statements.push(
        demoSeedModel.seedQuery5(
          i + 1,
          i < 4
            ? names[i]
            : ['Đặng Thu Hà', 'Võ Thanh Tùng'][i - 4],
          username,
          username + '@lumina.vn',
          '090123456' + i,
          i < 4 ? i + 1 : null,
          password,
          'Active'
        )
      );

      statements.push(
        demoSeedModel.seedQuery6(i + 1, i === 0 ? 1 : i < 4 ? 2 : 3)
      );
    });

  // Danh mục sản phẩm
  ['Áo', 'Quần', 'Váy', 'Giày', 'Túi xách', 'Phụ kiện']
    .forEach((name, i) =>
      statements.push(
        demoSeedModel.seedQuery7(
          i + 1,
          name,
          'Bộ sưu tập ' + name.toLowerCase() + ' LUMINA'
        )
      )
    );

  // Nhà cung cấp
  [
    'An Phước Textile',
    'Sài Gòn Denim',
    'Maison Accessories',
    'Việt Shoes',
    'Linen Studio'
  ].forEach((name, i) =>
    statements.push(
      demoSeedModel.seedQuery8(
        i + 1,
        name,
        ['Nguyễn Hoài', 'Trần Phúc', 'Lê Minh', 'Võ An', 'Phạm Lan'][i],
        '0283820010' + i,
        'contact' + i + '@supplier.vn',
        'TP. Hồ Chí Minh',
        'Active'
      )
    )
  );

  // Danh sách sản phẩm
  const products: any[] = [
    ['Oversized T-Shirt', 1, 350000, 'Cotton mềm, phom rộng thoải mái.'],
    ['Classic Polo', 1, 490000, 'Polo cổ bẻ, vải pique thoáng mát.'],
    ['Linen Shirt', 1, 650000, 'Sơ mi linen tự nhiên, nhẹ và thoáng.'],
    ['Straight Jeans', 2, 790000, 'Denim xanh, phom ống đứng.'],
    ['Cargo Pants', 2, 690000, 'Quần cargo túi hộp tiện dụng.'],
    ['Midi Dress', 3, 990000, 'Váy midi thanh lịch, tôn dáng.'],
    ['Leather Jacket', 1, 1890000, 'Áo khoác da phong cách hiện đại.'],
    ['Running Sneakers', 4, 1290000, 'Giày nhẹ, đế đàn hồi linh hoạt.'],
    ['Leather Handbag', 5, 1590000, 'Túi da, thiết kế tối giản.'],
    ['Baseball Cap', 6, 250000, 'Nón cotton thêu logo LUMINA.'],
    ['Ribbed Tank Top', 1, 290000, 'Áo ba lỗ gân, dễ phối đồ.'],
    ['Wide Leg Trousers', 2, 850000, 'Quần ống rộng, chất liệu mềm.'],
    ['Pleated Skirt', 3, 750000, 'Chân váy xếp ly thanh lịch.'],
    ['Canvas Sneakers', 4, 690000, 'Giày canvas cho mỗi ngày.'],
    ['Mini Crossbody Bag', 5, 890000, 'Túi đeo chéo nhỏ gọn.'],
    ['Silk Scarf', 6, 390000, 'Khăn lụa họa tiết tinh tế.'],
    ['Knit Cardigan', 1, 890000, 'Cardigan dệt kim mềm mại.'],
    ['Denim Shorts', 2, 450000, 'Quần short denim năng động.'],
    ['Summer Dress', 3, 890000, 'Váy mùa hè nhẹ nhàng.'],
    ['Leather Belt', 6, 450000, 'Thắt lưng da, khóa kim loại.']
  ];

  products.forEach(([name, cat, price, description], i) => {
    statements.push(
      demoSeedModel.seedQuery9(
        i + 1,
        name,
        'LM-' + String(i + 1).padStart(4, '0'),
        description,
        cat,
        price,
        Math.round(price * .55),
        i % 5 + 1,
        'Active'
      )
    );

    ['M', 'L', 'XL'].forEach((size, j) => {
      let id = i * 3 + j + 1;

      statements.push(
        demoSeedModel.seedQuery10(
          id,
          i + 1,
          'LM-' + String(i + 1).padStart(4, '0') + '-' + size,
          size,
          ['Black', 'Beige', 'Navy'][j]
        )
      );

      statements.push(
        demoSeedModel.seedQuery11(
          id,
          i < 4 ? 3 + j : 25 + (i * 7 + j) % 60
        )
      );

      statements.push(
        demoSeedModel.seedQuery12(
          id,
          id,
          'Stock In',
          i < 4 ? 3 + j : 25 + (i * 7 + j) % 60,
          1,
          'Nhập tồn kho đầu kỳ'
        )
      );
    });
  });

  // Dữ liệu khách hàng
  [
    'Nguyễn Ngọc Mai',
    'Trần Gia Bảo',
    'Lê Minh Châu',
    'Phạm Hoàng Long',
    'Võ Thu Trang',
    'Đặng Hải Anh',
    'Bùi Khánh Linh',
    'Đỗ Nhật Minh',
    'Hồ Phương Thảo',
    'Dương Tuấn Kiệt'
  ].forEach((name, i) =>
    statements.push(
      demoSeedModel.seedQuery13(
        i + 1,
        name,
        'customer' + (i + 1) + '@example.com',
        '091234560' + i,
        ['Quận 1', 'Quận 3', 'Bình Thạnh', 'Thủ Đức'][i % 4]
          + ', TP. Hồ Chí Minh'
      )
    )
  );

  // Dữ liệu đơn hàng
  for (let i = 0; i < 15; i++) {
    const product = products[i % products.length];
    const quantity = i % 3 + 1;
    const date = new Date();

    date.setMonth(date.getMonth() - Math.floor(i / 3));
    date.setDate(Math.max(1, date.getDate() - i % 3));

    const stamp = date.toISOString().slice(0, 19).replace('T', ' ');

    statements.push(
      demoSeedModel.seedQuery14(
        i + 1,
        'LM-2026-' + String(1001 + i),
        i % 10 + 1,
        product[2] * quantity,
        ['Bank Transfer', 'Cash', 'Card'][i % 3],
        i < 3 ? 'Unpaid' : 'Paid',
        ['Pending', 'Processing', 'Shipped', 'Completed', 'Completed'][i % 5],
        2,
        stamp
      )
    );

    statements.push(
      demoSeedModel.seedQuery15(
        i + 1,
        i + 1,
        i * 3 + 1,
        quantity,
        product[2]
      )
    );
  }

  // Thông báo nội bộ
  [
    [
      'Bộ sưu tập Thu / Đông 2026',
      'Cập nhật lookbook mới và chuẩn bị trưng bày bộ sưu tập Thu / Đông.',
      'All'
    ],
    [
      'Kiểm kê kho cuối tháng',
      'Kho sẽ kiểm kê vào ngày 30. Vui lòng hoàn tất các phiếu xuất nhập trước 17:00.',
      'Employee'
    ],
    [
      'Chào mừng đến LUMINA',
      'Khám phá danh mục sản phẩm và các thông báo nội bộ tại workspace.',
      'Guest'
    ],
    [
      'Sản phẩm sắp hết hàng',
      'Oversized T-Shirt, Classic Polo và Linen Shirt cần bổ sung tồn kho.',
      'Admin'
    ]
  ].forEach(([title, message, audience], i) =>
    statements.push(
      demoSeedModel.seedQuery16(i + 1, title, message, audience)
    )
  );

  statements.push(demoSeedModel.seedQuery17());
  statements.push(demoSeedModel.seedQuery18());

  await db().batch(statements);
}
