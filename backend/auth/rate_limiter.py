"""
Rate limiter на основе PostgreSQL — устойчив к перезапускам сервера
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

MAX_ATTEMPTS = 5
WINDOW_MINUTES = 15
BLOCK_MINUTES = 30


def get_db():
    return psycopg2.connect(os.environ.get('DATABASE_URL'), cursor_factory=RealDictCursor)


def is_blocked(ip: str) -> bool:
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM rate_limit_blocks WHERE ip_address = %s AND blocked_until <= NOW()",
            (ip,)
        )
        conn.commit()
        cur.execute(
            "SELECT 1 FROM rate_limit_blocks WHERE ip_address = %s AND blocked_until > NOW()",
            (ip,)
        )
        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()


def record_attempt(ip: str, success: bool):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO rate_limit_attempts (ip_address, success) VALUES (%s, %s)",
            (ip, success)
        )
        cur.execute(
            """DELETE FROM rate_limit_attempts
               WHERE ip_address = %s
               AND attempted_at < NOW() - INTERVAL '%s minutes'""",
            (ip, WINDOW_MINUTES)
        )
        if not success:
            cur.execute(
                """SELECT COUNT(*) as cnt FROM rate_limit_attempts
                   WHERE ip_address = %s AND success = FALSE
                   AND attempted_at > NOW() - INTERVAL '%s minutes'""",
                (ip, WINDOW_MINUTES)
            )
            row = cur.fetchone()
            if row and row['cnt'] >= MAX_ATTEMPTS:
                cur.execute(
                    """INSERT INTO rate_limit_blocks (ip_address, blocked_until)
                       VALUES (%s, NOW() + INTERVAL '%s minutes')
                       ON CONFLICT (ip_address) DO UPDATE
                       SET blocked_until = NOW() + INTERVAL '%s minutes'""",
                    (ip, BLOCK_MINUTES, BLOCK_MINUTES)
                )
                print(f"SECURITY: IP {ip} blocked for {BLOCK_MINUTES} minutes")
        conn.commit()
    finally:
        cur.close()
        conn.close()


def get_remaining_attempts(ip: str) -> int:
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT COUNT(*) as cnt FROM rate_limit_attempts
               WHERE ip_address = %s AND success = FALSE
               AND attempted_at > NOW() - INTERVAL '%s minutes'""",
            (ip, WINDOW_MINUTES)
        )
        row = cur.fetchone()
        failed = row['cnt'] if row else 0
        return max(0, MAX_ATTEMPTS - failed)
    finally:
        cur.close()
        conn.close()
