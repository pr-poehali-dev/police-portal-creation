import html
import re

def sanitize_string(value: str, max_length: int = 500) -> str:
    """
    Санитизация строки от XSS-атак
    - Экранирует HTML-теги
    - Удаляет опасные символы
    - Ограничивает длину
    """
    if not isinstance(value, str):
        return ''
    
    value = value.strip()[:max_length]
    value = html.escape(value)
    value = re.sub(r'[<>{}]', '', value)
    
    return value

def sanitize_email(email: str) -> str:
    """Санитизация email-адреса"""
    email = email.strip().lower()[:254]
    
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise ValueError('Invalid email format')
    
    return sanitize_string(email, 254)

def sanitize_user_id(user_id: str) -> str:
    """Санитизация user_id (только цифры и буквы)"""
    user_id = user_id.strip()[:20]
    
    if not re.match(r'^[a-zA-Z0-9]+$', user_id):
        raise ValueError('User ID can only contain letters and numbers')
    
    return user_id

def validate_password(password: str) -> str:
    """Валидация пароля"""
    if len(password) < 6:
        raise ValueError('Password must be at least 6 characters')
    if len(password) > 128:
        raise ValueError('Password is too long')
    return password

def validate_role(role: str) -> str:
    """Валидация роли пользователя"""
    allowed_roles = ['user', 'moderator', 'admin', 'manager']
    if role not in allowed_roles:
        raise ValueError(f'Invalid role. Allowed: {", ".join(allowed_roles)}')
    return role
