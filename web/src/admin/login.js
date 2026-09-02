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
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        // Lectura segura del cuerpo de la respuesta en formato texto
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
          // Mostrar mensaje devuelto por la API o el código de estado HTTP
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
