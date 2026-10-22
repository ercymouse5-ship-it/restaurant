import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import {
  ArrowDown, ArrowLeft, ArrowUpRight, BadgeCheck, Check, ChefHat, Clock3, Flame, MapPin,
  Instagram, Facebook, Minus, Navigation, Phone, Plus, Search, ShoppingBag, Truck, Utensils, X,
} from 'lucide-react';
import { restaurants, getRestaurant } from './data/restaurants';
import type { MenuItem, Restaurant } from './data/types';
import { useCart, type CartLine } from './store/cart';

type Customer = { name: string; phone: string; address: string; zone: string; payment: string };
const CUSTOMER_KEY = 'mat3am-customer-v1';
const LAST_ORDER_KEY = 'mat3am-last-order-v1';
const money = (value: number) => `${value.toLocaleString('ar-EG')} ج.م`;
const lastOrderKey = (slug: string) => `${LAST_ORDER_KEY}-${slug}`;
const cairoDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const arabicDigits = (value: string) => value.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
const readCustomer = (): Customer => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null') || { name: '', phone: '', address: '', zone: '', payment: 'كاش عند الاستلام' };
  } catch {
    return { name: '', phone: '', address: '', zone: '', payment: 'كاش عند الاستلام' };
  }
};

function OpenBadge({ restaurant }: { restaurant: Restaurant }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return <span className="status-pill status-pending"><span />بنتأكد من مواعيدنا</span>;
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Africa/Cairo',
  }).formatToParts(now);
  const dayName = parts.find((part) => part.type === 'weekday')?.value || 'Sunday';
  const todayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayName);
  const current = Number(parts.find((part) => part.type === 'hour')?.value || 0) * 60
    + Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const hoursByDay = new Map(restaurant.workingHours.map((entry) => [entry.day, entry]));
  const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const today = hoursByDay.get(cairoDays[todayIndex]);
  const yesterday = hoursByDay.get(cairoDays[(todayIndex + 6) % 7]);
  const todayOpen = today ? toMinutes(today.open) : 0;
  let todayClose = today ? toMinutes(today.close) : 0;
  if (today && todayClose <= todayOpen) todayClose += 1440;
  let yesterdayOpen = yesterday ? toMinutes(yesterday.open) : 0;
  let yesterdayClose = yesterday ? toMinutes(yesterday.close) : 0;
  if (yesterday && yesterdayClose <= yesterdayOpen) yesterdayClose += 1440;
  const isOpen = (!!today && current >= todayOpen && current < Math.min(todayClose, 1440))
    || (!!yesterday && yesterdayClose > 1440 && current < yesterdayClose - 1440);
  let nextLabel = '';
  if (!isOpen) {
    for (let offset = 0; offset < 7; offset += 1) {
      const index = (todayIndex + offset) % 7;
      const nextHours = hoursByDay.get(cairoDays[index]);
      if (!nextHours || (offset === 0 && current >= toMinutes(nextHours.open))) continue;
      const openingTime = arabicDigits(nextHours.open);
      nextLabel = offset === 0
        ? `النهارده الساعة ${openingTime}`
        : offset === 1
          ? `بكرة الساعة ${openingTime}`
          : `${cairoDays[index]} الساعة ${openingTime}`;
      break;
    }
  }
  const statusDescription = isOpen
    ? `مفتوح الآن، التوصيل خلال ${restaurant.estimatedDeliveryMinutes} دقيقة`
    : `مقفول الآن، بنفتح ${nextLabel}`;
  const compactStatus = isOpen
    ? `مفتوح · ${restaurant.estimatedDeliveryMinutes.toLocaleString('ar-EG')} دقيقة`
    : `مقفول · ${nextLabel.replace(/^النهارده الساعة |^بكرة الساعة /, '')}`;
  return <span className={`status-pill ${isOpen ? 'is-open' : 'is-closed'}`} data-testid="status-restaurant-open" aria-label={statusDescription} title={statusDescription}>
    <span />{compactStatus}
  </span>;
}

function OfferBanner({ restaurant, now }: { restaurant: Restaurant; now: Date }) {
  const end = new Date(restaurant.offerBanner.endsAt);
  if (!Number.isFinite(end.getTime()) || end.getTime() <= now.getTime()) return null;
  const endLabel = new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Cairo',
  }).format(end);
  return <div className="offer-strip"><span><Flame size={15} /> {restaurant.offerBanner.text}</span><span className="offer-time"><Clock3 size={14} /> لحد {endLabel}</span></div>;
}

