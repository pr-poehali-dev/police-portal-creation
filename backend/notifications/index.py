import json
import os
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def get_cors_headers(origin=None):
    """Возвращает CORS headers с правильным Origin"""
    allowed_origin = origin if origin and (origin.endswith('.poehali.dev') or origin.startswith('http://localhost')) else 'https://app.poehali.dev'
    return {
        'Access-Control-Allow-Origin': allowed_origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, Cookie, X-Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json'
    }

def extract_token_from_cookie(cookies: str) -> str:
    """Извлечение токена из Cookie header"""
    if not cookies:
        return ''
    
    for cookie in cookies.split(';'):
        cookie = cookie.strip()
        if cookie.startswith('auth_token='):
            return cookie.split('=', 1)[1]
    return ''

def handler(event: dict, context) -> dict:
    """API для управления уведомлениями пользователя"""
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
    
    cookies = headers.get('Cookie', '') or headers.get('cookie', '') or headers.get('X-Cookie', '') or headers.get('x-cookie', '')
    token = extract_token_from_cookie(cookies)
    
    if not token:
        return error_response(401, 'Authentication required', origin)
    
    current_user = verify_token(token)
    if not current_user:
        return error_response(401, 'Invalid token', origin)
    
    try:
        if method == 'GET':
            return get_notifications(current_user, origin)
        elif method == 'POST':
            return create_notification(event, current_user, origin)
        elif method == 'PUT':
            return mark_as_read(event, current_user, origin)
        else:
            return error_response(405, 'Method not allowed', origin)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return error_response(500, str(e), origin)

def get_db_connection():
    """Создание подключения к БД"""
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def verify_token(token: str):
    """Проверка токена и получение данных пользователя"""
    if not token:
        return None
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        cur.execute(
            """SELECT u.id, u.email, u.full_name, u.role, u.is_active
               FROM t_p77465986_police_portal_creati.users u
               JOIN t_p77465986_police_portal_creati.sessions s ON u.id = s.user_id
               WHERE s.token_hash = %s AND s.expires_at > NOW()""",
            (token_hash,)
        )
        user = cur.fetchone()
        return dict(user) if user else None
    except Exception as e:
        print(f"ERROR verify_token: {str(e)}")
        return None
    finally:
        cur.close()
        conn.close()

def get_notifications(current_user: dict, origin=None):
    """Получить уведомления текущего пользователя"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """SELECT id, message, type, is_read, created_at, related_crew_id, related_bolo_id
               FROM t_p77465986_police_portal_creati.notifications
               WHERE user_id = %s
               ORDER BY created_at DESC
               LIMIT 50""",
            (current_user['id'],)
        )
        notifications = cur.fetchall()
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(origin),
            'body': json.dumps({
                'notifications': [dict(n) for n in notifications]
            }, default=str),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def create_notification(event: dict, current_user: dict, origin=None):
    """Создать уведомление для пользователя"""
    body = json.loads(event.get('body', '{}'))
    message = body.get('message', '').strip()
    notification_type = body.get('type', 'info')
    related_crew_id = body.get('related_crew_id')
    related_bolo_id = body.get('related_bolo_id')
    
    if not message:
        return error_response(400, 'Message is required', origin)
    
    if notification_type not in ['info', 'warning', 'error', 'success']:
        return error_response(400, 'Invalid notification type', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """INSERT INTO t_p77465986_police_portal_creati.notifications 
               (user_id, message, type, related_crew_id, related_bolo_id)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING id, created_at""",
            (current_user['id'], message, notification_type, related_crew_id, related_bolo_id)
        )
        result = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': get_cors_headers(origin),
            'body': json.dumps({
                'id': result['id'],
                'created_at': result['created_at'].isoformat()
            }),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def mark_as_read(event: dict, current_user: dict, origin=None):
    """Отметить уведомление как прочитанное"""
    body = json.loads(event.get('body', '{}'))
    notification_id = body.get('notification_id')
    
    if not notification_id:
        return error_response(400, 'notification_id is required', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """UPDATE t_p77465986_police_portal_creati.notifications
               SET is_read = true
               WHERE id = %s AND user_id = %s
               RETURNING id""",
            (notification_id, current_user['id'])
        )
        
        if cur.rowcount == 0:
            return error_response(404, 'Notification not found or access denied', origin)
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(origin),
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def error_response(status_code: int, message: str, origin=None):
    """Формирование ответа с ошибкой"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(origin),
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }
