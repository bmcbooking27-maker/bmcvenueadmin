const SUPABASE_URL = 'https://uhulzdjzdkchiywjiayj.supabase.co';
// WARNING: Replace this placeholder with your actual Supabase API key!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodWx6ZGp6ZGtjaGl5d2ppYXlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NDMyNiwiZXhwIjoyMDk2MzIwMzI2fQ.h7oU8wpPIDPofzy7B_1c4jgNVWiR80n5JHrF_T4muMw';

const supabaseHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

/**
 * Verify admin credentials against 'admin_password' table
 */
async function verifyAdminLogin(loginInput, password) {
    try {
        let email = loginInput;
        let dbPassword = null;

        // Query admin_password table to verify credentials and check for txt password
        const params = new URLSearchParams({
            or: `(username.eq.${loginInput},email.eq.${loginInput})`,
            select: 'email,password'
        });

        const response = await fetch(`${SUPABASE_URL}/rest/v1/admin_password?${params.toString()}`, {
            headers: supabaseHeaders
        });

        if (!response.ok) {
            return { success: false, error: 'Network error looking up credentials.' };
        }

        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) {
            email = rows[0].email || email;
            dbPassword = rows[0].password;
        } else if (!loginInput.includes('@')) {
            return { success: false, error: 'Username not found.' };
        }

        // 1. Authenticate with Database txt password if it matches
        if (dbPassword && dbPassword === password) {
            return { success: true };
        }

        // 2. Fallback to Supabase Auth
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, password: password })
        });

        if (!authResponse.ok) {
            const err = await authResponse.json().catch(() => ({}));
            let errorMessage = 'Wrong password or invalid credentials.';
            if (err.error_description) {
                 errorMessage = err.error_description;
            } else if (err.msg) {
                 errorMessage = err.msg;
            }
            return { success: false, error: errorMessage };
        }

        return { success: true };
    } catch (error) {
        console.error('Error verifying login:', error);
        return { success: false, error: 'Network error or service unavailable.' };
    }
}

/**
 * Send password reset email using Supabase Auth
 */
async function sendPasswordReset(loginInput) {
    try {
        if (!loginInput) {
            return { success: false, error: 'Please enter your username or email first.' };
        }

        let email = loginInput;

        // Query admin_password table to verify credentials exist
        const params = new URLSearchParams({
            or: `(username.eq.${loginInput},email.eq.${loginInput})`,
            select: 'email'
        });

        const response = await fetch(`${SUPABASE_URL}/rest/v1/admin_password?${params.toString()}`, {
            headers: supabaseHeaders
        });

        if (!response.ok) {
            return { success: false, error: 'Network error looking up credentials.' };
        }

        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length === 0) {
            return { success: false, error: 'Invalid credentials.' };
        }
        
        email = rows[0].email;
        if (!email) {
            return { success: false, error: 'No email associated with these credentials.' };
        }

        // Dynamically determine the correct path to recover.html based on current environment
        const currentPath = window.location.pathname;
        const recoverPath = currentPath.replace('login/login.html', 'recover/recover.html');
        const redirectUrl = encodeURIComponent(window.location.origin + recoverPath);

        // Trigger password reset email via Supabase Auth REST
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${redirectUrl}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });

        if (!authResponse.ok) {
            const err = await authResponse.json().catch(() => ({}));
            let errorMessage = 'Failed to send reset email.';
            if (err.error_description) {
                 errorMessage = err.error_description;
            } else if (err.msg) {
                 errorMessage = err.msg;
            }
            return { success: false, error: errorMessage };
        }

        return { success: true, email: email };
    } catch (error) {
        console.error('Error triggering password reset:', error);
        return { success: false, error: 'Network error or service unavailable.' };
    }
}

/**
 * Fetch all bookings from 'bookvenuebmc' table
 */
async function fetchBookings() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookvenuebmc?select=*&order=Date.desc`, {
            headers: supabaseHeaders
        });
        if (!response.ok) throw new Error("Failed to fetch bookings. Ensure API key is set properly");
        return await response.json();
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return [];
    }
}

/**
 * Insert a new booking into 'bookvenuebmc' table
 */
async function insertBooking(bookingData) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookvenuebmc`, {
            method: 'POST',
            headers: supabaseHeaders,
            body: JSON.stringify(bookingData)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to save booking");
        }
        return await response.json();
    } catch (error) {
        console.error("Error inserting booking:", error);
        throw error;
    }
}

/**
 * Update an existing booking in 'bookvenuebmc' table
 */
async function updateBooking(bookingId, bookingData) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookvenuebmc?Booking_ID=eq.${bookingId}`, {
            method: 'PATCH',
            headers: supabaseHeaders,
            body: JSON.stringify(bookingData)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to update booking");
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating booking:", error);
        throw error;
    }
}

/**
 * Delete a booking from 'bookvenuebmc' table
 */
async function deleteBooking(bookingId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookvenuebmc?Booking_ID=eq.${bookingId}`, {
            method: 'DELETE',
            headers: supabaseHeaders
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Failed to delete booking");
        }
        if (response.status !== 204) {
            return await response.json().catch(() => ({}));
        }
        return true;
    } catch (error) {
        console.error("Error deleting booking:", error);
        throw error;
    }
}

/**
 * Check if a booking overlaps with existing bookings
 */
async function checkBookingOverlap(bookingData, excludeBookingId = null) {
    try {
        const { Date, 'Time(from)': timeFrom, 'Time(to)': timeTo, Venue } = bookingData;
        
        // Fetch bookings for the same date and venue
        const params = new URLSearchParams({
            Date: `eq.${Date}`,
            Venue: `eq.${Venue}`
        });
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookvenuebmc?${params.toString()}`, {
            headers: supabaseHeaders
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch existing bookings for validation');
        }
        
        const existingBookings = await response.json();
        
        // Check for time overlap
        for (const booking of existingBookings) {
            // Skip the current booking if we're editing
            if (excludeBookingId && booking.Booking_ID === excludeBookingId) {
                continue;
            }
            
            const existingFrom = booking['Time(from)'];
            const existingTo = booking['Time(to)'];
            
            // Logic: new overlaps with existing if new_start < existing_end AND new_end > existing_start
            if (timeFrom < existingTo && timeTo > existingFrom) {
                return { 
                    overlap: true, 
                    conflictingBooking: booking 
                };
            }
        }
        
        return { overlap: false };
    } catch (error) {
        console.error("Error checking booking overlap:", error);
        throw error;
    }
}
