-- Создание таблицы экипажей
CREATE TABLE IF NOT EXISTS crews (
    id SERIAL PRIMARY KEY,
    callsign VARCHAR(50) NOT NULL,
    location TEXT,
    status VARCHAR(20) DEFAULT 'active',
    creator_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Создание таблицы участников экипажей
CREATE TABLE IF NOT EXISTS crew_members (
    id SERIAL PRIMARY KEY,
    crew_id INTEGER NOT NULL REFERENCES crews(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(crew_id, user_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_crews_creator ON crews(creator_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);

-- Ограничение: пользователь может быть только в одном экипаже
CREATE UNIQUE INDEX IF NOT EXISTS idx_crew_members_single_crew ON crew_members(user_id);