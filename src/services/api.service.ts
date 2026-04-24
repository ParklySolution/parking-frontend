// frontend/src/services/api.service.ts
import { supabase } from "@/services/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Helper per ottenere il token di autenticazione
async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Helper per fare richieste autenticate
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  
  const response = await fetch(`${API_URL}/api/superadmin${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `Errore API: ${response.status}`);
  }
  
  return data;
}

// API Client
export const api = {
  // Profile
  getProfile: (userId: string) => request<{ success: boolean; profile: any }>(`/profile/${userId}`),
  getCurrentUser: () => request<{ success: boolean; user: any; profile: any }>(`/me`),
  
  // Tenant Admin
  createTenantAdmin: (tenantId: string, data: { full_name: string; email: string }) =>
    request(`/tenants/${tenantId}/create-tenant-admin`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};