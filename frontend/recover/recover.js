document.addEventListener("DOMContentLoaded", () => {
    // Initialize Supabase Client
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const resetForm = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const errorMsg = document.getElementById('error-message');
    const resetBtn = document.getElementById('reset-btn');
    const successModal = document.getElementById('success-modal');

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
                window.location.replace('../login/login.html');
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
