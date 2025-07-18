// Backend server URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003/api';

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// Authentication API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  verifyToken: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// NPS API
export const npsAPI = {
  getTimeSeriesData: async (dateRange?: any, frequency?: string) => {
    const params = new URLSearchParams();
    if (dateRange) params.append('dateRange', JSON.stringify(dateRange));
    if (frequency) params.append('frequency', frequency);
    
    const response = await fetch(`${API_BASE_URL}/nps/time-series?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getSummaryMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/nps/summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getDetailedData: async (dateRange?: any, source?: string) => {
    const params = new URLSearchParams();
    if (dateRange) params.append('dateRange', JSON.stringify(dateRange));
    if (source) params.append('source', source);
    
    const response = await fetch(`${API_BASE_URL}/nps/detailed?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },


};

// Survey API
export const surveyAPI = {
  getAllSurveys: async () => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getSurveyById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getExperienceMetrics: async (dateRange?: any, surveyId?: string) => {
    const params = new URLSearchParams();
    if (dateRange) params.append('dateRange', JSON.stringify(dateRange));
    if (surveyId) params.append('surveyId', surveyId);
    
    const response = await fetch(`${API_BASE_URL}/surveys/metrics/experience?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Error handling utility
export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
} 