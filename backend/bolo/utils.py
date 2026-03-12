import os
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor
import json

ALLOWED_ORIGINS = {
    'https://police-portal-creation.poehali.dev',
    'https://preview--police-portal-creation.poehali.dev',
    'http://localhost:5173',
    'http://localhost:3000',
}


def get_cors_headers(origin=None):
    allowed = origin if origin and origin in ALLOWED_ORIGINS else 'https://police-portal-creation.poehali.dev'
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, Cookie, X-Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def extract_token(headers: dict) -> str:
    auth_header = (headers.get('Authorization', '') or headers.get('authorization', '') or
                   headers.get('X-Authorization', '') or headers.get('x-authorization', ''))
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    cookies = (headers.get('Cookie', '') or headers.get('cookie', '') or
               headers.get('X-Cookie', '') or headers.get('x-cookie', ''))
    for part in cookies.split(';'):
        part = part.strip()
        if part.startswith('auth_token='):
            return part.split('=', 1)[1]
    return ''


def get_db_connection(cursor_factory=RealDictCursor):
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=cursor_factory)


def verify_token(token: str):
    if not token:
        return None
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        cur.execute(
            "SELECT u.id, u.email, u.full_name, u.role, u.is_active FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token_hash = %s AND s.expires_at > NOW()",
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


def write_log(user_id, user_name, action_type, action_description, target_type=None, target_id=None, ip_address='0.0.0.0'):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO activity_logs (user_id, user_name, action_type, action_description, target_type, target_id, ip_address) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (user_id, user_name, action_type, action_description, target_type, target_id, ip_address)
        )
        conn.commit()
    except Exception as e:
        print(f"ERROR write_log: {str(e)}")
    finally:
        cur.close()
        conn.close()


def error_response(status_code: int, message: str, origin=None):
    return {'statusCode': status_code, 'headers': get_cors_headers(origin), 'body': json.dumps({'error': message}), 'isBase64Encoded': False}


def success_response(data: dict, origin=None):
    return {'statusCode': 200, 'headers': get_cors_headers(origin), 'body': json.dumps(data), 'isBase64Encoded': False}
