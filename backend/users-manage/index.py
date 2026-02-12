import json
import os
import hashlib
import secrets
import bcrypt
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from security import sanitize_string, sanitize_email, sanitize_user_id, validate_password, validate_role

def hash_password(password: str) -> str:
    """Хеширование пароля с использованием bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def extract_token_from_cookie(cookies: str) -> str:
    """Извлечение токена из Cookie header"""
    if not cookies:
        return ''
    
    for cookie in cookies.split(';'):
        cookie = cookie.strip()
        if cookie.startswith('auth_token='):
            return cookie.split('=', 1)[1]
    return ''

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

def handler(event: dict, context) -> dict:
    """API для управления пользователями (только для admin и manager)"""
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
    
    if current_user['role'] not in ['admin', 'manager']:
        return error_response(403, 'Access denied. Admin or Manager role required.', origin)
    
    try:
        params = event.get('queryStringParameters') or {}
        resource = params.get('resource', 'users')
        
        if resource == 'logs':
            # Работа с логами активности
            request_context = event.get('requestContext', {})
            identity = request_context.get('identity', {})
            client_ip = identity.get('sourceIp', '0.0.0.0')
            
            if method == 'GET':
                return get_logs(event, current_user, origin)
            elif method == 'POST':
                return create_log(event, current_user, client_ip, origin)
            elif method == 'DELETE':
                return delete_logs(event, current_user, origin)
            else:
                return error_response(405, 'Method not allowed', origin)
        else:
            # Работа с пользователями
            if method == 'GET':
                return get_users(event, current_user, origin)
            elif method == 'POST':
                return update_user(event, current_user, origin)
            elif method == 'DELETE':
                return delete_user(event, current_user, origin)
            else:
                return error_response(405, 'Method not allowed', origin)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
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
               FROM users u
               JOIN sessions s ON u.id = s.user_id
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

def get_users(event: dict, current_user: dict, origin=None):
    """Получить список пользователей с фильтрацией"""
    params = event.get('queryStringParameters') or {}
    status = params.get('status', 'all')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if status == 'pending':
            query = """SELECT id, user_id, email, full_name, role, is_active, created_at
                   FROM users WHERE is_active = false ORDER BY created_at DESC"""
        elif status == 'active':
            query = """SELECT id, user_id, email, full_name, role, is_active, created_at
                   FROM users WHERE is_active = true ORDER BY user_id"""
        else:
            query = """SELECT id, user_id, email, full_name, role, is_active, created_at
                   FROM users ORDER BY created_at DESC"""
        
        cur.execute(query)
        users = cur.fetchall()
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(origin),
            'body': json.dumps({
                'users': [dict(u) for u in users],
                'total': len(users)
            }, default=str),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR get_users: {str(e)}")
        return error_response(500, str(e), origin)
    finally:
        cur.close()
        conn.close()

def update_user(event: dict, current_user: dict, origin=None):
    """Обновление пользователя (активация, блокировка, изменение данных)"""
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    user_id = body.get('user_id')
    
    if not user_id or not isinstance(user_id, int):
        return error_response(400, 'Valid user_id is required', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if action == 'activate':
            cur.execute("UPDATE users SET is_active = true WHERE id = %s", (user_id,))
            conn.commit()
            return success_response({'message': 'User activated successfully'}, origin)
        
        elif action == 'deactivate':
            if current_user['id'] == user_id:
                return error_response(403, 'You cannot deactivate yourself', origin)
            
            cur.execute("UPDATE users SET is_active = false WHERE id = %s", (user_id,))
            conn.commit()
            return success_response({'message': 'User deactivated successfully'}, origin)
        
        elif action == 'update':
            updates = []
            params = []
            
            try:
                if 'full_name' in body:
                    full_name = sanitize_string(body['full_name'], 100)
                    updates.append("full_name = %s")
                    params.append(full_name)
                
                if 'role' in body:
                    new_role = validate_role(body['role'])
                    
                    if current_user['role'] == 'manager' and new_role == 'manager':
                        return error_response(403, 'Managers cannot assign Manager role', origin)
                    
                    updates.append("role = %s")
                    params.append(new_role)
                
                if 'email' in body:
                    email = sanitize_email(body['email'])
                    
                    cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
                    if cur.fetchone():
                        return error_response(400, 'Email already exists', origin)
                    
                    updates.append("email = %s")
                    params.append(email)
                
                if 'new_user_id' in body:
                    new_user_id = sanitize_user_id(str(body['new_user_id']).strip())
                    
                    if not new_user_id:
                        return error_response(400, 'User ID cannot be empty', origin)
                    
                    if new_user_id.isdigit():
                        new_user_id = new_user_id.zfill(5)
                    
                    cur.execute("SELECT id FROM users WHERE user_id = %s AND id != %s", (new_user_id, user_id))
                    if cur.fetchone():
                        return error_response(400, 'User ID already exists', origin)
                    
                    updates.append("user_id = %s")
                    params.append(new_user_id)
                
                if 'password' in body:
                    password = validate_password(body['password'])
                    password_hash = hash_password(password)
                    updates.append("password_hash = %s")
                    params.append(password_hash)
                
            except ValueError as e:
                return error_response(400, str(e), origin)
            
            if updates:
                updates.append("updated_at = NOW()")
                params.append(user_id)
                query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
                cur.execute(query, params)
                conn.commit()
                return success_response({'message': 'User updated successfully'}, origin)
            else:
                return error_response(400, 'No fields to update', origin)
        
        else:
            return error_response(400, 'Invalid action', origin)
    
    except Exception as e:
        print(f"ERROR update_user: {str(e)}")
        return error_response(500, str(e), origin)
    finally:
        cur.close()
        conn.close()

def delete_user(event: dict, current_user: dict, origin=None):
    """Удаление пользователя (для admin и manager)"""
    if current_user['role'] not in ['admin', 'manager']:
        return error_response(403, 'Only admin or manager can delete users', origin)
    
    params = event.get('queryStringParameters') or {}
    user_id = params.get('user_id')
    
    if not user_id:
        return error_response(400, 'user_id is required', origin)
    
    try:
        user_id = int(user_id)
    except ValueError:
        return error_response(400, 'Invalid user_id format', origin)
    
    if current_user['id'] == user_id:
        return error_response(403, 'You cannot delete yourself', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        
        return success_response({'message': 'User deleted successfully'}, origin)
    except Exception as e:
        print(f"ERROR delete_user: {str(e)}")
        return error_response(500, str(e), origin)
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

def get_logs(event: dict, current_user: dict, origin=None):
    """Получить логи активности с фильтрацией и поиском"""
    params = event.get('queryStringParameters') or {}
    search = params.get('search', '').strip()
    action_type = params.get('action_type', '').strip()
    user_filter = params.get('user', '').strip()
    sort_by = params.get('sort_by', 'created_at')
    sort_order = params.get('sort_order', 'DESC')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT id, user_id, user_name, action_type, action_description, 
                   target_type, target_id, ip_address, created_at
            FROM t_p77465986_police_portal_creati.activity_logs
            WHERE created_at > NOW() - INTERVAL '72 hours'
        """
        query_params = []
        
        if search:
            query += " AND (action_description ILIKE %s OR user_name ILIKE %s)"
            query_params.extend([f'%{search}%', f'%{search}%'])
        
        if action_type:
            query += " AND action_type = %s"
            query_params.append(action_type)
        
        if user_filter:
            query += " AND user_name ILIKE %s"
            query_params.append(f'%{user_filter}%')
        
        allowed_sorts = ['created_at', 'user_name', 'action_type']
        if sort_by not in allowed_sorts:
            sort_by = 'created_at'
        if sort_order not in ['ASC', 'DESC']:
            sort_order = 'DESC'
        
        query += f" ORDER BY {sort_by} {sort_order} LIMIT 500"
        
        cur.execute(query, query_params)
        logs = cur.fetchall()
        
        cur.execute("""
            SELECT DISTINCT action_type 
            FROM t_p77465986_police_portal_creati.activity_logs
            WHERE created_at > NOW() - INTERVAL '72 hours'
            ORDER BY action_type
        """)
        action_types = [row['action_type'] for row in cur.fetchall()]
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(origin),
            'body': json.dumps({
                'logs': [dict(log) for log in logs],
                'action_types': action_types,
                'total': len(logs)
            }, default=str),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def create_log(event: dict, current_user: dict, client_ip: str, origin=None):
    """Создать запись в логе"""
    body = json.loads(event.get('body', '{}'))
    action_type = body.get('action_type', '').strip()
    action_description = body.get('action_description', '').strip()
    target_type = body.get('target_type')
    target_id = body.get('target_id')
    
    if not action_type or not action_description:
        return error_response(400, 'action_type and action_description are required', origin)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """INSERT INTO t_p77465986_police_portal_creati.activity_logs 
               (user_id, user_name, action_type, action_description, target_type, target_id, ip_address)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING id, created_at""",
            (current_user['id'], current_user['full_name'], action_type, action_description, 
             target_type, target_id, client_ip)
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

