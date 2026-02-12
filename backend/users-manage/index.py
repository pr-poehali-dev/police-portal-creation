import json
import os
import hashlib
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для управления пользователями (только для admin и manager)"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    token = headers.get('Authorization', '') or headers.get('authorization', '') or headers.get('X-Authorization', '') or headers.get('x-authorization', '')
    token = token.replace('Bearer ', '').replace('bearer ', '')
    
    if not token:
        print(f"DEBUG: No token found. Headers: {list(headers.keys())}")
        return error_response(401, 'Authentication required')
    
    current_user = verify_token(token)
    if not current_user:
        print(f"DEBUG: Token verification failed for token: {token[:10]}...")
        return error_response(401, 'Invalid token')
    
    print(f"DEBUG: User {current_user.get('email')} with role {current_user.get('role')}")
    
    if current_user['role'] not in ['admin', 'manager']:
        return error_response(403, 'Access denied. Admin or Manager role required.')
    
    try:
        if method == 'GET':
            return get_users(event, current_user)
        elif method == 'POST':
            return update_user(event, current_user)
        elif method == 'DELETE':
            return delete_user(event, current_user)
        else:
            return error_response(405, 'Method not allowed')
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return error_response(500, str(e))

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
        
        query = f"""SELECT u.id, u.email, u.full_name, u.role, u.is_active
               FROM users u
               JOIN sessions s ON u.id = s.user_id
               WHERE s.token_hash = '{token_hash}' AND s.expires_at > NOW()"""
        
        cur.execute(query)
        user = cur.fetchone()
        return dict(user) if user else None
    except Exception as e:
        print(f"ERROR verify_token: {str(e)}")
        return None
    finally:
        cur.close()
        conn.close()

def get_users(event: dict, current_user: dict):
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
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'users': [dict(u) for u in users],
                'total': len(users)
            }, default=str),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f"ERROR get_users: {str(e)}")
        return error_response(500, str(e))
    finally:
        cur.close()
        conn.close()

def update_user(event: dict, current_user: dict):
    """Обновление пользователя (активация, блокировка, изменение данных)"""
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    user_id = body.get('user_id')
    
    if not user_id:
        return error_response(400, 'user_id is required')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if action == 'activate':
            query = f"UPDATE users SET is_active = true WHERE id = {user_id}"
            cur.execute(query)
            conn.commit()
            return success_response({'message': 'User activated successfully'})
        
        elif action == 'deactivate':
            query = f"UPDATE users SET is_active = false WHERE id = {user_id}"
            cur.execute(query)
            conn.commit()
            return success_response({'message': 'User deactivated successfully'})
        
        elif action == 'update':
            updates = []
            
            if 'full_name' in body:
                full_name = body['full_name'].replace("'", "''")
                updates.append(f"full_name = '{full_name}'")
            if 'role' in body and body['role'] in ['user', 'moderator', 'admin', 'manager']:
                updates.append(f"role = '{body['role']}'")
            
            if updates:
                updates.append("updated_at = NOW()")
                query = f"UPDATE users SET {', '.join(updates)} WHERE id = {user_id}"
                cur.execute(query)
                conn.commit()
                return success_response({'message': 'User updated successfully'})
            else:
                return error_response(400, 'No fields to update')
        
        else:
            return error_response(400, 'Invalid action')
    
    except Exception as e:
        print(f"ERROR update_user: {str(e)}")
        return error_response(500, str(e))
    finally:
        cur.close()
        conn.close()

def delete_user(event: dict, current_user: dict):
    """Удаление пользователя (только для admin)"""
    if current_user['role'] != 'admin':
        return error_response(403, 'Only admin can delete users')
    
    params = event.get('queryStringParameters') or {}
    user_id = params.get('user_id')
    
    if not user_id:
        return error_response(400, 'user_id is required')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(f"DELETE FROM sessions WHERE user_id = {user_id}")
        cur.execute(f"DELETE FROM users WHERE id = {user_id}")
        conn.commit()
        
        return success_response({'message': 'User deleted successfully'})
    except Exception as e:
        print(f"ERROR delete_user: {str(e)}")
        return error_response(500, str(e))
    finally:
        cur.close()
        conn.close()

def error_response(status_code: int, message: str):
    """Формирование ответа с ошибкой"""
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }

def success_response(data: dict):
    """Формирование успешного ответа"""
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(data),
        'isBase64Encoded': False
    }