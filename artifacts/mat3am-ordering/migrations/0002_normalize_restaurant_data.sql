CREATE TABLE IF NOT EXISTS restaurant_profile (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_text TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  maps_link TEXT NOT NULL,
  estimated_delivery_minutes INTEGER NOT NULL,
  orders_delivered INTEGER NOT NULL,
  offer_text TEXT NOT NULL,
  offer_ends_at TEXT NOT NULL,
  theme_primary TEXT NOT NULL,
  theme_accent TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurant_hours (
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  day TEXT NOT NULL,
  open TEXT NOT NULL,
  close TEXT NOT NULL,
  PRIMARY KEY (slug, sort_order)
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  fee REAL NOT NULL,
  min_order REAL NOT NULL,
  PRIMARY KEY (slug, sort_order)
);

CREATE TABLE IF NOT EXISTS restaurant_categories (
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (slug, id)
);

CREATE TABLE IF NOT EXISTS menu_items (
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  category_id TEXT NOT NULL,
  image TEXT NOT NULL,
  badge TEXT,
  popular INTEGER NOT NULL DEFAULT 0,
  spicy INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (slug, id)
);

CREATE TABLE IF NOT EXISTS menu_item_sizes (
  slug TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  PRIMARY KEY (slug, item_id, sort_order)
);

CREATE TABLE IF NOT EXISTS menu_item_extras (
  slug TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  PRIMARY KEY (slug, item_id, sort_order)
);

CREATE TABLE IF NOT EXISTS combo_offers (
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  saving REAL NOT NULL,
  image TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (slug, id)
);

CREATE TABLE IF NOT EXISTS combo_items (
  slug TEXT NOT NULL,
  combo_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (slug, combo_id, sort_order)
);

CREATE TABLE IF NOT EXISTS restaurant_reviews (
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (slug, sort_order)
);

CREATE TABLE IF NOT EXISTS restaurant_social_links (
  slug TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  PRIMARY KEY (slug, platform)
);

INSERT OR IGNORE INTO restaurant_profile (
  slug, name, logo_text, tagline, description, whatsapp_number, phone,
  address, maps_link, estimated_delivery_minutes, orders_delivered,
  offer_text, offer_ends_at, theme_primary, theme_accent
)
SELECT
  json_extract(data_json, '$.slug'),
  json_extract(data_json, '$.name'),
  json_extract(data_json, '$.logoText'),
  json_extract(data_json, '$.tagline'),
  json_extract(data_json, '$.description'),
  json_extract(data_json, '$.whatsappNumber'),
  json_extract(data_json, '$.phone'),
  json_extract(data_json, '$.address'),
  json_extract(data_json, '$.mapsLink'),
  json_extract(data_json, '$.estimatedDeliveryMinutes'),
  json_extract(data_json, '$.ordersDelivered'),
  json_extract(data_json, '$.offerBanner.text'),
  json_extract(data_json, '$.offerBanner.endsAt'),
  json_extract(data_json, '$.theme.primary'),
  json_extract(data_json, '$.theme.accent')
FROM restaurant_data;

INSERT OR IGNORE INTO restaurant_hours (slug, sort_order, day, open, close)
SELECT json_extract(d.data_json, '$.slug'), CAST(h.key AS INTEGER),
       json_extract(h.value, '$.day'), json_extract(h.value, '$.open'),
       json_extract(h.value, '$.close')
FROM restaurant_data d, json_each(d.data_json, '$.workingHours') h;

INSERT OR IGNORE INTO delivery_zones (slug, sort_order, name, fee, min_order)
SELECT json_extract(d.data_json, '$.slug'), CAST(z.key AS INTEGER),
       json_extract(z.value, '$.name'), json_extract(z.value, '$.fee'),
       json_extract(z.value, '$.minOrder')
FROM restaurant_data d, json_each(d.data_json, '$.deliveryZones') z;

INSERT OR IGNORE INTO restaurant_categories (slug, id, name, description, sort_order)
SELECT json_extract(d.data_json, '$.slug'), json_extract(c.value, '$.id'),
       json_extract(c.value, '$.name'), json_extract(c.value, '$.description'),
       CAST(c.key AS INTEGER)
FROM restaurant_data d, json_each(d.data_json, '$.categories') c;

INSERT OR IGNORE INTO menu_items (
  slug, id, name, description, price, category_id, image, badge, popular, spicy, sort_order
)
SELECT json_extract(d.data_json, '$.slug'), json_extract(m.value, '$.id'),
       json_extract(m.value, '$.name'), json_extract(m.value, '$.description'),
       json_extract(m.value, '$.price'), json_extract(m.value, '$.category'),
       json_extract(m.value, '$.image'), json_extract(m.value, '$.badge'),
       COALESCE(json_extract(m.value, '$.popular'), 0),
       COALESCE(json_extract(m.value, '$.spicy'), 0), CAST(m.key AS INTEGER)
FROM restaurant_data d, json_each(d.data_json, '$.menu') m;

INSERT OR IGNORE INTO menu_item_sizes (slug, item_id, sort_order, name, price)
SELECT json_extract(d.data_json, '$.slug'), json_extract(m.value, '$.id'),
       CAST(o.key AS INTEGER), json_extract(o.value, '$.name'),
       json_extract(o.value, '$.price')
FROM restaurant_data d,
     json_each(d.data_json, '$.menu') m,
     json_each(m.value, '$.sizes') o;

INSERT OR IGNORE INTO menu_item_extras (slug, item_id, sort_order, name, price)
SELECT json_extract(d.data_json, '$.slug'), json_extract(m.value, '$.id'),
       CAST(o.key AS INTEGER), json_extract(o.value, '$.name'),
       json_extract(o.value, '$.price')
FROM restaurant_data d,
     json_each(d.data_json, '$.menu') m,
     json_each(m.value, '$.extras') o;

INSERT OR IGNORE INTO combo_offers (
  slug, id, name, description, price, saving, image, sort_order
)
SELECT json_extract(d.data_json, '$.slug'), json_extract(c.value, '$.id'),
       json_extract(c.value, '$.name'), json_extract(c.value, '$.description'),
       json_extract(c.value, '$.price'), json_extract(c.value, '$.saving'),
       json_extract(c.value, '$.image'), CAST(c.key AS INTEGER)
FROM restaurant_data d, json_each(d.data_json, '$.combos') c;

INSERT OR IGNORE INTO combo_items (slug, combo_id, sort_order, name)
SELECT json_extract(d.data_json, '$.slug'), json_extract(c.value, '$.id'),
       CAST(i.key AS INTEGER), i.value
FROM restaurant_data d,
     json_each(d.data_json, '$.combos') c,
     json_each(c.value, '$.items') i;

INSERT OR IGNORE INTO restaurant_reviews (slug, sort_order, name, rating, text)
SELECT json_extract(d.data_json, '$.slug'), CAST(r.key AS INTEGER),
       json_extract(r.value, '$.name'), json_extract(r.value, '$.rating'),
       json_extract(r.value, '$.text')
FROM restaurant_data d, json_each(d.data_json, '$.reviews') r;

INSERT OR IGNORE INTO restaurant_social_links (slug, platform, url)
SELECT json_extract(data_json, '$.slug'), 'instagram',
       json_extract(data_json, '$.socialLinks.instagram')
FROM restaurant_data
UNION ALL
SELECT json_extract(data_json, '$.slug'), 'facebook',
       json_extract(data_json, '$.socialLinks.facebook')
FROM restaurant_data;

ALTER TABLE restaurant_data RENAME TO restaurant_data_backup;
