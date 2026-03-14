const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = './database';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const QRCODES_FILE = path.join(DATA_DIR, 'qrcodes.json');
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadData(file, defaultData = []) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { console.error('加载失败:', e); }
  return defaultData;
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

[USERS_FILE, PRODUCTS_FILE, ORDERS_FILE, QRCODES_FILE, COUPONS_FILE].forEach(f => {
  if (!fs.existsSync(f)) saveData(f, f === COUPONS_FILE ? [] : []);
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ============ 用户系统 ============
app.post('/api/register', (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password) return res.status(400).json({ error: '请填写手机号和密码' });
  
  const users = loadData(USERS_FILE);
  if (users.find(u => u.phone === phone)) return res.status(400).json({ error: '该手机号已注册' });
  
  const newUser = { id: uuidv4(), phone, password, name: name || '', created_at: Date.now() };
  users.push(newUser);
  saveData(USERS_FILE, users);
  res.json({ success: true, user: { id: newUser.id, phone: newUser.phone, name: newUser.name } });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: '请填写手机号和密码' });
  
  const users = loadData(USERS_FILE);
  const user = users.find(u => u.phone === phone && u.password === password);
  if (!user) return res.status(401).json({ error: '手机号或密码错误' });
  res.json({ success: true, user: { id: user.id, phone: user.phone, name: user.name } });
});

// ============ 商品系统 ============
app.get('/api/products', (req, res) => {
  const products = loadData(PRODUCTS_FILE).filter(p => p.isActive !== false);
  res.json(products);
});

app.post('/api/admin/products', upload.single('image'), (req, res) => {
  let images = [];
  let isBase64 = false;
  
  if (req.file) {
    const base64 = req.file.buffer.toString('base64');
    images.push('data:' + req.file.mimetype + ';base64,' + base64);
    isBase64 = true;
  } else if (req.body.images) {
    try {
      images = JSON.parse(req.body.images);
    } catch(e) { images = []; }
  }
  
  const { name, price, description, stock } = req.body;
  if (!name || !price) return res.status(400).json({ error: '请填写商品名称和价格' });
  
  const products = loadData(PRODUCTS_FILE);
  const newProduct = {
    id: uuidv4(),
    name: String(name),
    price: parseFloat(price),
    description: String(description || ''),
    stock: parseInt(stock) || 999,
    images: images,
    isBase64: isBase64,
    isActive: true,
    created_at: Date.now()
  };
  
  products.push(newProduct);
  saveData(PRODUCTS_FILE, products);
  res.json({ success: true, product: newProduct });
});

app.delete('/api/admin/products/:id', (req, res) => {
  let products = loadData(PRODUCTS_FILE).map(p => {
    if (p.id === req.params.id) p.isActive = false;
    return p;
  });
  saveData(PRODUCTS_FILE, products);
  res.json({ success: true });
});

// ============ 优惠卷系统 ============
app.get('/api/coupons', (req, res) => {
  const coupons = loadData(COUPONS_FILE).filter(c => c.isActive !== false && c.stock > 0);
  res.json(coupons);
});

app.post('/api/coupons/claim', (req, res) => {
  const { couponId, userId } = req.body;
  if (!couponId || !userId) return res.status(400).json({ error: '参数错误' });
  
  let coupons = loadData(COUPONS_FILE);
  const couponIndex = coupons.findIndex(c => c.id === couponId);
  
  if (couponIndex === -1) return res.status(404).json({ error: '优惠卷不存在' });
  if (coupons[couponIndex].stock <= 0) return res.status(400).json({ error: '优惠卷已领完' });
  
  coupons[couponIndex].stock--;
  saveData(COUPONS_FILE, coupons);
  
  res.json({ success: true, coupon: coupons[couponIndex] });
});

app.post('/api/admin/coupons', (req, res) => {
  const { name, discount, minAmount, stock, expireDays } = req.body;
  if (!name || !discount || !stock) return res.status(400).json({ error: '请填写完整信息' });
  
  const coupons = loadData(COUPONS_FILE);
  const newCoupon = {
    id: uuidv4(),
    name: String(name),
    discount: parseFloat(discount),
    minAmount: parseFloat(minAmount) || 0,
    stock: parseInt(stock),
    expireDays: parseInt(expireDays) || 7,
    isActive: true,
    created_at: Date.now()
  };
  
  coupons.push(newCoupon);
  saveData(COUPONS_FILE, coupons);
  res.json({ success: true, coupon: newCoupon });
});

app.delete('/api/admin/coupons/:id', (req, res) => {
  let coupons = loadData(COUPONS_FILE).map(c => {
    if (c.id === req.params.id) c.isActive = false;
    return c;
  });
  saveData(COUPONS_FILE, coupons);
  res.json({ success: true });
});

// ============ 收款码 ============
app.get('/api/current-qrcode', (req, res) => {
  const qrcodes = loadData(QRCODES_FILE).filter(q => q.isActive !== false);
  const now = Date.now();
  const validQr = qrcodes.find(q => now - q.uploadTime < 5 * 60 * 1000);
  
  if (validQr) {
    res.json({ success: true, qrcode: validQr, expiresIn: 5 * 60 * 1000 - (now - validQr.uploadTime) });
  } else {
    res.json({ success: false, error: '暂无有效收款码，请联系商家' });
  }
});

