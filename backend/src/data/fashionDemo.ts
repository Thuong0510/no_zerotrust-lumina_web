// Synthetic Vietnamese fashion catalogue. Prices are illustrative VND, not market quotes.
export const demoKey = 'lumina-fashion-demo-v1';
export const demoPrefix = 'LF-DEMO-';
const groups = [
  { category: 'Áo thun', material: 'cotton 100%', price: 199000, sizes: ['S', 'M', 'L'], names: ['Áo thun cổ tròn', 'Áo thun dáng rộng', 'Áo thun kẻ ngang', 'Áo polo cổ bẻ', 'Áo thun tay dài', 'Áo thun thêu sen', 'Áo thun cổ tim', 'Áo thun thể thao', 'Áo thun in Sài Gòn', 'Áo ba lỗ gân'] },
  { category: 'Áo sơ mi', material: 'cotton pha linen', price: 349000, sizes: ['S', 'M', 'L'], names: ['Sơ mi trắng công sở', 'Sơ mi linen cổ trụ', 'Sơ mi kẻ sọc', 'Sơ mi tay ngắn', 'Sơ mi lụa cổ nơ', 'Sơ mi denim', 'Sơ mi hoa nhí', 'Sơ mi cổ Đức', 'Sơ mi dáng dài', 'Sơ mi túi ngực'] },
  { category: 'Quần', material: 'kaki cotton co giãn', price: 399000, sizes: ['S', 'M', 'L'], names: ['Quần kaki ống đứng', 'Quần tây công sở', 'Quần jeans xanh', 'Quần jeans ống rộng', 'Quần short kaki', 'Quần cargo túi hộp', 'Quần jogger', 'Quần culottes', 'Quần linen lưng thun', 'Quần short denim'] },
  { category: 'Chân váy', material: 'vải tuytsi pha sợi tổng hợp', price: 329000, sizes: ['S', 'M', 'L'], names: ['Chân váy chữ A', 'Chân váy xếp ly', 'Chân váy bút chì', 'Chân váy denim', 'Chân váy midi', 'Chân váy hoa nhí', 'Chân váy quấn', 'Chân váy caro', 'Chân váy xẻ tà', 'Chân váy tầng'] },
  { category: 'Đầm', material: 'viscose mềm rủ', price: 599000, sizes: ['S', 'M', 'L'], names: ['Đầm công sở cổ vuông', 'Đầm suông dạo phố', 'Đầm maxi đi biển', 'Đầm hoa mùa hè', 'Đầm sơ mi', 'Đầm tiệc cổ tim', 'Đầm xếp ly', 'Đầm quấn eo', 'Đầm hai dây', 'Đầm midi tay phồng'] },
  { category: 'Áo dài', material: 'lụa pha viscose', price: 899000, sizes: ['S', 'M', 'L'], names: ['Áo dài sen hồng', 'Áo dài trắng học sinh', 'Áo dài cách tân', 'Áo dài gấm lễ hội', 'Áo dài lụa Hà Nội', 'Áo dài thêu mai', 'Áo dài cưới đỏ', 'Áo dài ngũ thân', 'Áo dài hoa đào', 'Áo dài cổ thuyền'] },
  { category: 'Áo khoác', material: 'vải kaki có lớp lót', price: 699000, sizes: ['S', 'M', 'L'], names: ['Áo khoác denim', 'Áo blazer công sở', 'Áo khoác chống nắng', 'Áo khoác bomber', 'Áo cardigan dệt kim', 'Áo khoác gió', 'Áo khoác kaki', 'Áo hoodie kéo khóa', 'Áo khoác dạ ngắn', 'Áo vest dáng dài'] },
  { category: 'Giày dép', material: 'da tổng hợp và đế cao su', price: 459000, sizes: ['37', '38', '39'], names: ['Giày sneaker trắng', 'Giày thể thao chạy bộ', 'Giày búp bê', 'Giày loafer', 'Giày cao gót 5 cm', 'Sandal quai mảnh', 'Sandal đế xuồng', 'Dép quai ngang', 'Giày canvas', 'Giày oxford'] },
  { category: 'Túi xách', material: 'da tổng hợp có lớp lót', price: 389000, sizes: ['One Size'], names: ['Túi tote vải', 'Túi đeo chéo mini', 'Túi công sở', 'Túi kẹp nách', 'Túi du lịch gấp gọn', 'Balo thời trang', 'Túi bucket', 'Túi cói đi biển', 'Ví cầm tay', 'Túi đeo vai'] },
  { category: 'Phụ kiện', material: 'vải dệt và phụ liệu thời trang', price: 99000, sizes: ['One Size'], names: ['Khăn lụa hoa sen', 'Thắt lưng bản nhỏ', 'Mũ lưỡi trai', 'Mũ bucket', 'Băng đô vải', 'Khăn choàng mỏng', 'Nơ cài tóc', 'Vớ cổ ngắn', 'Ví đựng thẻ', 'Dây đeo túi'] },
];

export const fashionProducts = groups.flatMap((group, g) => group.names.map((name, n) => {
  const index = g * 10 + n;
  const price = group.price + n * 20000;
  return {
    index, name, category: group.category, sku: `${demoPrefix}${String(index + 1).padStart(3, '0')}`,
    price, cost: Math.round(price * (0.48 + (n % 4) * 0.05) / 1000) * 1000,
    description: `${name} thuộc bộ sưu tập LUMINA Việt Nam. Thiết kế dành cho sinh hoạt, đi làm và phối đồ hằng ngày. Dữ liệu mô phỏng để kiểm thử, không phải thông tin hàng hóa thực tế.`,
    sizes: group.sizes, colors: [{ code: 'DEN', name: 'Đen' }, { code: 'KEM', name: 'Kem' }],
    status: index >= 98 ? 'Archived' : index >= 96 ? 'Draft' : 'Active',
    supplier: g % 5,
  };
}));

export const fashionSuppliers = [
  ['Xưởng may Sài Gòn', 'Nguyễn Hoài An', 'TP. Hồ Chí Minh'],
  ['Dệt may Nam Định', 'Trần Minh Phúc', 'Nam Định'],
  ['May mặc Hà Nội', 'Lê Thu Hà', 'Hà Nội'],
  ['Giày và phụ kiện Bình Dương', 'Phạm Đức Huy', 'Bình Dương'],
  ['Thời trang Hội An', 'Võ Thảo Linh', 'Đà Nẵng'],
];

export const fashionCustomers = [
  'Nguyễn Ngọc Mai', 'Trần Gia Bảo', 'Lê Minh Châu', 'Phạm Hoàng Long', 'Võ Thu Trang',
  'Đặng Hải Anh', 'Bùi Khánh Linh', 'Đỗ Nhật Minh', 'Hồ Phương Thảo', 'Dương Tuấn Kiệt',
  'Nguyễn Thanh Tâm', 'Trần Mỹ Duyên', 'Lê Quốc Huy', 'Phạm Bảo Ngọc', 'Võ Minh Khang',
  'Đặng Thu Uyên', 'Bùi Quang Vinh', 'Đỗ Hà My', 'Hồ Anh Tuấn', 'Dương Ngọc Ánh',
  'Nguyễn Hoàng Yến', 'Trần Đức Anh', 'Lê Phương Nhi', 'Phạm Minh Trí', 'Võ Hải Yến',
  'Đặng Bảo Châu', 'Bùi Thanh Sơn', 'Đỗ Tú Anh', 'Hồ Thị Lan', 'Dương Gia Hân',
];

export const fashionOrderStates = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Completed', 'Cancelled'] as const;
