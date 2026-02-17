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
  token: string;
  user: User;
}

export const auth = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
  }, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register',
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const result = await response.json();
    localStorage.setItem('user', JSON.stringify(result.user));
    
    return result;
  },

  async login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'login',
        email,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    localStorage.setItem('user', JSON.stringify(result.user));
    
    return result;
  },

  async verify(): Promise<User | null> {
    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
        }
        return null;
      }

      const result = await response.json();
      localStorage.setItem('user', JSON.stringify(result.user));
      return result.user;
    } catch (error) {
      console.error('Verify error:', error);
      const storedUser = this.getStoredUser();
      return storedUser;
    }
  },

  async logout() {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/';
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
    return !!localStorage.getItem('user');
  },

  getToken(): string | null {
    return null;
  },

  async updateProfile(data: {
    full_name?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<{ user: User }> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update_profile',
        ...data,
      }),
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete_self',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Delete failed');
    }

    localStorage.removeItem('user');
    document.cookie = 'auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/';
  },
};