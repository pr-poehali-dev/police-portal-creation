import html
import re

def sanitize_string(value: str, max_length: int = 500) -> str:
    """
    Санитизация строки от XSS-атак
    """
    if not isinstance(value, str):
        return ''
    
    value = value.strip()[:max_length]
    value = html.escape(value)
    value = re.sub(r'[<>{}]', '', value)
    
    return value
