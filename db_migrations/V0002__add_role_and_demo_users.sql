-- Добавляем колонку role в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Создаем тестовых пользователей с разными ролями
-- Пароль для всех: demo123

INSERT INTO users (email, password_hash, full_name, rank, badge_number, department, role) 
VALUES 
  -- Пользователь
  ('user@demo.ru', 
   'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec:8f3e5b4a1c7d9e2f', 
   'Петров Петр Петрович', 
   'Лейтенант', 
   '10001', 
   'Дежурная часть',
   'user'),
   
  -- Модератор
  ('moderator@demo.ru', 
   'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec:8f3e5b4a1c7d9e2f', 
   'Сидоров Сидор Сидорович', 
   'Старший лейтенант', 
   '10002', 
   'Отдел по работе с обращениями',
   'moderator'),
   
  -- Администратор
  ('admin@demo.ru', 
   'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec:8f3e5b4a1c7d9e2f', 
   'Иванов Иван Иванович', 
   'Капитан', 
   '10003', 
   'IT отдел',
   'admin'),
   
  -- Менеджер
  ('manager@demo.ru', 
   'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec:8f3e5b4a1c7d9e2f', 
   'Васильев Василий Васильевич', 
   'Майор', 
   '10004', 
   'Отдел управления',
   'manager')
ON CONFLICT (email) DO NOTHING;