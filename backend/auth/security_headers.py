"""
Security headers для всех API-ответов
"""

def get_security_headers(origin=None, cookie_value=None, clear_cookie=False):
    """Возвращает стандартные security headers для API"""
    allowed_origin = origin if origin and (origin.endswith('.poehali.dev') or origin.startswith('http://localhost')) else 'https://app.poehali.dev'
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowed_origin,
        'Access-Control-Allow-Credentials': 'true',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
    if cookie_value:
        headers['X-Set-Cookie'] = f'auth_token={cookie_value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000'
    elif clear_cookie:
        headers['X-Set-Cookie'] = 'auth_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
    return headers

def get_cors_headers(origin=None):
    """Возвращает CORS headers для OPTIONS"""
    allowed_origin = origin if origin and (origin.endswith('.poehali.dev') or origin.startswith('http://localhost')) else 'https://app.poehali.dev'
    return {
        'Access-Control-Allow-Origin': allowed_origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, Cookie, X-Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    }