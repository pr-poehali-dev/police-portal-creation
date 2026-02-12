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
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    token = event.get('headers', {}).get('X-Authorization', '').replace('Bearer ', '')
    
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
            cur.execute(
                """SELECT id, email, full_name, rank, badge_number, department, role, is_active, created_at
                   FROM users WHERE is_active = false ORDER BY created_at DESC"""
            )
        elif status == 'active':
            cur.execute(
                """SELECT id, email, full_name, rank, badge_number, department, role, is_active, created_at
                   FROM users WHERE is_active = true ORDER BY full_name"""
            )
        else:
            cur.execute(
                """SELECT id, email, full_name, rank, badge_number, department, role, is_active, created_at
                   FROM users ORDER BY created_at DESC"""
            )
        
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
            cur.execute("UPDATE users SET is_active = true WHERE id = %s", (user_id,))
            conn.commit()
            return success_response({'message': 'User activated successfully'})
        
        elif action == 'deactivate':
            cur.execute("UPDATE users SET is_active = false WHERE id = %s", (user_id,))
            conn.commit()
            return success_response({'message': 'User deactivated successfully'})
        
        elif action == 'update':
            updates = []
            params = []
            
            if 'full_name' in body:
                updates.append("full_name = %s")
                params.append(body['full_name'])
            if 'rank' in body:
                updates.append("rank = %s")
                params.append(body['rank'])
            if 'badge_number' in body:
                updates.append("badge_number = %s")
                params.append(body['badge_number'])
            if 'department' in body:
                updates.append("department = %s")
                params.append(body['department'])
            if 'role' in body and body['role'] in ['user', 'moderator', 'admin', 'manager']:
                updates.append("role = %s")
                params.append(body['role'])
            
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
        cur.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        
        return success_response({'message': 'User deleted successfully'})
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
