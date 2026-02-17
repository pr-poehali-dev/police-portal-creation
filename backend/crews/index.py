import json
import os
import hashlib
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from security import sanitize_string

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

def extract_token(headers: dict) -> str:
    """Извлечение токена из Authorization header или Cookie"""
    auth_header = headers.get('Authorization', '') or headers.get('authorization', '') or \
                  headers.get('X-Authorization', '') or headers.get('x-authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    cookies = headers.get('Cookie', '') or headers.get('cookie', '') or \
              headers.get('X-Cookie', '') or headers.get('x-cookie', '')
    return extract_token_from_cookie(cookies)

def handler(event: dict, context) -> dict:
    """API для управления экипажами"""
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
    
    token = extract_token(headers)
    
    if not token:
        return error_response(401, 'Authentication required', origin)
    
    current_user = verify_token(token)
    if not current_user:
        return error_response(401, 'Invalid token', origin)
    
    try:
        if method == 'GET':
            return get_crews(event, current_user, origin)
        elif method == 'POST':
            return create_crew(event, current_user, origin)
        elif method == 'PUT':
            return update_crew(event, current_user, origin)
        elif method == 'DELETE':
            return delete_crew(event, current_user, origin)
        else:
            return error_response(405, 'Method not allowed', origin)
    except Exception as e:
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
            """SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.user_id
               FROM users u
               JOIN sessions s ON u.id = s.user_id
               WHERE s.token_hash = %s AND s.expires_at > NOW()""",
            (token_hash,)
        )
        user = cur.fetchone()
        return dict(user) if user else None
    finally:
        cur.close()
        conn.close()

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

def can_manage_crew(current_user: dict, crew_creator_id: int, crew_members: list) -> bool:
    """Проверка прав на управление экипажем"""
    if current_user['role'] in ['moderator', 'admin', 'manager']:
        return True
    
    if crew_creator_id == current_user['id']:
        return True
    
    if current_user['id'] in crew_members:
        return True
    
    return False

