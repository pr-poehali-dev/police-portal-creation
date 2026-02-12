-- Создание таблицы уведомлений
CREATE TABLE IF NOT EXISTS t_p77465986_police_portal_creati.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    related_crew_id INTEGER,
    related_bolo_id INTEGER
);

-- Индексы для быстрой выборки
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON t_p77465986_police_portal_creati.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON t_p77465986_police_portal_creati.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON t_p77465986_police_portal_creati.notifications(is_read);