function RestaurantDirectory() {
  const [, setLocation] = useLocation();
  return <main className="directory-page">
    <div className="directory-top container">
      <a className="brand" href="/" aria-label="فرن الحارة"><span className="brand-mark"><Flame size={20} /></span><span>على الفحم<small>مطاعم الحارة</small></span></a>
      <span className="directory-kicker">أكل بلدي.. بطعم البيت</span>
    </div>
    <section className="directory-hero container">
      <div className="directory-copy fade-up">
        <span className="eyebrow">مطاعم قريبة منك</span>
        <h1>اختار أكلك.<br /><em>والباقي علينا.</em></h1>
        <p>مشويات وسندوتشات متحضّرة على الطلب، وتوصلك سخنة لحد عندك.</p>
        <div className="directory-trust"><span><Truck size={17} /> توصيل سريع</span><span><BadgeCheck size={17} /> طلب مباشر وآمن</span></div>
      </div>
      <div className="directory-image"><img src="/hero-grill.jpg" alt="مشويات مشكلة طازة من على الفحم" /></div>
    </section>
    <section className="container directory-list">
      <div className="list-heading"><div><span className="eyebrow">اختيارات الحارة</span><h2 className="section-title">مطاعم بتستاهل التجربة</h2></div><span className="muted">{restaurants.length.toLocaleString('ar-EG')} مطعم متاح</span></div>
      <div className="restaurant-list">
        {restaurants.map((restaurant) => <button key={restaurant.slug} className="restaurant-tile panel lift" data-testid={`card-restaurant-${restaurant.slug}`} onClick={() => setLocation(`/${restaurant.slug}`)}>
          <div className="tile-photo"><img src="/hero-grill.jpg" alt={`أطباق ${restaurant.name}`} /></div>
          <div className="tile-copy"><span className="eyebrow">مشويات · برجر · أكل بيتي</span><h3>{restaurant.name}</h3><p>{restaurant.tagline}</p><div className="tile-meta"><span className="stars">★★★★★</span><span>٤٫٨</span><span>·</span><span>{restaurant.estimatedDeliveryMinutes} دقيقة</span></div></div>
          <span className="tile-arrow"><ArrowLeft size={20} /></span>
        </button>)}
      </div>
    </section>
  </main>;
}

