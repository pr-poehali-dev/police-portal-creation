-- Исправляем дублирующиеся user_id
-- test@police.ru должен стать 00005, а менеджер остаться 00001

UPDATE users SET user_id = '00005' WHERE email = 'test@police.ru';
UPDATE users SET user_id = '00001' WHERE email = 'manager@demo.ru';
UPDATE users SET user_id = '00002' WHERE email = 'admin@demo.ru';
UPDATE users SET user_id = '00003' WHERE email = 'moderator@demo.ru';
UPDATE users SET user_id = '00004' WHERE email = 'user@demo.ru';