def get_crews(event: dict, current_user: dict, origin=None):
    """Получить список экипажей"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """SELECT c.id, c.callsign, c.location, c.status, c.creator_id, c.created_at, c.updated_at,
                      COALESCE(
                          json_agg(
                              json_build_object(
                                  'user_id', u.id,
                                  'user_id_str', u.user_id,
                                  'full_name', u.full_name,
                                  'email', u.email
                              )
                          ) FILTER (WHERE u.id IS NOT NULL),
                          '[]'::json
                      ) as members
               FROM crews c
               LEFT JOIN crew_members cm ON c.id = cm.crew_id
               LEFT JOIN users u ON cm.user_id = u.id
               GROUP BY c.id
               ORDER BY c.created_at DESC"""
        )
        crews = cur.fetchall()
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(origin),
            'body': json.dumps({
                'crews': [dict(crew) for crew in crews]
            }, default=str),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def create_crew(event: dict, current_user: dict, origin=None):
    """Создать новый экипаж"""
    body = json.loads(event.get('body', '{}'))
    callsign = sanitize_string(body.get('callsign', '').strip(), 50)
    location = sanitize_string(body.get('location', '').strip(), 200)
    second_member_id = body.get('second_member_id')
    
    if not callsign:
        return error_response(400, 'Callsign is required', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if second_member_id:
            cur.execute("SELECT id FROM crew_members WHERE user_id = %s", (second_member_id,))
            if cur.fetchone():
                return error_response(400, 'Selected user is already in a crew', origin)
        
        cur.execute("SELECT id FROM crew_members WHERE user_id = %s", (current_user['id'],))
        if cur.fetchone():
            return error_response(400, 'You are already in a crew', origin)
        
        cur.execute(
            """INSERT INTO crews (callsign, location, status, creator_id)
               VALUES (%s, %s, 'available', %s) RETURNING id""",
            (callsign, location, current_user['id'])
        )
        crew_id = cur.fetchone()['id']
        
        cur.execute(
            "INSERT INTO crew_members (crew_id, user_id) VALUES (%s, %s)",
            (crew_id, current_user['id'])
        )
        
        if second_member_id:
            cur.execute(
                "INSERT INTO crew_members (crew_id, user_id) VALUES (%s, %s)",
                (crew_id, second_member_id)
            )
        
        conn.commit()
        
        try:
            request_context = event.get('requestContext', {})
            client_ip = request_context.get('identity', {}).get('sourceIp', '0.0.0.0')
            write_log(current_user['id'], current_user['full_name'], 'CREW', 
                      f'Создан экипаж {callsign}', 'crew', crew_id, client_ip)
        except Exception as e:
            print(f"Log error: {e}")
        
        return success_response({'message': 'Crew created successfully', 'crew_id': crew_id}, origin)
    finally:
        cur.close()
        conn.close()

def update_crew(event: dict, current_user: dict, origin=None):
    """Обновить экипаж"""
    body = json.loads(event.get('body', '{}'))
    crew_id = body.get('crew_id')
    action = body.get('action')
    
    if not crew_id:
        return error_response(400, 'crew_id is required', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """SELECT c.creator_id, ARRAY_AGG(cm.user_id) as member_ids
               FROM crews c
               LEFT JOIN crew_members cm ON c.id = cm.crew_id
               WHERE c.id = %s
               GROUP BY c.id, c.creator_id""",
            (crew_id,)
        )
        crew_data = cur.fetchone()
        
        if not crew_data:
            return error_response(404, 'Crew not found', origin)
        
        if not can_manage_crew(current_user, crew_data['creator_id'], crew_data['member_ids'] or []):
            return error_response(403, 'Access denied', origin)
        
        if action == 'update_status':
            new_status = body.get('status')
            if new_status not in ['available', 'busy', 'delay', 'need_help']:
                return error_response(400, 'Invalid status', origin)
            
            cur.execute("SELECT callsign FROM crews WHERE id = %s", (crew_id,))
            crew_info = cur.fetchone()
            crew_name = crew_info['callsign'] if crew_info else 'Unknown'
            
            status_labels = {'available': 'Доступен', 'busy': 'Занят', 'delay': 'Задержка', 'need_help': 'Требуется поддержка'}
            
            cur.execute(
                "UPDATE crews SET status = %s, updated_at = NOW() WHERE id = %s",
                (new_status, crew_id)
            )
            conn.commit()
            
            try:
                request_context = event.get('requestContext', {})
                client_ip = request_context.get('identity', {}).get('sourceIp', '0.0.0.0')
                write_log(current_user['id'], current_user['full_name'], 'CREW', 
                          f'Экипаж {crew_name} изменил статус на \'{status_labels.get(new_status, new_status)}\'', 
                          'crew', crew_id, client_ip)
            except Exception as e:
                print(f"Log error: {e}")
            
            return success_response({'message': 'Status updated successfully'}, origin)
        
        elif action == 'update_location':
            new_location = sanitize_string(body.get('location', '').strip(), 200)
            cur.execute(
                "UPDATE crews SET location = %s, updated_at = NOW() WHERE id = %s",
                (new_location, crew_id)
            )
            conn.commit()
            return success_response({'message': 'Location updated successfully'}, origin)
        
        else:
            return error_response(400, 'Invalid action', origin)
    
    finally:
        cur.close()
        conn.close()

def delete_crew(event: dict, current_user: dict, origin=None):
    """Удалить экипаж"""
    params = event.get('queryStringParameters') or {}
    crew_id = params.get('crew_id')
    
    if not crew_id:
        return error_response(400, 'crew_id is required', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """SELECT c.creator_id, ARRAY_AGG(cm.user_id) as member_ids
               FROM crews c
               LEFT JOIN crew_members cm ON c.id = cm.crew_id
               WHERE c.id = %s
               GROUP BY c.id, c.creator_id""",
            (crew_id,)
        )
        crew_data = cur.fetchone()
        
        if not crew_data:
            return error_response(404, 'Crew not found', origin)
        
        if not can_manage_crew(current_user, crew_data['creator_id'], crew_data['member_ids'] or []):
            return error_response(403, 'Access denied', origin)
        
        cur.execute("SELECT callsign FROM crews WHERE id = %s", (crew_id,))
        crew_info = cur.fetchone()
        crew_name = crew_info['callsign'] if crew_info else 'Unknown'
        
        cur.execute("DELETE FROM crew_members WHERE crew_id = %s", (crew_id,))
        cur.execute("DELETE FROM crews WHERE id = %s", (crew_id,))
        conn.commit()
        
        try:
            request_context = event.get('requestContext', {})
            client_ip = request_context.get('identity', {}).get('sourceIp', '0.0.0.0')
            write_log(current_user['id'], current_user['full_name'], 'CREW', 
                      f'Удалён экипаж {crew_name}', 'crew', int(crew_id), client_ip)
        except Exception as e:
            print(f"Log error: {e}")
        
        return success_response({'message': 'Crew deleted successfully'}, origin)
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

def success_response(data: dict, origin=None):
    """Формирование успешного ответа"""
    return {
        'statusCode': 200,
        'headers': get_cors_headers(origin),
        'body': json.dumps(data),
        'isBase64Encoded': False
    }