function RestaurantPage({ restaurant }: { restaurant: Restaurant }) {
  const [location] = useLocation();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [customize, setCustomize] = useState<MenuItem | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [productNote, setProductNote] = useState('');
  const [toast, setToast] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const { lines, addLine, changeQuantity, updateNote, clear, setRestaurant } = useCart();
  const [customer, setCustomer] = useState<Customer>(readCustomer);
  const [reorderAvailable, setReorderAvailable] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const menuRef = useRef<HTMLElement | null>(null);
  const subtotal = lines.reduce((sum, line) => sum + (line.basePrice + (line.sizePrice || 0) + line.extras.reduce((extraSum, extra) => extraSum + extra.price, 0)) * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const zone = restaurant.deliveryZones.find((entry) => entry.name === customer.zone);
  const deliveryFee = zone?.fee || 0;
  const minimum = zone?.minOrder || 0;
  const offerActive = Date.parse(restaurant.offerBanner.endsAt) > currentTime.getTime();
  const filteredItems = useMemo(() => restaurant.menu.filter((menuItem) =>
    !search || `${menuItem.name} ${menuItem.description}`.includes(search.trim()),
  ), [restaurant.menu, search]);
  const filteredCategories = restaurant.categories.filter((category) => filteredItems.some((item) => item.category === category.id));

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setHydrated(true);
    setRestaurant(restaurant.slug);
    setCustomer((current) => restaurant.deliveryZones.some((entry) => entry.name === current.zone)
      ? current
      : { ...current, zone: '' });
    try { setReorderAvailable(!!localStorage.getItem(lastOrderKey(restaurant.slug))); } catch { setReorderAvailable(false); }
  }, [restaurant.slug, setRestaurant]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer)); } catch { /* saved customer details are optional */ }
  }, [customer, hydrated]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.title = `${restaurant.name} | اطلب مشوياتك على واتساب`;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    const setMeta = (selector: string, content: string) => {
      document.querySelector(selector)?.setAttribute('content', content);
    };
    const description = document.querySelector('meta[name="description"]');
    const title = `${restaurant.name} | اطلب مشوياتك على واتساب`;
    const pageDescription = `${restaurant.description} اطلب دلوقتي على واتساب من ${restaurant.name}.`;
    const imageUrl = `${window.location.origin}/hero-grill.jpg`;
    description?.setAttribute('content', pageDescription);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', pageDescription);
    setMeta('meta[property="og:url"]', window.location.href);
    setMeta('meta[property="og:image"]', imageUrl);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', pageDescription);
    setMeta('meta[name="twitter:image"]', imageUrl);
    let jsonLd = document.getElementById('restaurant-schema');
    if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'restaurant-schema'; jsonLd.setAttribute('type', 'application/ld+json'); document.head.appendChild(jsonLd); }
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Restaurant', name: restaurant.name, telephone: restaurant.phone,
      servesCuisine: ['Egyptian', 'Grill', 'Burgers'], image: imageUrl, url: window.location.href,
      address: { '@type': 'PostalAddress', streetAddress: restaurant.address, addressCountry: 'EG' },
      priceRange: '$$', aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: restaurant.reviews.length },
    });
    return () => { document.getElementById('restaurant-schema')?.remove(); };
  }, [restaurant]);
  useEffect(() => {
    const onScroll = () => {
      const visible = restaurant.categories.find((category) => {
        const node = document.getElementById(`category-${category.id}`);
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        return rect.top <= 240 && rect.bottom > 170;
      });
      if (visible && activeCategory !== visible.id) setActiveCategory(visible.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [restaurant.categories, activeCategory]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const addProduct = (product: MenuItem, fromCustomize = false) => {
    const size = fromCustomize ? product.sizes?.find((entry) => entry.name === selectedSize) : undefined;
    const extras = fromCustomize ? (product.extras || []).filter((entry) => selectedExtras.includes(entry.name)) : [];
    addLine({ itemId: product.id, name: product.name, basePrice: product.price, note: fromCustomize ? productNote : '', size: size?.name, sizePrice: size?.price || 0, extras, });
    setToast(`اتضاف ${product.name} للسلة`);
    setCustomize(null);
    setSelectedSize('');
    setSelectedExtras([]);
    setProductNote('');
  };
  const addCombo = (combo: Restaurant['combos'][number]) => {
    addLine({ itemId: combo.id, name: combo.name, basePrice: combo.price, note: '', extras: [] });
    setToast(`اتضاف ${combo.name} للسلة`);
  };
  const openProduct = (product: MenuItem) => {
    setCustomize(product);
    setSelectedSize(product.sizes?.[0]?.name || '');
    setSelectedExtras([]);
    setProductNote('');
  };
  const addUpsell = () => {
    addLine({ itemId: 'upsell-fries-drink', name: 'بطاطس ومشروب — عرض السلة', basePrice: 30, note: '', extras: [] });
    setToast('اتضاف العرض للسلة');
  };
  const checkout = () => {
    if (!lines.length) return;
    const required = ['name', 'phone', 'address', 'zone'] as const;
    const missing = required.some((key) => !customer[key].trim());
    if (missing) { setToast('كمّل بيانات التوصيل الأول'); return; }
    if (subtotal < minimum) { setToast(`الحد الأدنى للطلب ${money(minimum)}`); return; }
    const phoneDigits = customer.phone
      .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .replace(/[^\d+]/g, '');
    if (!/^(?:(?:\+?20)|0)?1[0125]\d{8}$/.test(phoneDigits)) {
      setToast('اكتب رقم موبايل مصري صحيح');
      return;
    }
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer)); localStorage.setItem(lastOrderKey(restaurant.slug), JSON.stringify(lines)); } catch { /* checkout still works if storage is unavailable */ }
    const linesText = lines.map((line) => {
      const unit = line.basePrice + (line.sizePrice || 0) + line.extras.reduce((sum, extra) => sum + extra.price, 0);
      const modifiers = [line.size, ...line.extras.map((extra) => extra.name)].filter(Boolean).join('، ');
      return `• ${line.name}${modifiers ? ` (${modifiers})` : ''} × ${line.quantity} — ${money(unit * line.quantity)}${line.note ? `\n  ملاحظة: ${line.note}` : ''}`;
    }).join('\n');
    const message = `أهلاً ${restaurant.name}، عايز أأكد الأوردر ده:\n\n${linesText}\n\nالإجمالي قبل التوصيل: ${money(subtotal)}\nالتوصيل إلى ${customer.zone}: ${money(deliveryFee)}\nالإجمالي النهائي: ${money(subtotal + deliveryFee)}\n\nالاسم: ${customer.name}\nالموبايل: ${customer.phone}\nالعنوان: ${customer.address}\nطريقة الدفع: ${customer.payment}\n\nمستني تأكيدكم، شكراً.`;
    window.open(`https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    clear();
    setCartOpen(false);
  };
  const reorder = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(lastOrderKey(restaurant.slug)) || '[]') as CartLine[];
      saved.forEach((line) => addLine({ itemId: line.itemId, name: line.name, basePrice: line.basePrice, note: line.note, size: line.size, sizePrice: line.sizePrice, extras: line.extras || [] }));
      setToast('رجّعنا طلبك اللي فات للسلة');
      setCartOpen(true);
    } catch { setToast('مش قادرين نجيب الطلب السابق'); }
  };

  return <div className="app-shell">
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-inner">
        <a className="brand" href="/" aria-label="العودة للمطاعم"><span className="brand-mark"><Flame size={20} /></span><span>{restaurant.logoText}<small>مشويات على أصولها</small></span></a>
        <nav className="header-links desktop-only" aria-label="روابط الصفحة">
          <a href="#menu">المنيو</a><a href="#about">عنّا</a><a href="#location">فين إحنا</a>
        </nav>
        <div className="header-actions"><OpenBadge restaurant={restaurant} /><button className="gold-button header-order" onClick={() => setCartOpen(true)} data-testid="button-header-order"><ShoppingBag size={17} />اطلب دلوقتي</button></div>
      </div>
    </header>
    <main>
      <OfferBanner restaurant={restaurant} now={currentTime} />
      <section className="hero container">
        <div className="hero-copy fade-up">
          <span className="eyebrow"><span className="eyebrow-rule" /> نار هادية.. وطعم أصيل</span>
          <h1>ريحة الفحم<br /><em>بتسبقنا لبابك.</em></h1>
          <p>{restaurant.description}</p>
          <div className="hero-actions">
            <button className="gold-button hero-cta" onClick={() => itemCount ? setCartOpen(true) : document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-hero-menu">اطلب دلوقتي على واتساب <ArrowDown size={18} /></button>
            <span className="hero-delivery"><span className="delivery-icon"><Truck size={18} /></span><span><b>توصيل في {restaurant.estimatedDeliveryMinutes} دقيقة</b><small>من أول ما تطلب</small></span></span>
          </div>
          <div className="hero-proof"><span><span className="stars">★★★★★</span> ٤٫٨ تقييم</span><i /> <span><ChefHat size={16} /> مكونات طازة كل يوم</span></div>
        </div>
        <div className="hero-visual">
          <img src="/hero-grill.jpg" alt="مشكل فرن الحارة مع كفتة على الفحم" />
          <div className="visual-stamp"><span className="stamp-star">✦</span><b>طازة<br />على الفحم</b><small>من مطبخنا لبابك</small></div>
          <div className="visual-caption"><span className="fire-dot" /> شواية شغالة كل يوم <span>من ١٢ الضهر</span></div>
        </div>
      </section>
      {reorderAvailable && <div className="container reorder-wrap"><button className="reorder-btn" onClick={reorder} data-testid="button-reorder"><ArrowUpRight size={16} /> عايز نفس طلبك اللي فات؟ <b>اطلب تاني</b></button></div>}

      <section className="container section-block best-section" aria-labelledby="best-title">
        <div className="section-heading"><div><span className="eyebrow">ناس كتير رجعتلها</span><h2 id="best-title" className="section-title">الأكتر طلباً</h2></div><button className="text-link" onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}>كل المنيو <ArrowLeft size={16} /></button></div>
        <div className="best-grid">
          {restaurant.menu.filter((menuItem) => menuItem.popular).slice(0, 4).map((menuItem) => <ProductCard key={menuItem.id} product={menuItem} onAdd={() => addProduct(menuItem)} onCustomize={() => openProduct(menuItem)} compact />)}
        </div>
      </section>

      <section className="container section-block combo-section" aria-labelledby="combo-title">
        <div className="section-heading"><div><span className="eyebrow">لمة حلوة من غير حساب</span><h2 className="section-title" id="combo-title">كومبوهات على مزاجك</h2></div><span className="section-side-note">كل كومبو فيه توفير حقيقي</span></div>
        <div className="combo-grid">
          {restaurant.combos.map((combo) => <article key={combo.id} className="combo-card panel lift">
            <div className="combo-photo"><img src={combo.image} alt={combo.name} /><span className="saving-badge">وفّر {combo.saving.toLocaleString('ar-EG')} ج.م</span></div>
            <div className="combo-details"><div><h3>{combo.name}</h3><p>{combo.description}</p><div className="combo-includes">{combo.items.map((thing) => <span key={thing}><Check size={13} />{thing}</span>)}</div></div>
              <div className="combo-buy"><b>{money(combo.price)}</b><button className="gold-button add-button" aria-label={`إضافة ${combo.name} للسلة`} onClick={() => addCombo(combo)} data-testid={`button-add-${combo.id}`}><Plus size={18} /> ضيف</button></div>
            </div>
          </article>)}
        </div>
      </section>

      <section ref={menuRef} id="menu" className="menu-section">
        <div className="container menu-heading">
          <div><span className="eyebrow">اتعمل بحب.. واتشوى على الفحم</span><h2 className="section-title">المنيو بتاعنا</h2><p className="muted">كل حاجة بتتعمل وقت الطلب، اختار اللي نفسك فيه.</p></div>
          <label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بتدور على إيه؟" aria-label="ابحث في المنيو" data-testid="input-menu-search" />{search && <button aria-label="امسح البحث" onClick={() => setSearch('')}><X size={16} /></button>}</label>
        </div>
        <div className="sticky-tabs">
          <div className="container tabs-track no-scrollbar" role="tablist" aria-label="أقسام المنيو">
            <button role="tab" aria-pressed={activeCategory === 'all'} className="category-chip" onClick={() => { setActiveCategory('all'); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); }}>كل المنيو</button>
            {restaurant.categories.map((category) => <button role="tab" aria-pressed={activeCategory === category.id} key={category.id} className="category-chip" onClick={() => { setActiveCategory(category.id); document.getElementById(`category-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} data-testid={`tab-category-${category.id}`}>{category.name}</button>)}
          </div>
        </div>
        <div className="container menu-content">
          {!filteredItems.length ? <div className="empty-results panel"><Search size={27} /><b>ملقيناش اللي بتدور عليه</b><p>جرّب كلمة تانية أو اختار قسم مختلف.</p><button className="outline-button" onClick={() => { setSearch(''); setActiveCategory('all'); }}>عرض كل المنيو</button></div> : filteredCategories.map((category) => {
            const categoryItems = filteredItems.filter((menuItem) => menuItem.category === category.id);
            return <section id={`category-${category.id}`} className="menu-category" key={category.id}>
              <div className="category-title"><div><span className="category-mark"><Utensils size={17} /></span><h3>{category.name}</h3></div><span>{categoryItems.length.toLocaleString('ar-EG')} أصناف</span></div>
              <div className="menu-grid">{categoryItems.map((menuItem) => <ProductCard key={menuItem.id} product={menuItem} onAdd={() => addProduct(menuItem)} onCustomize={() => openProduct(menuItem)} />)}</div>
            </section>;
          })}
        </div>
      </section>

      <section id="about" className="why-section">
        <div className="container"><div className="section-heading"><div><span className="eyebrow">مش مجرد وجبة</span><h2 className="section-title">طعم الحارة.. في كل لقمة</h2></div><p className="section-side-note">من أول تتبيلة لحد آخر لمسة<br />بنحب الأكل اللي يتاكل.</p></div>
          <div className="why-grid"><WhyCard icon={<Flame />} title="فحم حقيقي" text="الشواية فحم كل يوم، عشان تاخد ريحة وطعم مايتقلدوش." /><WhyCard icon={<ChefHat />} title="تتبيلة بيتنا" text="خلطة التوابل بتتعمل في مطبخنا من مكونات طازة." /><WhyCard icon={<Truck />} title="يوصلك سخن" text="بنجهز طلبك على قدّ ما نقدر ونوصلهولك في علب مناسبة." /><WhyCard icon={<BadgeCheck />} title="طلبك واضح" text="راجع كل حاجة قبل ما تبعتها، والتأكيد بيكون معانا على واتساب." /></div>
        </div>
      </section>

      <section className="container section-block reviews-section">
        <div className="review-summary panel"><span className="eyebrow">كلام من ناس داقت</span><div className="review-score">٤٫٨ <span className="stars">★★★★★</span></div><p>من {restaurant.ordersDelivered.toLocaleString('ar-EG')} طلب اتسلّم لحد باب البيت</p><div className="review-meter"><span /></div></div>
        <div className="reviews-main"><div className="section-heading"><div><span className="eyebrow">من مطبخنا لبيوتكم</span><h2 className="section-title">قالوا عنّا</h2></div></div>
          <div className="reviews-grid">{restaurant.reviews.map((review) => <article className="review-card panel" key={review.name}><span className="stars" aria-label={`تقييم ${review.rating} من ٥`}>★★★★★</span><p>«{review.text}»</p><div className="review-person"><span className="review-initial">{review.name.trim()[0]}</span><b>{review.name}</b><span className="verified"><BadgeCheck size={14} /> طلب مؤكد</span></div></article>)}</div>
        </div>
      </section>

      <section className="container location-section" id="location">
        <div className="location-copy"><span className="eyebrow">مستنيين طلبك</span><h2 className="section-title">من التجمع.. لحد عندك</h2><p className="muted">بنوصّل للمناطق القريبة بسرعة، اختار منطقتك وشوف تكلفة التوصيل قبل ما تأكد.</p>
          <div className="address-row"><span className="location-icon"><MapPin size={20} /></span><div><b>{restaurant.address}</b><small>التوصيل يومياً من ١٢ الضهر</small></div></div>
          <div className="location-actions"><a className="outline-button action-link" href={`tel:${restaurant.phone}`}><Phone size={17} /> اتصل بينا</a><a className="outline-button action-link" href={restaurant.mapsLink} target="_blank" rel="noreferrer"><Navigation size={17} /> افتح الخريطة <ArrowUpRight size={14} /></a></div>
        </div>
        <div className="zone-card panel"><div className="zone-card-head"><MapPin size={18} /><b>مناطق التوصيل</b><span>والأسعار واضحة</span></div>
          {restaurant.deliveryZones.map((deliveryZone) => <div className="zone-row" key={deliveryZone.name}><span>{deliveryZone.name}</span><span>{money(deliveryZone.fee)} <small>· حد أدنى {money(deliveryZone.minOrder)}</small></span></div>)}
          <div className="hours-head"><Clock3 size={16} /><b>مواعيدنا كل يوم</b></div>
          {restaurant.workingHours.map((hours) => <div className="hours-row" key={hours.day}><span>{hours.day}</span><span>{arabicDigits(hours.open)} – {arabicDigits(hours.close)}</span></div>)}
          <div className="zone-note"><Clock3 size={15} /> التوصيل في حوالي {restaurant.estimatedDeliveryMinutes} دقيقة</div>
        </div>
      </section>
    </main>

    <footer className="site-footer"><div className="container footer-inner"><a className="brand" href="#"><span className="brand-mark"><Flame size={19} /></span><span>{restaurant.logoText}<small>طعم يتعمل بحب</small></span></a><p>مشويات متحضّرة على الطلب، من نار الفحم لحد باب بيتك.</p><a href={`tel:${restaurant.phone}`} className="footer-phone"><Phone size={16} />{restaurant.phone}</a><div className="social-links"><a href={restaurant.socialLinks.instagram} target="_blank" rel="noreferrer" aria-label="إنستجرام"><Instagram size={17} /></a><a href={restaurant.socialLinks.facebook} target="_blank" rel="noreferrer" aria-label="فيسبوك"><Facebook size={17} /></a></div><span className="copyright">© {new Date().getFullYear()} {restaurant.name} · معمول بحب في القاهرة</span></div></footer>
    {hydrated && itemCount > 0 && <div className="mobile-cart" data-testid="bar-sticky-cart">
      <a className="mobile-cart-tool" href={`tel:${restaurant.phone}`} aria-label="اتصل بالمطعم" data-testid="link-sticky-call"><Phone size={18} /></a>
      <a className="mobile-cart-tool" href={restaurant.mapsLink} target="_blank" rel="noreferrer" aria-label="افتح موقع المطعم على الخريطة" data-testid="link-sticky-map"><Navigation size={18} /></a>
      <button className="mobile-cart-order gold-button" onClick={() => setCartOpen(true)} data-testid="button-sticky-cart"><span className="cart-count">{itemCount.toLocaleString('ar-EG')}</span><span>افتح السلة</span><b>{money(subtotal)}</b><ArrowLeft size={17} /></button>
    </div>}
    <a className="floating-wa" href={`https://wa.me/${restaurant.whatsappNumber}`} target="_blank" rel="noreferrer" aria-label="كلمنا على واتساب" data-testid="link-floating-whatsapp"><WhatsAppMark /></a>
    {toast && <div role="status" aria-live="polite" className="toast-message"><Check size={17} />{toast}</div>}
    {customize && <ProductDialog product={customize} selectedSize={selectedSize} setSelectedSize={setSelectedSize} selectedExtras={selectedExtras} setSelectedExtras={setSelectedExtras} note={productNote} setNote={setProductNote} onClose={() => setCustomize(null)} onAdd={() => addProduct(customize, true)} />}
    {cartOpen && <CartDrawer restaurant={restaurant} lines={lines} subtotal={subtotal} deliveryFee={deliveryFee} minimum={minimum} offerActive={offerActive} customer={customer} setCustomer={setCustomer} close={() => setCartOpen(false)} changeQuantity={changeQuantity} updateNote={updateNote} addUpsell={addUpsell} checkout={checkout} />}
    <div className="sr-only" aria-live="polite">{itemCount} عناصر في السلة</div>
    <span className="sr-only" data-testid="text-restaurant-route">{location}</span>
  </div>;
}

