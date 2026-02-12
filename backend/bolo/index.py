import json
import os
import hashlib
import psycopg2
from datetime import datetime
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

def handler(event: dict, context) -> dict:
    '''API для управления ориентировками BOLO'''
    
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
    
    try:
        dsn = os.environ.get('DATABASE_URL')
        if not dsn:
            return {
                'statusCode': 500,
                'headers': get_cors_headers(origin),
                'body': json.dumps({'error': 'DATABASE_URL not configured'}),
                'isBase64Encoded': False
            }
        
        cookies = headers.get('Cookie', '') or headers.get('cookie', '') or headers.get('X-Cookie', '') or headers.get('x-cookie', '')
        token = extract_token_from_cookie(cookies)
        
        if not token:
            return {
                'statusCode': 401,
                'headers': get_cors_headers(origin),
                'body': json.dumps({'error': 'Unauthorized'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(dsn)
        cursor = conn.cursor()
        
        # Hash token and verify through sessions table
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        cursor.execute(
            """SELECT u.id, u.role FROM users u
               JOIN sessions s ON u.id = s.user_id
               WHERE s.token_hash = %s AND s.expires_at > NOW()""",
            (token_hash,)
        )
        user_data = cursor.fetchone()
        
        if not user_data:
            cursor.close()
            conn.close()
            return {
                'statusCode': 401,
                'headers': get_cors_headers(origin),
                'body': json.dumps({'error': 'Invalid token'}),
                'isBase64Encoded': False
            }
        
        user_id, role = user_data
        
        if method == 'GET':
            cursor.execute("""
                SELECT b.id, b.type, b.main_info, b.additional_info, b.is_armed, 
                       b.created_at, b.updated_at, u.full_name as created_by_name
                FROM bolo b
                LEFT JOIN users u ON b.created_by = u.id
                ORDER BY b.created_at DESC
            """)
            
            bolos = []
            for row in cursor.fetchall():
                bolos.append({
                    'id': row[0],
                    'type': row[1],
                    'mainInfo': row[2],
                    'additionalInfo': row[3],
                    'isArmed': row[4],
                    'createdAt': row[5].isoformat() if row[5] else None,
                    'updatedAt': row[6].isoformat() if row[6] else None,
                    'createdByName': row[7]
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(origin),
                'body': json.dumps(bolos),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            
            bolo_type = data.get('type')
            main_info = sanitize_string(data.get('mainInfo', '').strip(), 500)
            additional_info = sanitize_string(data.get('additionalInfo', '').strip(), 1000)
            is_armed = data.get('isArmed', False)
            
            if not bolo_type or bolo_type not in ['person', 'vehicle']:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(origin),
                    'body': json.dumps({'error': 'Invalid type'}),
                    'isBase64Encoded': False
                }
            
            if not main_info:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(origin),
                    'body': json.dumps({'error': 'Main info is required'}),
                    'isBase64Encoded': False
                }
            
            creator_id = user_id
            
            cursor.execute("""
                INSERT INTO bolo (type, main_info, additional_info, is_armed, created_by)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (bolo_type, main_info, additional_info or None, is_armed, creator_id))
            
            new_id, created_at = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 201,
                'headers': get_cors_headers(origin),
                'body': json.dumps({
                    'id': new_id,
                    'type': bolo_type,
                    'mainInfo': main_info,
                    'additionalInfo': additional_info,
                    'isArmed': is_armed,
                    'createdAt': created_at.isoformat()
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            data = json.loads(event.get('body', '{}'))
            bolo_id = data.get('id')
            
            if not bolo_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(origin),
                    'body': json.dumps({'error': 'BOLO ID is required'}),
                    'isBase64Encoded': False
                }
            
            bolo_type = data.get('type')
            main_info = sanitize_string(data.get('mainInfo', '').strip(), 500)
            additional_info = sanitize_string(data.get('additionalInfo', '').strip(), 1000)
            is_armed = data.get('isArmed', False)
            
            if bolo_type and bolo_type not in ['person', 'vehicle']:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(origin),
                    'body': json.dumps({'error': 'Invalid type'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("""
                UPDATE bolo 
                SET type = COALESCE(%s, type),
                    main_info = COALESCE(NULLIF(%s, ''), main_info),
                    additional_info = %s,
                    is_armed = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (bolo_type, main_info, additional_info or None, is_armed, bolo_id))
            
            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': get_cors_headers(origin),
                    'body': json.dumps({'error': 'BOLO not found'}),
                    'isBase64Encoded': False
                }
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {}) or {}
            bolo_id = params.get('id')
            
            if not bolo_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(origin),
                    'body': json.dumps({'error': 'BOLO ID is required'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("DELETE FROM bolo WHERE id = %s RETURNING id", (bolo_id,))
            
            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': get_cors_headers(origin),
                    'body': json.dumps({'error': 'BOLO not found'}),
                    'isBase64Encoded': False
                }
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        else:
            cursor.close()
            conn.close()
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        print(f"Error in BOLO handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }