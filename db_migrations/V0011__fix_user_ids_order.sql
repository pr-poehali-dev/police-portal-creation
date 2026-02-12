-- Исправление порядка user_id для демо-пользователей
-- Чтобы ID соответствовали логике: manager=00001, admin=00002, moderator=00003, user=00004

UPDATE users SET user_id = '00001' WHERE email = 'manager@demo.ru';
UPDATE users SET user_id = '00002' WHERE email = 'admin@demo.ru';
UPDATE users SET user_id = '00003' WHERE email = 'moderator@demo.ru';
UPDATE users SET user_id = '00004' WHERE email = 'user@demo.ru';
UPDATE users SET user_id = '00005' WHERE email = 'test@police.ru';