function ProductCard({ product, onAdd, onCustomize, compact = false }: { product: MenuItem; onAdd: () => void; onCustomize: () => void; compact?: boolean }) {
  return <article className={`product-card panel lift ${compact ? 'product-compact' : ''}`} data-testid={`card-product-${product.id}`}>
    <button className="product-photo" onClick={onCustomize} aria-label={`تفاصيل ${product.name}`}><img loading="lazy" src={product.image} alt={product.name} />{product.badge && <span className="product-badge">{product.badge}</span>}{product.spicy && <span className="spicy-badge" aria-label="حار"><Flame size={13} /></span>}</button>
    <div className="product-info"><div className="product-name-row"><h4>{product.name}</h4>{product.popular && <span className="mini-popular"><Flame size={12} /></span>}</div><p>{product.description}</p>
      <div className="product-bottom"><b>{money(product.price)}</b><div className="product-actions"><button className="details-button" onClick={onCustomize} aria-label={`اختيارات ${product.name}`} data-testid={`button-customize-${product.id}`}>اختيارات</button><button className="add-button" onClick={onAdd} aria-label={`إضافة ${product.name}`} data-testid={`button-add-${product.id}`}><Plus size={18} /></button></div></div>
    </div>
  </article>;
}
function WhyCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="why-card"><span className="why-icon">{icon}</span><h3>{title}</h3><p>{text}</p></article>;
}
function ProductDialog({ product, selectedSize, setSelectedSize, selectedExtras, setSelectedExtras, note, setNote, onClose, onAdd }: {
  product: MenuItem; selectedSize: string; setSelectedSize: (value: string) => void; selectedExtras: string[]; setSelectedExtras: (value: string[]) => void; note: string; setNote: (value: string) => void; onClose: () => void; onAdd: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const selectedSizePrice = product.sizes?.find((size) => size.name === selectedSize)?.price || 0;
  const extrasTotal = (product.extras || []).filter((extra) => selectedExtras.includes(extra.name)).reduce((sum, extra) => sum + extra.price, 0);
  return <><button className="overlay" aria-label="إغلاق التفاصيل" onClick={onClose} /><section className="product-dialog panel" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
    <button className="dialog-close" aria-label="إغلاق" onClick={onClose}><X size={20} /></button>
    <div className={`dialog-photo ${imageLoaded ? 'loaded' : ''}`}><img src={product.image} alt={product.name} onLoad={() => setImageLoaded(true)} /></div>
    <div className="dialog-body"><span className="eyebrow">تفاصيل الطبق</span><h2 id="product-dialog-title">{product.name}</h2><p className="muted">{product.description}</p>
      {product.sizes?.length ? <fieldset className="option-field"><legend>اختار الحجم</legend>{product.sizes.map((size) => <label className="choice-row" key={size.name}><input type="radio" name="product-size" checked={selectedSize === size.name} onChange={() => setSelectedSize(size.name)} /><span>{size.name}</span><b>{size.price ? `+ ${money(size.price)}` : 'السعر الأساسي'}</b></label>)}</fieldset> : null}
      {product.extras?.length ? <fieldset className="option-field"><legend>زوّدها حاجة</legend>{product.extras.map((extra) => <label className="choice-row" key={extra.name}><input type="checkbox" checked={selectedExtras.includes(extra.name)} onChange={(event) => setSelectedExtras(event.target.checked ? [...selectedExtras, extra.name] : selectedExtras.filter((name) => name !== extra.name))} /><span>{extra.name}</span><b>+ {money(extra.price)}</b></label>)}</fieldset> : null}
      <label className="field-label">ملاحظة للمطبخ <textarea className="input-dark" value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثلاً: من غير بصل" rows={2} data-testid="input-product-note" /></label>
      <button className="gold-button dialog-add" onClick={onAdd} data-testid="button-add-customized"><span>ضيف للسلة</span><b>{money(product.price + selectedSizePrice + extrasTotal)}</b></button>
    </div>
  </section></>;
}
function CartDrawer({ restaurant, lines, subtotal, deliveryFee, minimum, offerActive, customer, setCustomer, close, changeQuantity, updateNote, addUpsell, checkout }: {
  restaurant: Restaurant; lines: CartLine[]; subtotal: number; deliveryFee: number; minimum: number; offerActive: boolean; customer: Customer; setCustomer: (value: Customer) => void;
  close: () => void; changeQuantity: (key: string, delta: number) => void; updateNote: (key: string, note: string) => void; addUpsell: () => void; checkout: () => void;
}) {
  const patchCustomer = (updates: Partial<Customer>) => setCustomer({ ...customer, ...updates });
  const underMinimum = !!customer.zone && subtotal < minimum;
  const total = subtotal + deliveryFee;
  return <><button className="overlay" aria-label="إغلاق السلة" onClick={close} /><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-heading">
    <div className="drawer-header"><div><span className="eyebrow">خطوة واحدة وتبقى عندك</span><h2 id="cart-heading">سلتك <span>({lines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('ar-EG')})</span></h2></div><button className="icon-button" onClick={close} aria-label="إغلاق السلة"><X size={20} /></button></div>
    <div className="drawer-content">
      {!lines.length ? <div className="empty-cart"><span className="empty-icon"><ShoppingBag size={28} /></span><h3>السلة لسه فاضية</h3><p>اختار حاجة من المنيو وهتظهر هنا.</p><button className="outline-button" onClick={close}>كمّل اختيارك</button></div> : <>
        <div className="cart-lines">{lines.map((line) => <div className="cart-line" key={line.key} data-testid={`row-cart-${line.key}`}>
          <div className="cart-line-main"><div><b>{line.name}</b><small>{[line.size, ...line.extras.map((extra) => extra.name)].filter(Boolean).join(' · ') || 'طازة على الطلب'}</small><strong>{money((line.basePrice + (line.sizePrice || 0) + line.extras.reduce((sum, extra) => sum + extra.price, 0)) * line.quantity)}</strong></div>
            <div className="quantity-stepper"><button onClick={() => changeQuantity(line.key, -1)} aria-label={`قلل ${line.name}`}><Minus size={15} /></button><span>{line.quantity.toLocaleString('ar-EG')}</span><button onClick={() => changeQuantity(line.key, 1)} aria-label={`زوّد ${line.name}`}><Plus size={15} /></button></div>
          </div><label className="cart-note"><span>ملاحظة للمطبخ</span><input value={line.note} onChange={(event) => updateNote(line.key, event.target.value)} placeholder="من غير بصل؟" aria-label={`ملاحظة ${line.name}`} data-testid={`input-note-${line.key}`} /></label>
        </div>)}</div>
         {offerActive && <button className="upsell-card" onClick={addUpsell} data-testid="button-cart-upsell"><span className="upsell-icon"><Plus size={18} /></span><span><b>بطاطس ومشروب بـ ٣٠ جنيه؟</b><small>عرض النهاردة، لحد {arabicDigits(restaurant.offerBanner.endsAt.slice(11, 16))}</small></span><span className="upsell-add">ضيف</span></button>}
        <div className="checkout-fields">
          <div className="drawer-section-title"><span>١</span><h3>التوصيل فين؟</h3></div>
          <label className="field-label">منطقة التوصيل<select className="input-dark" value={customer.zone} onChange={(event) => patchCustomer({ zone: event.target.value })} data-testid="select-delivery-zone"><option value="">اختار منطقتك</option>{restaurant.deliveryZones.map((zone) => <option key={zone.name} value={zone.name}>{zone.name} — {money(zone.fee)} توصيل</option>)}</select></label>
          {underMinimum && <div className="minimum-warning" role="status">زود {money(minimum - subtotal)} عشان نوصل لمنطقتك. الحد الأدنى {money(minimum)}.</div>}
          <div className="drawer-section-title"><span>٢</span><h3>بياناتك</h3></div>
          <div className="field-grid"><label className="field-label">الاسم<input className="input-dark" value={customer.name} onChange={(event) => patchCustomer({ name: event.target.value })} placeholder="اسمك إيه؟" autoComplete="name" data-testid="input-customer-name" /></label><label className="field-label">رقم الموبايل<input className="input-dark" value={customer.phone} onChange={(event) => patchCustomer({ phone: event.target.value })} placeholder="01xxxxxxxxx" inputMode="tel" autoComplete="tel" data-testid="input-customer-phone" /></label></div>
          <label className="field-label">العنوان بالتفصيل<textarea className="input-dark" value={customer.address} onChange={(event) => patchCustomer({ address: event.target.value })} placeholder="الشارع، رقم العمارة، الدور والشقة" rows={2} autoComplete="street-address" data-testid="input-customer-address" /></label>
          <div className="drawer-section-title"><span>٣</span><h3>هتدفع إزاي؟</h3></div>
          <div className="payment-options">{['كاش عند الاستلام', 'فودافون كاش', 'انستاباي'].map((method) => <button key={method} aria-pressed={customer.payment === method} className={`payment-option ${customer.payment === method ? 'selected' : ''}`} onClick={() => patchCustomer({ payment: method })} data-testid={`button-payment-${method}`}>{method}</button>)}</div>
          {customer.payment !== 'كاش عند الاستلام' && <p className="payment-hint">تفاصيل التحويل هنبعتهالك بعد تأكيد الطلب على واتساب.</p>}
        </div>
      </>}
    </div>
    {!!lines.length && <div className="drawer-footer"><div className="price-summary"><div><span>المجموع</span><b>{money(subtotal)}</b></div><div><span>التوصيل</span><b>{customer.zone ? money(deliveryFee) : 'اختار منطقتك'}</b></div><div className="grand-total"><span>الإجمالي</span><strong>{money(total)}</strong></div></div>
      <button className="gold-button checkout-button" onClick={checkout} disabled={underMinimum} data-testid="button-whatsapp-checkout"><WhatsAppMark /><span>أكّد الطلب على واتساب</span><ArrowLeft size={17} /></button>
      <small className="checkout-footnote">طلبك مش هيتبعت غير لما تدوس تأكيد</small>
    </div>}
  </aside></>;
}
function WhatsAppMark() { return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.4 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20l.8-4.8a8.4 8.4 0 1 1 16.6-3.4Z" /><path d="M8.3 8.1c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2.1.4-.1.6l-.5.6c-.2.2-.2.3 0 .6.5.9 1.2 1.5 2.1 1.9.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.3.6-.1.5-.5 1.1-.9 1.3-.4.3-.9.4-1.5.3-1-.2-2.1-.7-3.2-1.7-1.2-1-2-2.3-2.3-3.1-.3-.8-.1-1.8.2-2.5Z" /></svg>; }

function NotFound() {
  return <main className="not-found"><span className="brand-mark"><Flame size={22} /></span><span className="eyebrow">مش لاقيين الصفحة دي</span><h1>الرابط ده مش موجود عندنا</h1><p>ارجع للمطاعم واختار مكانك.</p><a href="/" className="gold-button">شوف المطاعم <ArrowLeft size={17} /></a></main>;
}
export default function App() {
  return <Switch>
    <Route path="/" component={RestaurantDirectory} />
    <Route path="/:slug">{(params) => {
      const restaurant = getRestaurant(params.slug);
      return restaurant ? <RestaurantPage key={restaurant.slug} restaurant={restaurant} /> : <NotFound />;
    }}</Route>
    <Route><NotFound /></Route>
  </Switch>;
}
