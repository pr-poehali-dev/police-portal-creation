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
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
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
            token = event.get('headers', {}).get('X-Authorization', '').replace('Bearer ', '')
            return handle_verify(token)
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid action'}),
                'isBase64Encoded': False
            }
    except Exception as e:
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
    rank = body.get('rank', '').strip()
    badge_number = body.get('badge_number', '').strip()
    department = body.get('department', '').strip()
    
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
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User already exists'}),
                'isBase64Encoded': False
            }
        
        password_hash = hash_password(password)
        
        cur.execute(
            """INSERT INTO users (email, password_hash, full_name, rank, badge_number, department)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, email, full_name, rank, badge_number, department""",
            (email, password_hash, full_name, rank, badge_number, department)
        )
        user = cur.fetchone()
        conn.commit()
        
        token = generate_token()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = datetime.now() + timedelta(days=30)
        
        cur.execute(
            "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user['id'], token_hash, expires_at)
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
    finally:
        cur.close()
        conn.close()

def handle_login(body: dict) -> dict:
    """Авторизация пользователя"""
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    
    if not email or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email and password are required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT id, email, password_hash, full_name, rank, badge_number, department, role, is_active FROM users WHERE email = %s",
            (email,)
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
        expires_at = datetime.now() + timedelta(days=30)
        
        cur.execute(
            "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user['id'], token_hash, expires_at)
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
            """SELECT u.id, u.email, u.full_name, u.rank, u.badge_number, u.department, u.role, u.is_active
               FROM users u
               JOIN sessions s ON u.id = s.user_id
               WHERE s.token_hash = %s AND s.expires_at > NOW()""",
            (token_hash,)
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
    finally:
        cur.close()
        conn.close()