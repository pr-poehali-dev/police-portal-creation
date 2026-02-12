-- Разблокировка менеджера
UPDATE users SET is_active = true WHERE email = 'manager@demo.ru';