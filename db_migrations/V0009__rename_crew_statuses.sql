-- Обновление статусов экипажей с новыми значениями
UPDATE crews SET status = 'available' WHERE status = 'active';
UPDATE crews SET status = 'busy' WHERE status = 'patrol';
UPDATE crews SET status = 'delay' WHERE status = 'responding';
UPDATE crews SET status = 'need_help' WHERE status = 'offline';