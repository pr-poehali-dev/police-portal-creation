-- Создание таблицы логов действий пользователей
CREATE TABLE IF NOT EXISTS t_p77465986_police_portal_creati.activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрой выборки и фильтрации
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON t_p77465986_police_portal_creati.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON t_p77465986_police_portal_creati.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON t_p77465986_police_portal_creati.activity_logs(action_type);
