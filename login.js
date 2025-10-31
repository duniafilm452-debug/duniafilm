import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Konfigurasi Supabase (sama dengan file lainnya)
const SUPABASE_URL = "https://kwuqrsnkxlxzqvimoydu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dXFyc25reGx4enF2aW1veWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ5ODUsImV4cCI6MjA3NDk5MDk4NX0.6XQjnexc69VVSzvB5XrL8gFGM54Me9c5TrR20ysfvTk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elemen DOM
const elements = {
    loginForm: document.getElementById('login-form'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('login-btn'),
    loginText: document.getElementById('login-text'),
    loginSpinner: document.getElementById('login-spinner'),
    errorPopup: document.getElementById('error-popup'),
    errorMessage: document.getElementById('error-message'),
    errorOk: document.getElementById('error-ok')
};

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkExistingSession();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    elements.loginForm.addEventListener('submit', handleLogin);
    
    // Popup button
    elements.errorOk.addEventListener('click', () => hidePopup('error'));
    
    // Enter key support
    elements.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
}

// Cek session yang sudah ada
async function checkExistingSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Error checking session:', error);
        return;
    }
    
    if (session) {
        // Jika sudah login, redirect ke admin panel
        redirectToAdmin();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    
    if (!validateForm(email, password)) {
        return;
    }
    
    await performLogin(email, password);
}

// Validasi form
function validateForm(email, password) {
    if (!email) {
        showError('Email harus diisi');
        return false;
    }
    
    if (!password) {
        showError('Password harus diisi');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showError('Format email tidak valid');
        return false;
    }
    
    return true;
}

// Validasi format email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Perform login
async function performLogin(email, password) {
    setLoading(true);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        // Login berhasil, redirect ke admin panel
        redirectToAdmin();
        
    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(error);
    } finally {
        setLoading(false);
    }
}

// Handle login error
function handleLoginError(error) {
    let errorMessage = 'Terjadi kesalahan saat login';
    
    switch (error.message) {
        case 'Invalid login credentials':
            errorMessage = 'Email atau password salah';
            break;
        case 'Email not confirmed':
            errorMessage = 'Email belum dikonfirmasi';
            break;
        case 'Too many requests':
            errorMessage = 'Terlalu banyak percobaan login. Coba lagi nanti.';
            break;
        default:
            errorMessage = error.message || 'Terjadi kesalahan saat login';
    }
    
    showError(errorMessage);
}

// Redirect ke admin panel
function redirectToAdmin() {
    window.location.href = 'admin.html';
}

// Set loading state
function setLoading(loading) {
    if (loading) {
        elements.loginText.textContent = 'Logging in...';
        elements.loginSpinner.classList.remove('hidden');
        elements.loginBtn.disabled = true;
    } else {
        elements.loginText.textContent = 'Login';
        elements.loginSpinner.classList.add('hidden');
        elements.loginBtn.disabled = false;
    }
}

// Show/hide popup
function showPopup(type) {
    elements[`${type}Popup`].classList.remove('hidden');
}

function hidePopup(type) {
    elements[`${type}Popup`].classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    showPopup('error');
}