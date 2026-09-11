document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    window.location.href = '/admin/dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form') || document.getElementById('loginForm');
  const errorMsg = document.getElementById('error-msg') || document.getElementById('errorMsg');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (errorMsg) {
        errorMsg.style.display = 'none';
      }

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      try {
        const hostname = window.location.hostname;
        const partesHost = hostname.split('.');
        const subdominioActual = (partesHost.length > 1 && partesHost[0] !== 'localhost') ? partesHost[0] : 'demo';

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant': subdominioActual
          },
          body: JSON.stringify({ email, password })
        });

        let data = {};
        const textResponse = await response.text();
        if (textResponse) {
          try {
            data = JSON.parse(textResponse);
          } catch (jsonErr) {
            console.error('Respuesta no JSON recibida del servidor:', textResponse);
          }
        }

        if (response.ok) {
          if (data.token) {
            localStorage.setItem('adminToken', data.token);
          }
          window.location.href = '/admin/dashboard.html';
        } else {
          showError(data.message || `Error del servidor (${response.status})`);
        }
      } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        showError('Error de conexión con el servidor');
      }
    });
  }

  function showError(text) {
    if (errorMsg) {
      errorMsg.textContent = text;
      errorMsg.style.display = 'block';
    }
  }
});
