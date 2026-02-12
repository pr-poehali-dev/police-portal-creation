import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для регистрации и авторизации пользователей"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'register':
            return handle_register(body)
        elif action == 'login':
            return handle_login(body)
        elif action == 'verify':
            headers = event.get('headers', {})
            token = headers.get('Authorization', '') or headers.get('authorization', '') or headers.get('X-Authorization', '') or headers.get('x-authorization', '')
            token = token.replace('Bearer ', '').replace('bearer ', '')
            return handle_verify(token)
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid action'}),
                'isBase64Encoded': False
            }
    except Exception as e:
        print(f"ERROR handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def get_db_connection():
    """Создание подключения к БД"""
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    """Хеширование пароля с солью"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha512((password + salt).encode()).hexdigest()
    return f"{salt}${pwd_hash}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Проверка пароля"""
    try:
        salt, pwd_hash = stored_hash.split('$')
        computed_hash = hashlib.sha512((password + salt).encode()).hexdigest()
        return computed_hash == pwd_hash
    except Exception as e:
        return False

def generate_token() -> str:
    """Генерация JWT-подобного токена"""
    return secrets.token_urlsafe(32)

def handle_register(body: dict) -> dict:
    """Регистрация нового пользователя"""
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    full_name = body.get('full_name', '').strip()
    
    if not email or not password or not full_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email, password and full_name are required'}),
            'isBase64Encoded': False
        }
    
    if len(password) < 6:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Password must be at least 6 characters'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        email_escaped = email.replace("'", "''")
        cur.execute(f"SELECT id FROM users WHERE email = '{email_escaped}'")
        if cur.fetchone():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User already exists'}),
                'isBase64Encoded': False
            }
        
        password_hash = hash_password(password)
        full_name_escaped = full_name.replace("'", "''")
        password_hash_escaped = password_hash.replace("'", "''")
        
        cur.execute(
            f"""INSERT INTO users (email, password_hash, full_name)
               VALUES ('{email_escaped}', '{password_hash_escaped}', '{full_name_escaped}') RETURNING id, email, full_name"""
        )
        user = cur.fetchone()
        user_id_internal = user['id']
        
        generated_user_id = str(user_id_internal).zfill(5)
        cur.execute(
            f"UPDATE users SET user_id = '{generated_user_id}' WHERE id = {user_id_internal}"
        )
        conn.commit()
        
        user['user_id'] = generated_user_id
        
        token = generate_token()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = (datetime.now() + timedelta(days=30)).isoformat()
        
        cur.execute(
            f"INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ({user['id']}, '{token_hash}', '{expires_at}')"
        )
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'token': token,
                'user': dict(user)
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR handle_register: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def handle_login(body: dict) -> dict:
    """Авторизация пользователя"""
    login_input = body.get('email', '').strip()
    password = body.get('password', '')
    
    if not login_input or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email/ID and password are required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if login_input.isdigit() and len(login_input) <= 5:
            user_id = login_input.zfill(5)
            cur.execute(
                f"SELECT id, user_id, email, password_hash, full_name, role, is_active FROM users WHERE user_id = '{user_id}'"
            )
        else:
            email = login_input.lower().replace("'", "''")
            cur.execute(
                f"SELECT id, user_id, email, password_hash, full_name, role, is_active FROM users WHERE email = '{email}'"
            )
        
        user = cur.fetchone()
        
        if not user or not verify_password(password, user['password_hash']):
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid email or password'}),
                'isBase64Encoded': False
            }
        
        if not user.get('is_active', False):
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Account is not activated. Please wait for administrator approval.'}),
                'isBase64Encoded': False
            }
        
        token = generate_token()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = (datetime.now() + timedelta(days=30)).isoformat()
        
        cur.execute(
            f"INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ({user['id']}, '{token_hash}', '{expires_at}')"
        )
        conn.commit()
        
        user_data = dict(user)
        del user_data['password_hash']
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'token': token,
                'user': user_data
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR handle_login: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def handle_verify(token: str) -> dict:
    """Проверка токена и получение данных пользователя"""
    if not token:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Token required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        cur.execute(
            f"""SELECT u.id, u.user_id, u.email, u.full_name, u.role, u.is_active
               FROM users u
               JOIN sessions s ON u.id = s.user_id
               WHERE s.token_hash = '{token_hash}' AND s.expires_at > NOW()"""
        )
        user = cur.fetchone()
        
        if not user:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid or expired token'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'user': dict(user)}),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR handle_verify: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()