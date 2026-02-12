-- Создание таблицы для ориентировок BOLO
CREATE TABLE IF NOT EXISTS bolo (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('person', 'vehicle')),
    main_info TEXT NOT NULL,
    additional_info TEXT,
    is_armed BOOLEAN DEFAULT FALSE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX idx_bolo_type ON bolo(type);
CREATE INDEX idx_bolo_created_at ON bolo(created_at DESC);