app.post('/api/admin/qrcode', upload.single('qrcode'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传收款码图片' });
  
  const base64 = req.file.buffer.toString('base64');
  const qrcodeData = 'data:' + req.file.mimetype + ';base64,' + base64;
  
  let qrcodes = loadData(QRCODES_FILE).map(q => ({ ...q, isActive: false }));
  const newQr = { id: uuidv4(), filename: qrcodeData, uploadTime: Date.now(), isActive: true, isBase64: true };
  qrcodes.push(newQr);
  saveData(QRCODES_FILE, qrcodes);
  res.json({ success: true, qrcode: newQr, expiresIn: 5 * 60 * 1000 });
});

// ============ 订单系统 ============
app.post('/api/orders', (req, res) => {
  const { userId, products, customer_name, customer_phone, customer_address, couponId } = req.body;
  if (!userId || !products || products.length === 0 || !customer_name || !customer_phone || !customer_address) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  
  const qrcodes = loadData(QRCODES_FILE).filter(q => q.isActive !== false);
  const now = Date.now();
  const validQr = qrcodes.find(q => now - q.uploadTime < 5 * 60 * 1000);
  if (!validQr) return res.status(500).json({ error: '暂无可用收款码，请稍后再试' });
  
  let totalAmount = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  let discount = 0;
  
  // 应用优惠卷
  if (couponId) {
    const coupons = loadData(COUPONS_FILE);
    const coupon = coupons.find(c => c.id === couponId);
    if (coupon && totalAmount >= coupon.minAmount) {
      discount = coupon.discount;
      totalAmount = Math.max(0, totalAmount - discount);
    }
  }
  
  const orderId = 'W' + Date.now().toString().slice(-10);
  const orders = loadData(ORDERS_FILE);
  const newOrder = {
    id: orderId,
    userId,
    products,
    customer_name,
    customer_phone,
    customer_address,
    couponId,
    discount,
    total_amount: totalAmount,
    status: 'pending', // pending, paid, shipped, delivered
    payment_screenshot: '',
    shipping_company: '',
    tracking_number: '',
    shipped_at: null,
    created_at: now,
    paid_at: null
  };
  
  orders.push(newOrder);
  saveData(ORDERS_FILE, orders);
  res.json({ success: true, order: newOrder, qrcode: validQr });
});

app.post('/api/orders/:id/pay', upload.single('screenshot'), (req, res) => {
  let orders = loadData(ORDERS_FILE);
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  
  if (req.file) {
    const base64 = req.file.buffer.toString('base64');
    orders[orderIndex].payment_screenshot = 'data:' + req.file.mimetype + ';base64,' + base64;
  }
  orders[orderIndex].status = 'paid';
  orders[orderIndex].paid_at = Date.now();
  saveData(ORDERS_FILE, orders);
  res.json({ success: true });
});

app.get('/api/orders/:id', (req, res) => {
  const orders = loadData(ORDERS_FILE);
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(order);
});

app.get('/api/user/orders', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: '请先登录' });
  const orders = loadData(ORDERS_FILE).filter(o => o.userId === userId).sort((a, b) => b.created_at - a.created_at);
  res.json(orders);
});

app.get('/api/admin/orders', (req, res) => {
  const orders = loadData(ORDERS_FILE).sort((a, b) => b.created_at - a.created_at);
  res.json(orders);
});

app.post('/api/admin/orders/:id/ship', (req, res) => {
  const { shipping_company, tracking_number } = req.body;
  if (!shipping_company || !tracking_number) return res.status(400).json({ error: '请填写快递公司和单号' });
  
  let orders = loadData(ORDERS_FILE);
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  
  orders[orderIndex].status = 'shipped';
  orders[orderIndex].shipping_company = shipping_company;
  orders[orderIndex].tracking_number = tracking_number;
  orders[orderIndex].shipped_at = Date.now();
  saveData(ORDERS_FILE, orders);
  res.json({ success: true });
});

app.post('/api/admin/orders/:id/delivered', (req, res) => {
  let orders = loadData(ORDERS_FILE);
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  orders[orderIndex].status = 'delivered';
  saveData(ORDERS_FILE, orders);
  res.json({ success: true });
});

app.post('/api/admin/orders/:id/confirm', (req, res) => {
  let orders = loadData(ORDERS_FILE);
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  orders[orderIndex].status = 'paid';
  saveData(ORDERS_FILE, orders);
  res.json({ success: true });
});

app.get('/api/admin/orders/export', (req, res) => {
  const orders = loadData(ORDERS_FILE).sort((a, b) => b.created_at - a.created_at);
  let csv = '订单号，商品，姓名，手机，地址，金额，优惠，状态，时间\n';
  orders.forEach(o => {
    const productsStr = o.products.map(p => `${p.name}x${p.quantity}`).join(';');
    csv += `${o.id},"${productsStr}",${o.customer_name},${o.customer_phone},${o.customer_address},${o.total_amount},${o.discount || 0},${o.status},${new Date(o.created_at).toLocaleString('zh-CN')}\n`;
  });
  res.setHeader('Content-Type', 'text/csv;charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=w-orders.csv');
  res.send('\ufeff' + csv);
});

app.listen(PORT, () => {
  console.log(`🔥 W的店铺 运行中 http://localhost:${PORT}`);
  console.log(`   首页：http://localhost:${PORT}/`);
  console.log(`   登录：http://localhost:${PORT}/login.html`);
  console.log(`   用户中心：http://localhost:${PORT}/user.html`);
  console.log(`   后台管理：http://localhost:${PORT}/admin/`);
});
