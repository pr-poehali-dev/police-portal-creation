-- Обновляем пароли для тестовых пользователей с SHA512 хешем
-- Пароль для всех: demo123
-- Salt: 8f3e5b4a1c7d9e2f
-- Hash (SHA512): bf3c74813802327e2f173fbb82784415568de7c718a095d42afc22408276bc2708b812e6581b54d7111f2bfa12c6d1bf3b68112bc1fd2d2754a3127ebb5668b1

UPDATE users 
SET password_hash = '8f3e5b4a1c7d9e2f$bf3c74813802327e2f173fbb82784415568de7c718a095d42afc22408276bc2708b812e6581b54d7111f2bfa12c6d1bf3b68112bc1fd2d2754a3127ebb5668b1'
WHERE email IN ('user@demo.ru', 'moderator@demo.ru', 'admin@demo.ru', 'manager@demo.ru');