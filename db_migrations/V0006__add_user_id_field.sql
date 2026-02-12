-- Добавляем колонку user_id для 5-значного ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id VARCHAR(5) UNIQUE;

-- Создаем последовательность для генерации ID начиная с 1
CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 1;

-- Обновляем существующих пользователей ID-ами
UPDATE users 
SET user_id = LPAD(id::text, 5, '0')
WHERE user_id IS NULL;

-- Создаем индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);