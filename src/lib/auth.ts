const AUTH_API_URL = 'https://functions.poehali.dev/7f5283a8-d73f-4630-82d9-49a08c177e47';

export interface User {
  id: number;
  user_id?: string;
  email: string;
  full_name: string;
  role?: string;
  is_active?: boolean;
}

export interface AuthResponse {
  token?: string;
  user: User;
}

const getToken = (): string | null =>
  sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');

const saveToken = (token: string) => {
  sessionStorage.setItem('auth_token', token);
  localStorage.setItem('auth_token', token);
};

const clearToken = () => {
  sessionStorage.removeItem('auth_token');
  localStorage.removeItem('auth_token');
};

const getAuthHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const auth = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
  }, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const result = await response.json();
    if (result.token) saveToken(result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
  },

  async login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    if (result.token) saveToken(result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
  },

  async verify(): Promise<User | null> {
    try {
      const token = getToken();
      if (!token) return null;

      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action: 'verify' }),
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      localStorage.setItem('user', JSON.stringify(result.user));
      return result.user;
    } catch (error) {
      console.error('Verify error:', error);
      return this.getStoredUser();
    }
  },

  logout() {
    clearToken();
    localStorage.removeItem('user');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },

  async updateProfile(data: {
    full_name?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<{ user: User }> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action: 'update_profile', ...data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Update failed');
    }

    const result = await response.json();
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
  },

  async deleteSelf(): Promise<void> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action: 'delete_self' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Delete failed');
    }

    this.logout();
  },
};