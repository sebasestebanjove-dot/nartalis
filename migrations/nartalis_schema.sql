-- Nartalis - Esquema completo de base de datos
-- Corregido: FKs apuntan a dermo_users (no a users de contrial)
-- Eliminado: ALTER TABLE users (no existe en Nartalis)

BEGIN;

-- ============================================================
-- 1. IA Module - Auth (independiente de contrial)
-- ============================================================
CREATE TABLE IF NOT EXISTS ia_module_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(512),
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'email',
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  google_id VARCHAR(255),
  codigo_postal VARCHAR(10),
  needs_codigo_postal BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  consultas_consumidas INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_module_users_email ON ia_module_users(email);
CREATE INDEX IF NOT EXISTS idx_ia_module_users_google_id ON ia_module_users(google_id);

-- ============================================================
-- 2. Dermo Users (independiente)
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(512),
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'email',
  codigo_postal VARCHAR(10),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  consultas_consumidas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_users_email ON dermo_users(email);

-- ============================================================
-- 3. Farma - Estadísticas de búsqueda
-- ============================================================
CREATE TABLE IF NOT EXISTS farma_search_log (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  search_type VARCHAR(10) DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farma_search_log_query ON farma_search_log (query);
CREATE INDEX IF NOT EXISTS idx_farma_search_log_created_at ON farma_search_log (created_at);

CREATE TABLE IF NOT EXISTS farma_name_cache (
  nombre TEXT NOT NULL,
  nregistro TEXT PRIMARY KEY,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farma_name_cache_nombre ON farma_name_cache (nombre);

-- ============================================================
-- 4. Dermo - Catálogo de productos
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dermo_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  inci_name VARCHAR(255),
  description TEXT,
  benefits TEXT,
  warnings TEXT,
  skin_types TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dermo_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  brand_id UUID REFERENCES dermo_brands(id),
  image_url TEXT,
  description TEXT,
  ingredients TEXT[],
  analysis JSONB,
  skin_types TEXT[],
  indications TEXT,
  contraindications TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_products_name ON dermo_products(name);
CREATE INDEX IF NOT EXISTS idx_dermo_products_brand ON dermo_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_dermo_products_skin_types ON dermo_products USING GIN(skin_types);

CREATE TABLE IF NOT EXISTS dermo_product_ingredients (
  product_id UUID NOT NULL REFERENCES dermo_products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES dermo_ingredients(id) ON DELETE CASCADE,
  concentration VARCHAR(50),
  PRIMARY KEY (product_id, ingredient_id)
);

-- ============================================================
-- 5. Dermo - Farmacias y stock
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  phone VARCHAR(20),
  website TEXT,
  is_subscribed BOOLEAN DEFAULT FALSE,
  subscription_monthly DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_pharmacies_pc ON dermo_pharmacies(postal_code);

CREATE TABLE IF NOT EXISTS dermo_product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES dermo_products(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES dermo_pharmacies(id) ON DELETE CASCADE,
  stock INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT FALSE,
  reservation_enabled BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (product_id, pharmacy_id)
);

CREATE INDEX IF NOT EXISTS idx_dermo_product_stock_product ON dermo_product_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_dermo_product_stock_pharmacy ON dermo_product_stock(pharmacy_id);

-- ============================================================
-- 6. Dermo - Bookings (FK corregida: dermo_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES dermo_products(id),
  pharmacy_id UUID NOT NULL REFERENCES dermo_pharmacies(id),
  status VARCHAR(20) DEFAULT 'pending',
  pickup_code VARCHAR(6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_bookings_user ON dermo_bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_dermo_bookings_status ON dermo_bookings(status);

-- ============================================================
-- 7. Dermo - Consultations (FK corregida: dermo_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT,
  products_referenced UUID[],
  model_used VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_consultations_user ON dermo_consultations(user_email);

-- ============================================================
-- 8. Dermo - Quiz y Rutinas (FK corregida: dermo_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step INT NOT NULL,
  question TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'single',
  options JSONB,
  field_key VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dermo_user_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  skin_type VARCHAR(20),
  allergies TEXT[],
  goals TEXT[],
  am_routine JSONB,
  pm_routine JSONB,
  explanation TEXT,
  is_completed BOOLEAN DEFAULT false,
  name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  generated_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_routines_user_status ON dermo_user_routines(user_email, status);

-- Quiz seed data
INSERT INTO dermo_quiz_questions (step, question, type, options, field_key) VALUES
(1, '¿Cómo describirías tu tipo de piel?', 'single',
  '[{"label": "Piel seca", "value": "seca", "icon": "🍂"}, {"label": "Piel grasa", "value": "grasa", "icon": "✨"}, {"label": "Piel mixta", "value": "mixta", "icon": "⚖️"}, {"label": "Piel sensible", "value": "sensible", "icon": "🌸"}, {"label": "Piel normal", "value": "normal", "icon": "✅"}]',
  'skin_type'),
(2, '¿Tienes alguna alergia o sensibilidad conocida?', 'multiple',
  '[{"label": "Perfumes", "value": "perfumes"}, {"label": "Parabenos", "value": "parabenos"}, {"label": "Alcohol", "value": "alcohol"}, {"label": "Ninguna", "value": "ninguna"}]',
  'allergies'),
(3, '¿Cuáles son tus principales objetivos?', 'multiple',
  '[{"label": "Hidratación", "value": "hidratacion", "icon": "💧"}, {"label": "Anti-edad", "value": "antedad", "icon": "⏳"}, {"label": "Controlar brillos", "value": "brillos", "icon": "🌟"}, {"label": "Uniformizar tono", "value": "tono", "icon": "🎨"}]',
  'goals'),
(4, '¿Usas protección solar a diario?', 'single',
  '[{"label": "Sí, siempre", "value": "siempre"}, {"label": "A veces", "value": "aveces"}, {"label": "No suelo", "value": "nunca"}]',
  'sun_protection');

-- ============================================================
-- 9. Dermo - Goals y Score History (FK corregida: dermo_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL,
  target_date DATE,
  progress INT DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_user_goals_user ON dermo_user_goals(user_email);

CREATE TABLE IF NOT EXISTS dermo_skin_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  score INT NOT NULL,
  breakdown JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_skin_score_user ON dermo_skin_score_history(user_email);
CREATE INDEX IF NOT EXISTS idx_dermo_skin_score_date ON dermo_skin_score_history(recorded_at);

CREATE TABLE IF NOT EXISTS dermo_fit_score_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255),
  product_name VARCHAR(255) NOT NULL,
  score INT NOT NULL,
  total_ingredients INT DEFAULT 0,
  safe_count INT DEFAULT 0,
  caution_count INT DEFAULT 0,
  avoid_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_fit_score_user ON dermo_fit_score_log(user_email);

-- ============================================================
-- 10. Dermo - Routine Logs (FK: dermo_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_routine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_items INT NOT NULL DEFAULT 0,
  completed_items INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dermo_routine_logs_user_date ON dermo_routine_logs(user_email, log_date);

-- ============================================================
-- 11. Dermo - Search History y Telemetry
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) REFERENCES dermo_users(email) ON DELETE CASCADE,
  guest_id VARCHAR(64),
  product_name VARCHAR(255) NOT NULL,
  ingredients_teaser TEXT,
  cp VARCHAR(10),
  total_ingredients INT DEFAULT 0,
  dangerous_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_search_history_user ON dermo_search_history(user_email);
CREATE INDEX IF NOT EXISTS idx_dermo_search_history_guest ON dermo_search_history(guest_id);

CREATE TABLE IF NOT EXISTS dermo_telemetry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(255) NOT NULL,
  cp VARCHAR(10),
  user_type VARCHAR(20) NOT NULL DEFAULT 'anonymous',
  user_email VARCHAR(255),
  tokens_consumed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dermo_telemetry_log_created ON dermo_telemetry_log(created_at);
CREATE INDEX IF NOT EXISTS idx_dermo_telemetry_log_product ON dermo_telemetry_log(product_name);

-- ============================================================
-- 12. Dermo - Premium V2 (Travel, ProductUsage, Medications, Weekly, KPIs)
-- ============================================================
CREATE TABLE IF NOT EXISTS dermo_travel_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  destination VARCHAR(255) NOT NULL,
  travel_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  generated_routine JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_user ON dermo_travel_profiles(user_email);

CREATE TABLE IF NOT EXISTS dermo_product_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  product_id UUID REFERENCES dermo_products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  size_ml DECIMAL(8,2) NOT NULL,
  unit VARCHAR(5) DEFAULT 'ml',
  use_frequency VARCHAR(50) NOT NULL,
  daily_usage_ml DECIMAL(6,3) DEFAULT 0,
  estimated_finish_date DATE,
  status VARCHAR(20) DEFAULT 'ok',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON dermo_product_usage(user_email);

CREATE TABLE IF NOT EXISTS dermo_user_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  medicine_name VARCHAR(255) NOT NULL,
  active_ingredient VARCHAR(255),
  atc_code VARCHAR(20),
  compatibility_result JSONB,
  started_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_user ON dermo_user_medications(user_email);

CREATE TABLE IF NOT EXISTS dermo_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES dermo_users(email) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  report_json JSONB,
  score_before INTEGER DEFAULT 0,
  score_after INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_report_unique ON dermo_weekly_reports(user_email, week_number, year);

CREATE TABLE IF NOT EXISTS dermo_kpi_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_user ON dermo_kpi_events(user_email);
CREATE INDEX IF NOT EXISTS idx_kpi_event ON dermo_kpi_events(event_name);
CREATE INDEX IF NOT EXISTS idx_kpi_created ON dermo_kpi_events(created_at);

COMMIT;
