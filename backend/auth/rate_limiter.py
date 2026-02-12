"""
Простой in-memory rate limiter для защиты от brute-force
ВАЖНО: Это базовая защита. Для продакшена нужен Redis.
"""

from datetime import datetime, timedelta
from collections import defaultdict

# Хранилище попыток входа: {ip: [(timestamp, success), ...]}
login_attempts = defaultdict(list)

# Хранилище блокировок: {ip: timestamp_разблокировки}
blocked_ips = {}

MAX_ATTEMPTS = 5  # Максимум попыток
WINDOW_MINUTES = 15  # За какой период
BLOCK_MINUTES = 30  # На сколько блокировать

def clean_old_attempts(ip: str):
    """Удаляет старые попытки за пределами временного окна"""
    cutoff = datetime.now() - timedelta(minutes=WINDOW_MINUTES)
    login_attempts[ip] = [
        (ts, success) for ts, success in login_attempts[ip]
        if ts > cutoff
    ]

def is_blocked(ip: str) -> bool:
    """Проверяет, заблокирован ли IP"""
    if ip in blocked_ips:
        if datetime.now() < blocked_ips[ip]:
            return True
        else:
            # Время блокировки истекло
            del blocked_ips[ip]
            login_attempts[ip] = []
    return False

def record_attempt(ip: str, success: bool):
    """Записывает попытку входа"""
    clean_old_attempts(ip)
    login_attempts[ip].append((datetime.now(), success))
    
    # Проверяем количество неудачных попыток
    failed_attempts = [1 for ts, s in login_attempts[ip] if not s]
    
    if len(failed_attempts) >= MAX_ATTEMPTS:
        # Блокируем IP
        blocked_ips[ip] = datetime.now() + timedelta(minutes=BLOCK_MINUTES)
        print(f"SECURITY: IP {ip} blocked for {BLOCK_MINUTES} minutes after {MAX_ATTEMPTS} failed attempts")
        return True
    
    return False

def get_remaining_attempts(ip: str) -> int:
    """Возвращает количество оставшихся попыток"""
    clean_old_attempts(ip)
    failed = len([1 for ts, s in login_attempts[ip] if not s])
    return max(0, MAX_ATTEMPTS - failed)
