"""
Security headers для всех API-ответов
"""

def get_security_headers():
    """Возвращает стандартные security headers для API"""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }

def get_cors_headers():
    """Возвращает CORS headers для OPTIONS"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    }
