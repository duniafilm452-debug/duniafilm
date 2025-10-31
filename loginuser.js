import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Konfigurasi Supabase
const SUPABASE_URL = "https://kwuqrsnkxlxzqvimoydu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dXFyc25reGx4enF2aW1veWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ5ODUsImV4cCI6MjA3NDk5MDk4NX0.6XQjnexc69VVSzvB5XrL8gFGM54Me9c5TrR20ysfvTk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elemen DOM
const elements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    
    // Login form
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginBtn: document.querySelector('#login-form .submit-btn'),
    loginText: document.getElementById('login-text'),
    loginSpinner: document.getElementById('login-spinner'),
    
    // Register form
    registerEmail: document.getElementById('register-email'),
    registerPassword: document.getElementById('register-password'),
    confirmPassword: document.getElementById('confirm-password'),
    username: document.getElementById('username'),
    registerBtn: document.querySelector('#register-form .submit-btn'),
    registerText: document.getElementById('register-text'),
    registerSpinner: document.getElementById('register-spinner'),
    
    // Popups
    successPopup: document.getElementById('success-popup'),
    errorPopup: document.getElementById('error-popup'),
    loadingOverlay: document.getElementById('loading-overlay'),
    successOk: document.getElementById('success-ok'),
    errorOk: document.getElementById('error-ok'),
    successTitle: document.getElementById('success-title'),
    successMessage: document.getElementById('success-message'),
    errorMessage: document.getElementById('error-message'),
    loadingText: document.getElementById('loading-text')
};

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// Fungsi inisialisasi
function initializeApp() {
    // Cek jika user sudah login
    checkCurrentSession();
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Form submissions
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);
    
    // Popup buttons
    elements.successOk.addEventListener('click', () => hidePopup('success'));
    elements.errorOk.addEventListener('click', () => hidePopup('error'));
    
    // Real-time validation
    elements.confirmPassword.addEventListener('input', validatePasswordMatch);
    elements.registerPassword.addEventListener('input', validatePasswordMatch);
}

// Cek session saat ini
async function checkCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // User sudah login, redirect ke profile
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 1000);
    }
}

// Switch tab
function switchTab(tab) {
    // Update tab buttons
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update forms
    elements.loginForm.classList.toggle('active', tab === 'login');
    elements.registerForm.classList.toggle('active', tab === 'register');
    
    // Reset forms
    if (tab === 'login') {
        elements.registerForm.reset();
    } else {
        elements.loginForm.reset();
    }
}

// Validasi password match
function validatePasswordMatch() {
    const password = elements.registerPassword.value;
    const confirm = elements.confirmPassword.value;
    
    if (confirm && password !== confirm) {
        elements.confirmPassword.classList.add('error');
        return false;
    } else {
        elements.confirmPassword.classList.remove('error');
        return true;
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value.trim();
    
    if (!email || !password) {
        showError('Email dan password harus diisi');
        return;
    }
    
    await performLogin(email, password);
}

// Perform login
async function performLogin(email, password) {
    showLoading('Masuk ke akun...');
    disableForm('login', true);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            throw error;
        }
        
        // Login berhasil
        showSuccess('Login Berhasil', 'Selamat datang kembali!');
        
        // Redirect ke profile setelah 2 detik
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
            showError('Email atau password salah');
        } else if (error.message.includes('Email not confirmed')) {
            showError('Email belum dikonfirmasi. Silakan cek email Anda.');
        } else {
            showError('Terjadi kesalahan saat login: ' + error.message);
        }
    } finally {
        hideLoading();
        disableForm('login', false);
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value.trim();
    const confirm = elements.confirmPassword.value.trim();
    const username = elements.username.value.trim();
    
    // Validasi
    if (!email || !password || !confirm || !username) {
        showError('Semua field harus diisi');
        return;
    }
    
    if (password.length < 6) {
        showError('Password harus minimal 6 karakter');
        return;
    }
    
    if (!validatePasswordMatch()) {
        showError('Password dan konfirmasi password tidak cocok');
        return;
    }
    
    if (!elements.agreeTerms.checked) {
        showError('Anda harus menyetujui Syarat & Ketentuan');
        return;
    }
    
    await performRegistration(email, password, username);
}

// Perform registration
async function performRegistration(email, password, username) {
    showLoading('Membuat akun...');
    disableForm('register', true);
    
    try {
        // 1. Daftarkan user di Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
        });
        
        if (authError) {
            throw authError;
        }
        
        // 2. Buat profile di database (akan ditrigger oleh database trigger)
        // Tunggu sebentar untuk memastikan trigger berjalan
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. Update username di profile jika perlu
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ username: username })
                .eq('id', authData.user.id);
                
            if (profileError && !profileError.message.includes('duplicate key')) {
                console.warn('Profile update warning:', profileError);
            }
        }
        
        // Registrasi berhasil
        showSuccess(
            'Registrasi Berhasil!', 
            'Akun Anda telah berhasil dibuat. Silakan cek email untuk verifikasi (jika diperlukan).'
        );
        
        // Switch ke tab login setelah 3 detik
        setTimeout(() => {
            hidePopup('success');
            switchTab('login');
        }, 3000);
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle specific error cases
        if (error.message.includes('already registered')) {
            showError('Email sudah terdaftar. Silakan gunakan email lain.');
        } else if (error.message.includes('weak password')) {
            showError('Password terlalu lemah. Gunakan password yang lebih kuat.');
        } else if (error.message.includes('invalid email')) {
            showError('Format email tidak valid');
        } else {
            showError('Terjadi kesalahan saat mendaftar: ' + error.message);
        }
    } finally {
        hideLoading();
        disableForm('register', false);
    }
}

// Social login (placeholder)
function setupSocialLogin() {
    // Google login
    document.querySelector('.google-btn').addEventListener('click', async () => {
        showError('Login dengan Google belum tersedia');
    });
    
    // GitHub login
    document.querySelector('.github-btn').addEventListener('click', async () => {
        showError('Login dengan GitHub belum tersedia');
    });
}

// Utility functions
function disableForm(formType, disabled) {
    const form = formType === 'login' ? elements.loginForm : elements.registerForm;
    const btn = formType === 'login' ? elements.loginBtn : elements.registerBtn;
    const text = formType === 'login' ? elements.loginText : elements.registerText;
    const spinner = formType === 'login' ? elements.loginSpinner : elements.registerSpinner;
    
    const inputs = form.querySelectorAll('input, button');
    inputs.forEach(input => {
        if (input !== btn) {
            input.disabled = disabled;
        }
    });
    
    if (disabled) {
        text.textContent = formType === 'login' ? 'Memproses...' : 'Mendaftarkan...';
        spinner.classList.remove('hidden');
        btn.disabled = true;
    } else {
        text.textContent = formType === 'login' ? 'Masuk' : 'Daftar';
        spinner.classList.add('hidden');
        btn.disabled = false;
    }
}

function showLoading(message = 'Memproses...') {
    elements.loadingText.textContent = message;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showPopup(type) {
    elements[`${type}Popup`].classList.remove('hidden');
}

function hidePopup(type) {
    elements[`${type}Popup`].classList.add('hidden');
}

function showSuccess(title, message) {
    elements.successTitle.textContent = title;
    elements.successMessage.textContent = message;
    showPopup('success');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    showPopup('error');
}

// Initialize social login
setupSocialLogin();