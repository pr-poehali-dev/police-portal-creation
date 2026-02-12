-- Обновляем пароли для тестовых пользователей с правильным форматом
-- Пароль для всех: demo123
-- Формат: salt$hash (SHA256)

UPDATE users 
SET password_hash = '8f3e5b4a1c7d9e2f$c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec'
WHERE email IN ('user@demo.ru', 'moderator@demo.ru', 'admin@demo.ru', 'manager@demo.ru');