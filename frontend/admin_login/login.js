// ============================================================
// login.js – BMC Booking admin auth + login page
// ============================================================

const ADMIN_AUTH_KEY = 'bmc_admin_auth';
const ADMIN_USER_KEY = 'bmc_admin_user';


function setAdminSession(username, keepSignedIn) {
  const storage = keepSignedIn ? localStorage : sessionStorage;
  storage.setItem(ADMIN_AUTH_KEY, 'true');
  storage.setItem(ADMIN_USER_KEY, username);
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(ADMIN_AUTH_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

function isAdminAuthenticated() {
  return (
    sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true' ||
    localStorage.getItem(ADMIN_AUTH_KEY) === 'true'
  );
}

window.clearAdminSession = clearAdminSession;
window.isAdminAuthenticated = isAdminAuthenticated;

const loginForm = document.getElementById('login-form');
if (loginForm) {

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const keepSignedIn = document.getElementById('keep-signed-in').checked;
    const errorMsg = document.getElementById('error-msg');
    const loginBtn = document.getElementById('btn-login');

    errorMsg.textContent = '';

    if (!username) {
      errorMsg.textContent = 'Please enter your username or email.';
      document.getElementById('username').focus();
      return;
    }

    if (!password) {
      errorMsg.textContent = 'Please enter your password.';
      document.getElementById('password').focus();
      return;
    }

    // Verify reCAPTCHA
    if (typeof grecaptcha !== 'undefined') {
      const recaptchaResponse = grecaptcha.getResponse();
      if (!recaptchaResponse) {
        errorMsg.textContent = 'Please complete the "I\'m not a robot" validation.';
        return;
      }
    } else {
      errorMsg.textContent = 'reCAPTCHA failed to load. Please refresh the page.';
      return;
    }

    if (typeof verifyAdminLogin !== 'function') {
      errorMsg.textContent = 'Login service unavailable. Please refresh the page.';
      return;
    }

    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;

    try {
      const result = await verifyAdminLogin(username, password);

      if (!result.success) {
        errorMsg.textContent = result.error || 'Invalid username or password.';
        return;
      }

      clearAdminSession();
      setAdminSession(username, keepSignedIn);
      window.location.href = '../index.html';
    } catch {
      errorMsg.textContent = 'Unable to sign in right now. Please try again.';
    } finally {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  });

  // If already authenticated, redirect to admin portal
  if (isAdminAuthenticated()) {
    window.location.replace('../index.html');
  }

  // Forgot Password
  const forgotLink = document.getElementById('forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async function (e) {
      e.preventDefault();
      
      const usernameInput = document.getElementById('username').value.trim();
      const errorMsg = document.getElementById('error-msg');
      
      if (!usernameInput) {
        errorMsg.textContent = 'Please enter your username or email first to reset your password.';
        document.getElementById('username').focus();
        return;
      }
      
      errorMsg.textContent = 'Sending password reset link...';
      
      if (typeof sendPasswordReset !== 'function') {
        errorMsg.textContent = 'Reset service unavailable.';
        return;
      }
      
      const result = await sendPasswordReset(usernameInput);
      
      if (!result.success) {
        errorMsg.textContent = result.error;
      } else {
        errorMsg.textContent = '';
        const modal = document.getElementById('custom-modal');
        const modalLoader = document.getElementById('custom-modal-loader');
        const modalContent = document.getElementById('custom-modal-content');
        const modalText = document.getElementById('custom-modal-text');
        
        if (modal && modalLoader && modalContent && modalText) {
          modalText.textContent = `A password reset link has been sent to your email: ${result.email}`;
          modal.style.display = 'flex';
          modalLoader.style.display = 'block';
          modalContent.style.display = 'none';
          
          setTimeout(() => {
            modalLoader.style.display = 'none';
            modalContent.style.display = 'block';
          }, 1500);
        }
      }
    });

    const modalCloseBtn = document.getElementById('custom-modal-close');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', function () {
        document.getElementById('custom-modal').style.display = 'none';
      });
    }

    const modalResendBtn = document.getElementById('custom-modal-resend');
    if (modalResendBtn) {
      modalResendBtn.addEventListener('click', async function () {
        const usernameInput = document.getElementById('username').value.trim();
        const modalLoader = document.getElementById('custom-modal-loader');
        const modalContent = document.getElementById('custom-modal-content');
        
        modalContent.style.display = 'none';
        modalLoader.style.display = 'block';
        
        // Artificial 1.5s delay
        await new Promise(r => setTimeout(r, 1500));
        
        await sendPasswordReset(usernameInput);
        
        modalLoader.style.display = 'none';
        modalContent.style.display = 'block';
      });
    }
  }

  // Toggle password visibility
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function () {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      if (type === 'text') {
        this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      } else {
        this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      }
    });
  }
}
