-- Добавляем поле is_active для активации аккаунтов
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Активируем всех существующих пользователей (включая тестовых)
UPDATE users SET is_active = true WHERE email LIKE '%demo.ru';

-- Добавляем индекс для быстрого поиска неактивных пользователей
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);