def delete_logs(event: dict, current_user: dict, origin=None):
    """Удалить логи (только для admin и manager)"""
    params = event.get('queryStringParameters') or {}
    log_id = params.get('log_id')
    delete_all = params.get('delete_all') == 'true'
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if delete_all:
            cur.execute("SELECT COUNT(*) as count FROM t_p77465986_police_portal_creati.activity_logs")
            count_before = cur.fetchone()['count']
            
            cur.execute("TRUNCATE TABLE t_p77465986_police_portal_creati.activity_logs RESTART IDENTITY")
            conn.commit()
            
            cur.execute(
                """INSERT INTO t_p77465986_police_portal_creati.activity_logs 
                   (user_id, user_name, action_type, action_description, ip_address)
                   VALUES (%s, %s, 'system', %s, '0.0.0.0')""",
                (current_user['id'], current_user['full_name'], 
                 f"Удалены все логи ({count_before} записей)")
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(origin),
                'body': json.dumps({'message': f'Deleted {count_before} logs', 'deleted': count_before}),
                'isBase64Encoded': False
            }
        
        elif log_id:
            cur.execute(
                "SELECT action_description FROM t_p77465986_police_portal_creati.activity_logs WHERE id = %s",
                (log_id,)
            )
            log_data = cur.fetchone()
            
            if not log_data:
                return error_response(404, 'Log not found', origin)
            
            cur.execute(
                "UPDATE t_p77465986_police_portal_creati.activity_logs SET action_description = '[УДАЛЕНО]' WHERE id = %s",
                (log_id,)
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(origin),
                'body': json.dumps({'message': 'Log deleted'}),
                'isBase64Encoded': False
            }
        
        else:
            return error_response(400, 'log_id or delete_all parameter required', origin)
    
    finally:
        cur.close()
        conn.close()