import { auth } from './auth';

const BOLO_API_URL = 'https://functions.poehali.dev/24bef935-864e-4498-ae86-abd74ff7bb01';

export interface Bolo {
  id: number;
  type: 'person' | 'vehicle';
  mainInfo: string;
  additionalInfo?: string;
  isArmed: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export const boloApi = {
  async getAll(): Promise<Bolo[]> {
    const response = await fetch(BOLO_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(error.error || 'Failed to fetch BOLOs');
    }

    return response.json();
  },

  async create(data: Omit<Bolo, 'id' | 'createdAt' | 'updatedAt' | 'createdByName'>): Promise<Bolo> {
    const response = await fetch(BOLO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create BOLO');
    }

    return response.json();
  },

  async update(id: number, data: Partial<Omit<Bolo, 'id' | 'createdAt' | 'updatedAt' | 'createdByName'>>): Promise<void> {
    const response = await fetch(BOLO_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify({ id, ...data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update BOLO');
    }
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${BOLO_API_URL}?id=${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete BOLO');
    }
  },
};
