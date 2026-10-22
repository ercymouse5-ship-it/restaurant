import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ChefHat, ClipboardList, LogOut, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { MenuItem, Restaurant } from './data/types';

type AdminOrder = {
  id: string;
  status: string;
  createdAt: string;
  customer: { name: string; phone: string; address: string };
  lines: { name: string; quantity: number }[];
  total: number;
};

const orderStatuses = [
  ['new', 'جديد'],
  ['confirmed', 'تم التأكيد'],
  ['preparing', 'قيد التحضير'],
  ['delivering', 'خرج للتوصيل'],
  ['completed', 'مكتمل'],
  ['cancelled', 'ملغي'],
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || 'حصلت مشكلة في الاتصال بالخادم.');
  }
  return response.json() as Promise<T>;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('orders');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [menuData, orderData] = await Promise.all([
      api<Restaurant>('/api/restaurant'),
      api<{ orders: AdminOrder[] }>('/api/admin/orders'),
    ]);
    setRestaurant(menuData);
    setOrders(orderData.orders);
  };

  useEffect(() => {
    let active = true;
    api<{ authenticated: boolean }>('/api/admin/session')
      .then(async ({ authenticated: hasSession }) => {
        if (!active) return;
        setAuthenticated(hasSession);
        if (hasSession) await refresh();
      })
      .catch((reason: Error) => {
        if (active) {
          setAuthenticated(false);
          setError(reason.message);
        }
      });
    return () => { active = false; };
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setAuthenticated(true);
      setPassword('');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
      setAuthenticated(false);
      setRestaurant(null);
      setOrders([]);
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تسجيل الخروج.');
    }
  };

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !editing) return;
    setError('');
    setNotice('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const previous = restaurant.menu.find((item) => item.id === editing.id);
    const updated: MenuItem = {
      ...previous,
      id: String(form.get('id')).trim(),
      name: String(form.get('name')).trim(),
      description: String(form.get('description')).trim(),
      price: Number(form.get('price')),
      category: String(form.get('category')),
      image: String(form.get('image')).trim() || '/hero-grill.jpg',
      badge: String(form.get('badge')).trim() || undefined,
      popular: form.get('popular') === 'on',
      spicy: form.get('spicy') === 'on',
    };
    const next = {
      ...restaurant,
      menu: previous
        ? restaurant.menu.map((item) => item.id === previous.id ? updated : item)
        : [...restaurant.menu, updated],
    };
    try {
      await api('/api/admin/restaurant', { method: 'PUT', body: JSON.stringify(next) });
      setRestaurant(next);
      setEditing(null);
      setNotice('اتحفظ الصنف بنجاح.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ الصنف.');
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item: MenuItem) => {
    if (!restaurant || !window.confirm(`حذف ${item.name} من المنيو؟`)) return;
    setError('');
    setBusy(true);
    const next = { ...restaurant, menu: restaurant.menu.filter((entry) => entry.id !== item.id) };
    try {
      await api('/api/admin/restaurant', { method: 'PUT', body: JSON.stringify(next) });
      setRestaurant(next);
      setNotice('اتحذف الصنف من المنيو.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حذف الصنف.');
    } finally {
      setBusy(false);
    }
  };

  const changeOrderStatus = async (id: string, status: string) => {
    setError('');
    try {
      await api('/api/admin/orders', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحديث حالة الطلب.');
    }
  };

  if (authenticated === null) {
    return <main className="admin-screen"><div className="admin-message">بنجهّز لوحة الإدارة...</div></main>;
  }
  if (!authenticated) {
    return <main className="admin-screen" dir="rtl">
      <form className="admin-login panel" onSubmit={login}>
        <span className="brand-mark"><ChefHat size={22} /></span>
        <span className="eyebrow">إدارة فرن الحارة</span>
        <h1>تسجيل دخول الأدمن</h1>
        <p>اكتب كلمة مرور الإدارة للمتابعة.</p>
        <label className="field-label">كلمة المرور<input className="input-dark" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="gold-button" type="submit" disabled={busy}>{busy ? 'جارٍ الدخول...' : 'دخول لوحة الإدارة'}</button>
        <a className="admin-back-link" href="/">الرجوع للمطعم <ArrowRight size={16} /></a>
      </form>
    </main>;
  }

  return <main className="admin-screen" dir="rtl">
    <div className="admin-layout">
      <header className="admin-header">
        <div><span className="eyebrow">لوحة التحكم</span><h1>{restaurant?.name || 'إدارة المطعم'}</h1></div>
        <div className="admin-header-actions">
          <a className="outline-button" href="/">عرض الموقع <ArrowRight size={16} /></a>
          <button className="outline-button" onClick={logout}><LogOut size={16} /> خروج</button>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="أقسام الإدارة">
        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}><ClipboardList size={17} /> الطلبات <span>{orders.length}</span></button>
        <button className={activeTab === 'menu' ? 'active' : ''} onClick={() => setActiveTab('menu')}><ChefHat size={17} /> المنيو <span>{restaurant?.menu.length || 0}</span></button>
        <button className="admin-refresh" onClick={() => refresh().catch((reason: Error) => setError(reason.message))}><RefreshCw size={16} /> تحديث</button>
      </nav>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-success" role="status">{notice}</p>}

      {activeTab === 'orders' ? <section className="admin-orders">
        {!orders.length ? <div className="admin-message panel">لسه مفيش طلبات محفوظة.</div> : orders.map((order) => <article className="admin-order-card panel" key={order.id}>
          <div className="admin-order-top"><div><b>طلب #{order.id.slice(0, 8)}</b><time>{new Date(order.createdAt).toLocaleString('ar-EG')}</time></div>
            <select className="input-dark admin-status" value={order.status} onChange={(event) => changeOrderStatus(order.id, event.target.value)} aria-label="حالة الطلب">
              {orderStatuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </div>
          <div className="admin-order-customer"><b>{order.customer.name}</b><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a><span>{order.customer.address}</span></div>
          <ul>{order.lines.map((line, index) => <li key={`${line.name}-${index}`}>{line.name} × {line.quantity}</li>)}</ul>
          <strong>{order.total.toLocaleString('ar-EG')} ج.م</strong>
        </article>)}
      </section> : <section className="admin-menu-section">
        <div className="admin-section-heading"><div><h2>أصناف المنيو</h2><p>تعديلاتك بتتحفظ مباشرة في Cloudflare D1.</p></div>
          <button className="gold-button" onClick={() => setEditing({ id: `item-${Date.now()}`, name: '', description: '', price: 0, category: restaurant?.categories[0]?.id || '', image: '/hero-grill.jpg' })}><Plus size={17} /> صنف جديد</button>
        </div>
        {editing && <form className="admin-item-form panel" onSubmit={saveItem}>
          <h3>{restaurant?.menu.some((item) => item.id === editing.id) ? 'تعديل الصنف' : 'إضافة صنف'}</h3>
          <div className="admin-form-grid">
            <label className="field-label">اسم الصنف<input className="input-dark" name="name" defaultValue={editing.name} required /></label>
            <label className="field-label">المعرّف<input className="input-dark" name="id" defaultValue={editing.id} pattern="[a-zA-Z0-9_-]+" title="استخدم حروف إنجليزية أو أرقام أو - أو _" required /></label>
            <label className="field-label">السعر بالجنيه<input className="input-dark" name="price" type="number" min="0" step="0.01" defaultValue={editing.price} required /></label>
            <label className="field-label">القسم<select className="input-dark" name="category" defaultValue={editing.category}>{restaurant?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="field-label admin-form-wide">الوصف<textarea className="input-dark" name="description" defaultValue={editing.description} rows={2} required /></label>
            <label className="field-label admin-form-wide">مسار الصورة<input className="input-dark" name="image" defaultValue={editing.image} /></label>
            <label className="field-label">شارة اختيارية<input className="input-dark" name="badge" defaultValue={editing.badge || ''} /></label>
            <div className="admin-checks"><label><input type="checkbox" name="popular" defaultChecked={editing.popular} /> الأكثر طلباً</label><label><input type="checkbox" name="spicy" defaultChecked={editing.spicy} /> حار</label></div>
          </div>
          <div className="admin-form-actions"><button className="gold-button" type="submit" disabled={busy}><Save size={16} /> حفظ الصنف</button><button type="button" className="outline-button" onClick={() => setEditing(null)}>إلغاء</button></div>
        </form>}
        <div className="admin-menu-list">{restaurant?.menu.map((item) => <article className="admin-menu-item panel" key={item.id}>
          <img src={item.image} alt="" /><div className="admin-menu-item-info"><b>{item.name}</b><span>{restaurant.categories.find((category) => category.id === item.category)?.name || item.category}</span></div>
          <strong>{item.price.toLocaleString('ar-EG')} ج.م</strong>
          <button className="outline-button" onClick={() => setEditing(item)}>تعديل</button>
          <button className="admin-delete" aria-label={`حذف ${item.name}`} onClick={() => deleteItem(item)} disabled={busy}><Trash2 size={17} /></button>
        </article>)}</div>
      </section>}
    </div>
  </main>;
}
