-- Additive migration: preserve existing orders and customer history.
ALTER TABLE customers ADD COLUMN user_id integer REFERENCES users(id);
CREATE UNIQUE INDEX customers_user_unique ON customers(user_id);
ALTER TABLE orders ADD COLUMN buyer_id integer REFERENCES users(id);
ALTER TABLE orders ADD COLUMN shipping_name text;
ALTER TABLE orders ADD COLUMN shipping_email text;
ALTER TABLE orders ADD COLUMN shipping_phone text;
ALTER TABLE orders ADD COLUMN shipping_address text;
ALTER TABLE orders ADD COLUMN shipping_notes text;
ALTER TABLE orders ADD COLUMN shipping_fee numeric(14,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0);
ALTER TABLE orders ADD COLUMN checkout_key text;
ALTER TABLE orders ADD COLUMN checkout_fingerprint text;
CREATE UNIQUE INDEX orders_buyer_checkout_unique ON orders(buyer_id,checkout_key);
CREATE INDEX orders_buyer_date ON orders(buyer_id,created_at DESC);
ALTER TABLE notifications ADD COLUMN target_user_id integer REFERENCES users(id);
CREATE INDEX notifications_target ON notifications(target_user_id,id DESC);
