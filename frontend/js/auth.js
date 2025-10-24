const API_BASE = 'http://localhost:5000/api';

function showAlert(elementId, message, type = 'danger') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('d-none', 'alert-danger', 'alert-success');
  el.classList.add(`alert-${type}`);
}

function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('d-none');
}

const token = localStorage.getItem('token');

if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('loginError');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        return showAlert('loginError', error.message || 'Login failed.');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error(error);
      showAlert('loginError', 'Unable to login. Please try again.');
    }
  });
}

if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('registerError');
    hideAlert('registerSuccess');
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        return showAlert('registerError', data.message || 'Registration failed.');
      }

      showAlert('registerSuccess', 'Registration successful! You can login now.', 'success');
      document.getElementById('registerForm').reset();
    } catch (error) {
      console.error(error);
      showAlert('registerError', 'Unable to register. Please try again.');
    }
  });
}

if (!token && window.location.pathname.includes('dashboard')) {
  window.location.href = 'index.html';
}
