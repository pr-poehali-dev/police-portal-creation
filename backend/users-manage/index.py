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
        return error_response(401, 'Authentication required')
    
    current_user = verify_token(token)
    if not current_user:
        return error_response(401, 'Invalid token')
    
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
    
    if not user_id or not isinstance(user_id, int):
        return error_response(400, 'Valid user_id is required')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if action == 'activate':
            cur.execute("UPDATE users SET is_active = true WHERE id = %s", (user_id,))
            conn.commit()
            return success_response({'message': 'User activated successfully'})
        
        elif action == 'deactivate':
            if current_user['id'] == user_id:
                return error_response(403, 'You cannot deactivate yourself')
            
            cur.execute("UPDATE users SET is_active = false WHERE id = %s", (user_id,))
            conn.commit()
            return success_response({'message': 'User deactivated successfully'})
        
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
                        return error_response(403, 'Managers cannot assign Manager role')
                    
                    updates.append("role = %s")
                    params.append(new_role)
                
                if 'email' in body:
                    email = sanitize_email(body['email'])
                    
                    cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
                    if cur.fetchone():
                        return error_response(400, 'Email already exists')
                    
                    updates.append("email = %s")
                    params.append(email)
                
                if 'new_user_id' in body:
                    new_user_id = sanitize_user_id(str(body['new_user_id']).strip())
                    
                    if not new_user_id:
                        return error_response(400, 'User ID cannot be empty')
                    
                    if new_user_id.isdigit():
                        new_user_id = new_user_id.zfill(5)
                    
                    cur.execute("SELECT id FROM users WHERE user_id = %s AND id != %s", (new_user_id, user_id))
                    if cur.fetchone():
                        return error_response(400, 'User ID already exists')
                    
                    updates.append("user_id = %s")
                    params.append(new_user_id)
                
                if 'password' in body:
                    password = validate_password(body['password'])
                    password_hash = hash_password(password)
                    updates.append("password_hash = %s")
                    params.append(password_hash)
                
            except ValueError as e:
                return error_response(400, str(e))
            
            if updates:
                updates.append("updated_at = NOW()")
                params.append(user_id)
                query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
                cur.execute(query, params)
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
    """Удаление пользователя (для admin и manager)"""
    if current_user['role'] not in ['admin', 'manager']:
        return error_response(403, 'Only admin or manager can delete users')
    
    params = event.get('queryStringParameters') or {}
    user_id = params.get('user_id')
    
    if not user_id:
        return error_response(400, 'user_id is required')
    
    try:
        user_id = int(user_id)
    except ValueError:
        return error_response(400, 'Invalid user_id format')
    
    if current_user['id'] == user_id:
        return error_response(403, 'You cannot delete yourself')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
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