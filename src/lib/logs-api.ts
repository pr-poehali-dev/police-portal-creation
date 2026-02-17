import { auth } from './auth';

const LOGS_API_URL = 'https://functions.poehali.dev/348afac0-d112-4953-b5da-6eafc2cf5bec';

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action_type: string;
  action_description: string;
  target_type?: string;
  target_id?: number;
  ip_address?: string;
  created_at: string;
}

export interface LogsResponse {
  logs: ActivityLog[];
  action_types: string[];
  total: number;
}

export interface LogsParams {
  search?: string;
  action_type?: string;
  user?: string;
  sort_by?: 'created_at' | 'user_name' | 'action_type';
  sort_order?: 'ASC' | 'DESC';
}

export const logsApi = {
  async getLogs(params?: LogsParams): Promise<LogsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.set('resource', 'logs');

    if (params) {
      if (params.search) queryParams.set('search', params.search);
      if (params.action_type) queryParams.set('action_type', params.action_type);
      if (params.user) queryParams.set('user', params.user);
      if (params.sort_by) queryParams.set('sort_by', params.sort_by);
      if (params.sort_order) queryParams.set('sort_order', params.sort_order);
    }

    const response = await fetch(`${LOGS_API_URL}?${queryParams}`, {
      method: 'GET',
      headers: { ...auth.getAuthHeader() },
    });

    if (!response.ok) throw new Error('Failed to fetch logs');

    return response.json();
  },

  async createLog(log: {
    action_type: string;
    action_description: string;
    target_type?: string;
    target_id?: number;
  }): Promise<{ id: number; created_at: string }> {
    const queryParams = new URLSearchParams();
    queryParams.set('resource', 'logs');

    const response = await fetch(`${LOGS_API_URL}?${queryParams}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify(log),
    });

    if (!response.ok) throw new Error('Failed to create log');

    return response.json();
  },

  async deleteLog(logId: number): Promise<void> {
    const queryParams = new URLSearchParams();
    queryParams.set('resource', 'logs');
    queryParams.set('log_id', logId.toString());

    const response = await fetch(`${LOGS_API_URL}?${queryParams}`, {
      method: 'DELETE',
      headers: { ...auth.getAuthHeader() },
    });

    if (!response.ok) throw new Error('Failed to delete log');
  },

  async deleteAllLogs(): Promise<{ deleted: number }> {
    const queryParams = new URLSearchParams();
    queryParams.set('resource', 'logs');
    queryParams.set('delete_all', 'true');

    const response = await fetch(`${LOGS_API_URL}?${queryParams}`, {
      method: 'DELETE',
      headers: { ...auth.getAuthHeader() },
    });

    if (!response.ok) throw new Error('Failed to delete all logs');

    return response.json();
  },
};
