import json
import os
import hashlib
import secrets
import bcrypt
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from security import sanitize_string, sanitize_email, validate_password
from security_headers import get_security_headers, get_cors_headers
from rate_limiter import is_blocked, record_attempt, get_remaining_attempts

def handler(event: dict, context) -> dict:
    """API для регистрации и авторизации пользователей"""
    method = event.get('httpMethod', 'GET')
    headers = event.get('headers', {})
    origin = headers.get('Origin') or headers.get('origin')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': get_cors_headers(origin),
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        # Получаем IP клиента
        request_context = event.get('requestContext', {})
        identity = request_context.get('identity', {})
        client_ip = identity.get('sourceIp', '0.0.0.0')
        
        if action == 'register':
            return handle_register(body, client_ip, origin)
        elif action == 'login':
            return handle_login(body, client_ip, origin)
        elif action == 'verify':
            cookies = headers.get('Cookie', '') or headers.get('cookie', '') or headers.get('X-Cookie', '') or headers.get('x-cookie', '')
            print(f"DEBUG verify: cookies={cookies[:50] if cookies else 'EMPTY'}...")
            token = extract_token_from_cookie(cookies)
            print(f"DEBUG verify: extracted token={token[:20] if token else 'EMPTY'}...")
            return handle_verify(token, origin)
        elif action == 'update_profile':
            cookies = headers.get('Cookie', '') or headers.get('cookie', '') or headers.get('X-Cookie', '') or headers.get('x-cookie', '')
            token = extract_token_from_cookie(cookies)
            return handle_update_profile(body, token, origin)
        else:
            return {
                'statusCode': 400,
                'headers': get_security_headers(origin),
                'body': json.dumps({'error': 'Invalid action'}),
                'isBase64Encoded': False
            }
    except Exception as e:
        print(f"ERROR handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def get_db_connection():
    """Создание подключения к БД"""
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def write_log(user_id, user_name, action_type, action_description, target_type=None, target_id=None, ip_address='0.0.0.0'):
    """Записать лог активности в БД"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO t_p77465986_police_portal_creati.activity_logs 
               (user_id, user_name, action_type, action_description, target_type, target_id, ip_address)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (user_id, user_name, action_type, action_description, target_type, target_id, ip_address)
        )
        conn.commit()
    except Exception as e:
        print(f"ERROR write_log: {str(e)}")
    finally:
        cur.close()
        conn.close()

def hash_password(password: str) -> str:
    """Хеширование пароля с использованием bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(password: str, stored_hash: str) -> bool:
    """Проверка пароля с использованием bcrypt"""
    try:
        password_bytes = password.encode('utf-8')
        stored_hash_bytes = stored_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, stored_hash_bytes)
    except Exception as e:
        print(f"Password verification error: {str(e)}")
        return False

def generate_token() -> str:
    """Генерация JWT-подобного токена"""
    return secrets.token_urlsafe(32)

def extract_token_from_cookie(cookies: str) -> str:
    """Извлечение токена из Cookie header"""
    if not cookies:
        return ''
    
    for cookie in cookies.split(';'):
        cookie = cookie.strip()
        if cookie.startswith('auth_token='):
            return cookie.split('=', 1)[1]
    return ''

