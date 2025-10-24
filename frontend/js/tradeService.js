const API_URL = 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export async function fetchTrades() {
  const response = await fetch(`${API_URL}/trades`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
  if (!response.ok) throw new Error('Failed to load trades');
  return response.json();
}

export async function createTrade(trade) {
  const response = await fetch(`${API_URL}/trades`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(trade)
  });
  if (!response.ok) throw new Error('Failed to create trade');
  return response.json();
}

export async function deleteTrade(id) {
  const response = await fetch(`${API_URL}/trades/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
  if (!response.ok) throw new Error('Failed to delete trade');
  return response.json();
}

export async function importCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/trades/import/csv`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`
    },
    body: formData
  });

  if (!response.ok) throw new Error('Failed to import trades');
  return response.json();
}

export function requireAuth() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }
});
