-- Nartalis - FASE 2: Cuenta central Nartalis
-- Identidad central de usuario (Nartalis Account).
-- Exclusiva de Nartalis. Las futuras entidades del ecosistema se relacionarán con user_id -> nartalis_users.id.
-- No toca tablas existentes (dermo_*, ia_module_users, farma_*).

BEGIN;

CREATE TABLE IF NOT EXISTS nartalis_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT,
  primary_provider VARCHAR(20) NOT NULL DEFAULT 'email',
  google_id VARCHAR(255),
  apple_sub VARCHAR(255),
  password_hash VARCHAR(512),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  plan VARCHAR(20) NOT NULL DEFAULT 'FREE',
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nartalis_users_email ON nartalis_users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nartalis_users_google_id ON nartalis_users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_nartalis_users_apple_sub ON nartalis_users(apple_sub) WHERE apple_sub IS NOT NULL;

COMMIT;
