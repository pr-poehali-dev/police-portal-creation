import { auth } from './auth';

const CREWS_API_URL = 'https://functions.poehali.dev/f4f45aca-ba9d-4afa-b89b-d082668a4ee4';

export interface CrewMember {
  user_id: number;
  user_id_str: string;
  full_name: string;
  email: string;
}

export interface Crew {
  id: number;
  callsign: string;
  location: string;
  status: 'available' | 'busy' | 'delay' | 'need_help';
  creator_id: number;
  members: CrewMember[];
  created_at: string;
  updated_at: string;
}

export const crewsApi = {
  async getCrews(): Promise<Crew[]> {
    const response = await fetch(CREWS_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to fetch crews');
    }

    const result = await response.json();
    return result.crews || [];
  },

  async createCrew(data: {
    callsign: string;
    location?: string;
    second_member_id?: number;
  }): Promise<void> {
    const response = await fetch(CREWS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to create crew');
    }
  },

  async updateCrewStatus(crewId: number, status: string): Promise<void> {
    const response = await fetch(CREWS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify({ crew_id: crewId, action: 'update_status', status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update status');
    }
  },

  async updateCrewLocation(crewId: number, location: string): Promise<void> {
    const response = await fetch(CREWS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify({ crew_id: crewId, action: 'update_location', location }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update location');
    }
  },

  async deleteCrew(crewId: number): Promise<void> {
    const response = await fetch(`${CREWS_API_URL}?crew_id=${crewId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete crew');
    }
  },

  async getAvailableUsers(): Promise<{ id: number; user_id: string; full_name: string; email: string }[]> {
    const response = await fetch(`${CREWS_API_URL}?resource=online_users`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!response.ok) throw new Error('Failed to fetch online users');

    const data = await response.json();
    return data.users || [];
  },
};