def handle_register(body: dict, client_ip: str = '0.0.0.0', origin=None) -> dict:
    """Регистрация нового пользователя"""
    try:
        email = sanitize_email(body.get('email', ''))
        password = validate_password(body.get('password', ''))
        full_name = sanitize_string(body.get('full_name', '').strip(), 100)
        
        if not email or not password or not full_name:
            return {
                'statusCode': 400,
                'headers': get_security_headers(origin),
                'body': json.dumps({'error': 'Email, password and full_name are required'}),
                'isBase64Encoded': False
            }
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return {
                'statusCode': 400,
                'headers': get_security_headers(origin),
                'body': json.dumps({'error': 'User already exists'}),
                'isBase64Encoded': False
            }
        
        password_hash = hash_password(password)
        
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id, email, full_name",
            (email, password_hash, full_name)
        )
        user = cur.fetchone()
        user_id_internal = user['id']
        
        generated_user_id = str(user_id_internal).zfill(5)
        cur.execute("UPDATE users SET user_id = %s WHERE id = %s", (generated_user_id, user_id_internal))
        conn.commit()
        
        user['user_id'] = generated_user_id
        
        token = generate_token()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = datetime.now() + timedelta(days=30)
        
        cur.execute(
            "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user['id'], token_hash, expires_at)
        )
        conn.commit()
        
        cookie_value = f"auth_token={token}; HttpOnly; Secure; SameSite=None; Max-Age=2592000; Path=/; Domain=.poehali.dev"
        
        response_headers = get_security_headers(origin)
        response_headers['X-Set-Cookie'] = cookie_value
        
        write_log(user['id'], full_name, 'AUTH', 
                  f'Зарегистрирован новый аккаунт: {full_name} ({email})', 'user', user['id'], client_ip)
        
        return {
            'statusCode': 201,
            'headers': response_headers,
            'body': json.dumps({
                'user': dict(user)
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR handle_register: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def handle_login(body: dict, client_ip: str = '0.0.0.0', origin=None) -> dict:
    """Авторизация пользователя с rate limiting"""
    login_input = body.get('email', '').strip()
    password = body.get('password', '')
    
    # Проверка rate limiting
    if is_blocked(client_ip):
        print(f"SECURITY: Blocked login attempt from IP: {client_ip}")
        return {
            'statusCode': 429,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': 'Too many failed attempts. Try again later.'}),
            'isBase64Encoded': False
        }
    
    if not login_input or not password:
        return {
            'statusCode': 400,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': 'Email/ID and password are required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if login_input.isdigit() and len(login_input) <= 5:
            user_id = login_input.zfill(5)
            cur.execute(
                "SELECT id, user_id, email, password_hash, full_name, role, is_active FROM users WHERE user_id = %s",
                (user_id,)
            )
        else:
            email = login_input.lower()
            cur.execute(
                "SELECT id, user_id, email, password_hash, full_name, role, is_active FROM users WHERE email = %s",
                (email,)
            )
        
        user = cur.fetchone()
        
        # Защита от timing attacks: всегда проверяем хеш, даже если пользователь не найден
        dummy_hash = hash_password('dummy_password_for_timing_protection')
        password_valid = verify_password(password, user['password_hash'] if user else dummy_hash)
        
        if not user or not password_valid:
            print(f"SECURITY: Failed login attempt for: {login_input} from IP: {client_ip}")
            record_attempt(client_ip, False)
            remaining = get_remaining_attempts(client_ip)
            return {
                'statusCode': 401,
                'headers': get_security_headers(origin),
                'body': json.dumps({
                    'error': 'Invalid email or password',
                    'remaining_attempts': remaining
                }),
                'isBase64Encoded': False
            }
        
        if not user.get('is_active', False):
            record_attempt(client_ip, False)
            return {
                'statusCode': 403,
                'headers': get_security_headers(),
                'body': json.dumps({'error': 'Account is not activated. Please wait for administrator approval.'}),
                'isBase64Encoded': False
            }
        
        # Успешная попытка входа
        record_attempt(client_ip, True)
        print(f"SECURITY: Successful login for: {login_input} from IP: {client_ip}")
        
        token = generate_token()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = datetime.now() + timedelta(days=30)
        
        cur.execute(
            "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user['id'], token_hash, expires_at)
        )
        conn.commit()
        
        user_data = dict(user)
        user_data.pop('password_hash', None)
        
        cookie_value = f"auth_token={token}; HttpOnly; Secure; SameSite=None; Max-Age=2592000; Path=/; Domain=.poehali.dev"
        headers = get_security_headers(origin)
        headers['X-Set-Cookie'] = cookie_value
        
        write_log(user['id'], user['full_name'], 'AUTH', 
                  f'Вход в систему: {user["full_name"]}', 'user', user['id'], client_ip)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'user': user_data
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR handle_login: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def handle_verify(token: str, origin=None) -> dict:
    """Проверка токена и получение данных пользователя"""
    print(f"DEBUG handle_verify: token={token[:20] if token else 'EMPTY'}...")
    if not token:
        print("DEBUG handle_verify: NO TOKEN - returning 401")
        return {
            'statusCode': 401,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': 'Token required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        cur.execute(
            """SELECT u.id, u.user_id, u.email, u.full_name, u.role, u.is_active
               FROM users u
               JOIN sessions s ON u.id = s.user_id
               WHERE s.token_hash = %s AND s.expires_at > NOW()""",
            (token_hash,)
        )
        user = cur.fetchone()
        print(f"DEBUG handle_verify: user found={user is not None}")
        
        if not user:
            print(f"DEBUG handle_verify: NO USER for token_hash={token_hash[:20]}...")
            return {
                'statusCode': 401,
                'headers': get_security_headers(origin),
                'body': json.dumps({'error': 'Invalid or expired token'}),
                'isBase64Encoded': False
            }
        
        print(f"DEBUG handle_verify: SUCCESS - returning user")
        return {
            'statusCode': 200,
            'headers': get_security_headers(origin),
            'body': json.dumps({'user': dict(user)}),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR handle_verify: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def handle_update_profile(body: dict, token: str, origin=None) -> dict:
    """Обновление профиля пользователя"""
    if not token:
        return {
            'statusCode': 401,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': 'Token required'}),
            'isBase64Encoded': False
        }
    
    try:
        full_name = sanitize_string(body.get('full_name', '').strip(), 100) if body.get('full_name') else None
        current_password = body.get('current_password', '')
        new_password = validate_password(body.get('new_password', '')) if body.get('new_password') else None
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        cur.execute(
            """SELECT u.id, u.user_id, u.email, u.full_name, u.role, u.password_hash, u.last_name_change
               FROM users u
               JOIN sessions s ON u.id = s.user_id
               WHERE s.token_hash = %s AND s.expires_at > NOW()""",
            (token_hash,)
        )
        user = cur.fetchone()
        
        if not user:
            return {
                'statusCode': 401,
                'headers': get_security_headers(origin),
                'body': json.dumps({'error': 'Invalid or expired token'}),
                'isBase64Encoded': False
            }
        
        user_id = user['id']
        updates = []
        params = []
        
        if full_name:
            # Проверка ограничения на смену имени (только для обычных пользователей)
            if user['role'] not in ['moderator', 'admin', 'manager']:
                if user['last_name_change']:
                    cur.execute(
                        "SELECT EXTRACT(EPOCH FROM (NOW() - %s)) / 3600 as hours_passed",
                        (user['last_name_change'],)
                    )
                    result = cur.fetchone()
                    hours_passed = result['hours_passed'] if result else 999
                    
                    if hours_passed < 6:
                        remaining_hours = 6 - hours_passed
                        remaining_minutes = int(remaining_hours * 60)
                        return {
                            'statusCode': 400,
                            'headers': get_security_headers(origin),
                            'body': json.dumps({
                                'error': f'Вы сможете изменить имя через {remaining_minutes} минут'
                            }),
                            'isBase64Encoded': False
                        }
            
            updates.append("full_name = %s")
            params.append(full_name)
            updates.append("last_name_change = NOW()")
        
        
        if current_password and new_password:
            if not verify_password(current_password, user['password_hash']):
                return {
                    'statusCode': 400,
                    'headers': get_security_headers(origin),
                    'body': json.dumps({'error': 'Неверный текущий пароль'}),
                    'isBase64Encoded': False
                }
            
            password_hash = hash_password(new_password)
            updates.append("password_hash = %s")
            params.append(password_hash)
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': get_security_headers(origin),
                'body': json.dumps({'error': 'No fields to update'}),
                'isBase64Encoded': False
            }
        
        params.append(user_id)
        update_query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, user_id, email, full_name, role"
        cur.execute(update_query, params)
        updated_user = cur.fetchone()
        conn.commit()
        
        changed = []
        if full_name: changed.append('имя')
        if new_password: changed.append('пароль')
        write_log(user_id, updated_user['full_name'], 'PROFILE', 
                  f'Обновление профиля: {updated_user["full_name"]} ({", ".join(changed)})', 
                  'user', user_id)
        
        return {
            'statusCode': 200,
            'headers': get_security_headers(origin),
            'body': json.dumps({'user': dict(updated_user)}),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR handle_update_profile: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_security_headers(origin),
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()