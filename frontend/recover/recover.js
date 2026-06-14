document.addEventListener("DOMContentLoaded", () => {
    // Initialize Supabase Client
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const resetForm = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const toggleNewPasswordBtn = document.getElementById('toggle-new-password');
    const toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');
    const errorMsg = document.getElementById('error-message');
    const resetBtn = document.getElementById('reset-btn');
    const successModal = document.getElementById('success-modal');

    // Toggle Password Visibility Logic
    function setupPasswordToggle(inputEl, btnEl) {
        btnEl.addEventListener('click', () => {
            const type = inputEl.getAttribute('type') === 'password' ? 'text' : 'password';
            inputEl.setAttribute('type', type);
            
            // Toggle icon
            if (type === 'text') {
                btnEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
            } else {
                btnEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
            }
        });
    }

    if (toggleNewPasswordBtn && newPasswordInput) setupPasswordToggle(newPasswordInput, toggleNewPasswordBtn);
    if (toggleConfirmPasswordBtn && confirmPasswordInput) setupPasswordToggle(confirmPasswordInput, toggleConfirmPasswordBtn);

    // Automatically handles the #access_token=...&type=recovery hash.
    // The supabase-js client parses it and sets the session automatically if valid.
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            console.log('Recovery session ready');
        }
    });

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function hideError() {
        errorMsg.style.display = 'none';
    }

    // Check if the URL contains an error from an expired or invalid link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');
    
    if (errorDesc && (errorDesc.toLowerCase().includes('expired') || errorDesc.toLowerCase().includes('invalid'))) {
        showError("Your password reset link has expired or is invalid. Please go to the login page and request a new one.");
        resetBtn.disabled = true;
        resetBtn.style.opacity = "0.7";
        resetBtn.style.cursor = "not-allowed";
        newPasswordInput.disabled = true;
        confirmPasswordInput.disabled = true;
    }

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!newPassword || !confirmPassword) {
            showError("Please fill in both password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            showError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            showError("Password should be at least 6 characters.");
            return;
        }

        // Disable button and show loader
        resetBtn.disabled = true;
        resetBtn.style.opacity = "0.7";
        resetBtn.style.cursor = "not-allowed";
        
        const btnText = resetBtn.querySelector('span');
        const originalText = btnText.textContent;
        btnText.textContent = "Updating...";
        
        const loader = document.createElement('div');
        loader.className = 'spinner';
        resetBtn.appendChild(loader);

        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            // Sync the new password to the custom admin_password table
            if (data?.user?.email) {
                await fetch(`${SUPABASE_URL}/rest/v1/admin_password?email=eq.${data.user.email}`, {
                    method: 'PATCH',
                    headers: supabaseHeaders,
                    body: JSON.stringify({ password: newPassword })
                });
            }

            // Show success popup
            successModal.style.display = 'flex';
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.replace('../admin_login/login.html');
            }, 3000);

        } catch (err) {
            console.error("Password reset error:", err);
            if (err.message && err.message.toLowerCase().includes('session')) {
                showError("Invalid or expired recovery link. Please request a new password reset.");
            } else if (err.message && err.message.toLowerCase().includes('password')) {
                showError("Weak password: " + err.message);
            } else if (err.message === "Failed to fetch") {
                showError("Network error. Please check your connection.");
            } else {
                showError(err.message || "Failed to update password. Please try again.");
            }
        } finally {
            // Restore button state if not successful
            if (successModal.style.display !== 'flex') {
                resetBtn.disabled = false;
                resetBtn.style.opacity = "1";
                resetBtn.style.cursor = "pointer";
                btnText.textContent = originalText;
                if (loader.parentNode) {
                    resetBtn.removeChild(loader);
                }
            }
        }
    });
});
