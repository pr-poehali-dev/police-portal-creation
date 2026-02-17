-- Добавляем поле для отслеживания времени последнего изменения имени
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name_change TIMESTAMP DEFAULT NULL;