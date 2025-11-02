import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Konfigurasi Supabase
const SUPABASE_URL = "https://kwuqrsnkxlxzqvimoydu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dXFyc25reGx4enF2aW1veWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ5ODUsImV4cCI6MjA3NDk5MDk4NX0.6XQjnexc69VVSzvB5XrL8gFGM54Me9c5TrR20ysfvTk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elemen DOM
const elements = {
    // Form elements
    uploadForm: document.getElementById('upload-form'),
    movieTitle: document.getElementById('movie-title'),
    movieDesc: document.getElementById('movie-desc'),
    movieCategory: document.getElementById('movie-category'),
    videoUrl: document.getElementById('video-url'),
    movieDuration: document.getElementById('movie-duration'),
    thumbnailUpload: document.getElementById('thumbnail-upload'),
    thumbnailUploadArea: document.getElementById('thumbnail-upload-area'),
    thumbnailPreview: document.getElementById('thumbnail-preview'),
    thumbnailUrl: document.getElementById('thumbnail-url'),
    uploadPreview: document.querySelector('.upload-preview'),
    uploadPlaceholder: document.querySelector('.upload-placeholder'),
    changeThumbnail: document.getElementById('change-thumbnail'),
    
    // Filter elements
    categoryFilter: document.getElementById('category-filter'),
    
    // Buttons
    submitBtn: document.getElementById('submit-btn'),
    submitText: document.getElementById('submit-text'),
    submitSpinner: document.getElementById('submit-spinner'),
    resetBtn: document.getElementById('reset-btn'),
    backBtn: document.getElementById('back-btn'),
    
    // Movies list
    moviesList: document.getElementById('movies-list'),
    
    // Popups
    successPopup: document.getElementById('success-popup'),
    errorPopup: document.getElementById('error-popup'),
    loadingOverlay: document.getElementById('loading-overlay'),
    successOk: document.getElementById('success-ok'),
    successView: document.getElementById('success-view'),
    errorOk: document.getElementById('error-ok'),
    
    // Messages
    successMessage: document.getElementById('success-message'),
    errorMessage: document.getElementById('error-message')
};

let uploadedMovieId = null;
let currentThumbnailFile = null;
let allMovies = [];
let editingMovieId = null;
let editThumbnailFiles = {};

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

// Fungsi inisialisasi
async function initializeApp() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Error checking session:', error);
        showError('Gagal memeriksa sesi');
        return;
    }

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    await loadMoviesList();
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    elements.uploadForm.addEventListener('submit', handleFormSubmit);
    
    // Thumbnail upload
    elements.thumbnailUploadArea.addEventListener('click', () => elements.thumbnailUpload.click());
    elements.thumbnailUpload.addEventListener('change', handleThumbnailUpload);
    elements.changeThumbnail.addEventListener('click', () => elements.thumbnailUpload.click());
    
    // Thumbnail URL input
    elements.thumbnailUrl.addEventListener('input', handleThumbnailUrlInput);
    
    // Drag and drop untuk thumbnail
    elements.thumbnailUploadArea.addEventListener('dragover', handleDragOver);
    elements.thumbnailUploadArea.addEventListener('dragleave', handleDragLeave);
    elements.thumbnailUploadArea.addEventListener('drop', handleDrop);
    
    // Filter events
    elements.categoryFilter.addEventListener('change', filterMovies);
    
    // Buttons
    elements.resetBtn.addEventListener('click', resetForm);
    elements.backBtn.addEventListener('click', () => window.location.href = 'index.html');
    
    // Popup buttons
    elements.successOk.addEventListener('click', () => hidePopup('success'));
    elements.successView.addEventListener('click', viewUploadedMovie);
    elements.errorOk.addEventListener('click', () => hidePopup('error'));
    
    // Input validation
    elements.videoUrl.addEventListener('input', validateVideoUrl);
}

// Handle thumbnail URL input
function handleThumbnailUrlInput() {
    const url = elements.thumbnailUrl.value.trim();
    
    if (url) {
        // Jika URL diisi, reset file upload
        currentThumbnailFile = null;
        elements.uploadPlaceholder.classList.remove('hidden');
        elements.uploadPreview.classList.add('hidden');
        elements.thumbnailPreview.src = '';
        
        // Validasi URL gambar
        if (isValidImageUrl(url)) {
            elements.thumbnailUrl.style.borderColor = '#28a745';
        } else {
            elements.thumbnailUrl.style.borderColor = '#dc3545';
        }
    } else {
        elements.thumbnailUrl.style.borderColor = '#ddd';
    }
}

// Validasi URL gambar
function isValidImageUrl(url) {
    const imageRegex = /\.(jpeg|jpg|png|webp|gif|bmp)(\?.*)?$/i;
    return imageRegex.test(url) || url.includes('images.unsplash.com') || url.includes('placehold.co');
}

// ===============================
// FUNGSI UTAMA
// ===============================

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    await uploadMovie();
}

// Validasi form
function validateForm() {
    const title = elements.movieTitle.value.trim();
    const videoUrl = elements.videoUrl.value.trim();
    const category = elements.movieCategory.value;
    const thumbnailUrl = elements.thumbnailUrl.value.trim();
    
    if (!title) {
        showError('Judul film harus diisi');
        return false;
    }
    
    if (!category) {
        showError('Kategori harus dipilih');
        return false;
    }
    
    if (!videoUrl) {
        showError('URL video harus diisi');
        return false;
    }
    
    if (thumbnailUrl && !isValidImageUrl(thumbnailUrl)) {
        showError('URL gambar thumbnail tidak valid');
        return false;
    }
    
    if (!isValidVideoUrl(videoUrl)) {
        showError('URL video tidak valid. Gunakan YouTube, Google Drive, atau URL video langsung.');
        return false;
    }
    
    return true;
}

// Validasi URL video
function isValidVideoUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    const googleDriveRegex = /^(https?:\/\/)?(drive\.google\.com\/)/;
    const urlRegex = /^https?:\/\/.+\..+/;
    
    return youtubeRegex.test(url) || googleDriveRegex.test(url) || urlRegex.test(url);
}

// Validasi URL video real-time
function validateVideoUrl() {
    const url = elements.videoUrl.value.trim();
    
    if (url && !isValidVideoUrl(url)) {
        elements.videoUrl.style.borderColor = '#dc3545';
    } else {
        elements.videoUrl.style.borderColor = '#ddd';
    }
}

// Generate thumbnail URL dari video URL
function generateThumbnailUrl(videoUrl, movieTitle = "") {
    if (!videoUrl) return 'https://placehold.co/400x225?text=No+Thumbnail';
    
    // YouTube thumbnail
    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
        let videoId;
        if (videoUrl.includes("youtube.com/watch?v=")) {
            videoId = new URL(videoUrl).searchParams.get("v");
        } else if (videoUrl.includes("youtu.be/")) {
            videoId = videoUrl.split("youtu.be/")[1].split('?')[0];
        }
        
        if (videoId) {
            return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
    }
    
    // Google Drive thumbnail
    if (videoUrl.includes("drive.google.com")) {
        let fileId;
        if (videoUrl.includes("/file/d/")) {
            fileId = videoUrl.split('/file/d/')[1].split('/')[0];
        } else if (videoUrl.includes("id=")) {
            fileId = new URL(videoUrl).searchParams.get("id");
        }
        
        if (fileId) {
            return `https://lh3.googleusercontent.com/d/${fileId}=s220?authuser=0`;
        }
    }
    
    // Supabase Storage - coba generate placeholder
    if (videoUrl.includes("supabase.co/storage/v1/object/public/videos/")) {
        const videoName = videoUrl.split('/').pop();
        return `https://placehold.co/400x225/667eea/ffffff?text=${encodeURIComponent(videoName.split('.')[0] || 'Video')}`;
    }
    
    // Default placeholder dengan judul film
    const shortTitle = movieTitle.length > 15 ? movieTitle.substring(0, 15) + '...' : movieTitle;
    return `https://placehold.co/400x225/667eea/ffffff?text=${encodeURIComponent(shortTitle || 'Video')}`;
}

// Handle thumbnail upload
function handleThumbnailUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset URL input jika file diupload
    elements.thumbnailUrl.value = '';
    elements.thumbnailUrl.style.borderColor = '#ddd';
    
    processThumbnailFile(file);
}

// Process thumbnail file
function processThumbnailFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('File harus berupa gambar');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showError('Ukuran file maksimal 5MB');
        return;
    }
    
    currentThumbnailFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.thumbnailPreview.src = e.target.result;
        elements.uploadPlaceholder.classList.add('hidden');
        elements.uploadPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Handle edit thumbnail upload
function handleEditThumbnailUpload(movieId, event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset URL input untuk edit form
    const urlInput = document.getElementById(`edit-thumbnail-url-${movieId}`);
    if (urlInput) {
        urlInput.value = '';
    }
    
    processEditThumbnailFile(movieId, file);
}

// Process edit thumbnail file
function processEditThumbnailFile(movieId, file) {
    if (!file.type.startsWith('image/')) {
        showError('File harus berupa gambar');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showError('Ukuran file maksimal 5MB');
        return;
    }
    
    editThumbnailFiles[movieId] = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(`edit-thumbnail-preview-${movieId}`);
        const placeholder = document.getElementById(`edit-upload-placeholder-${movieId}`);
        const previewContainer = document.getElementById(`edit-upload-preview-${movieId}`);
        
        if (preview && placeholder && previewContainer) {
            preview.src = e.target.result;
            placeholder.classList.add('hidden');
            previewContainer.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
}

// Handle edit thumbnail URL input
function handleEditThumbnailUrlInput(movieId) {
    const urlInput = document.getElementById(`edit-thumbnail-url-${movieId}`);
    if (!urlInput) return;
    
    const url = urlInput.value.trim();
    
    if (url) {
        // Jika URL diisi, reset file upload
        delete editThumbnailFiles[movieId];
        const placeholder = document.getElementById(`edit-upload-placeholder-${movieId}`);
        const previewContainer = document.getElementById(`edit-upload-preview-${movieId}`);
        
        if (placeholder && previewContainer) {
            placeholder.classList.remove('hidden');
            previewContainer.classList.add('hidden');
        }
        
        // Validasi URL
        if (isValidImageUrl(url)) {
            urlInput.style.borderColor = '#28a745';
        } else {
            urlInput.style.borderColor = '#dc3545';
        }
    } else {
        urlInput.style.borderColor = '#ddd';
    }
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    elements.thumbnailUploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.thumbnailUploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.thumbnailUploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        // Reset URL input
        elements.thumbnailUrl.value = '';
        elements.thumbnailUrl.style.borderColor = '#ddd';
        
        processThumbnailFile(files[0]);
    }
}

// Edit drag and drop handlers
function handleEditDragOver(movieId, event) {
    event.preventDefault();
    const uploadArea = document.getElementById(`edit-upload-area-${movieId}`);
    if (uploadArea) {
        uploadArea.classList.add('dragover');
    }
}

function handleEditDragLeave(movieId, event) {
    event.preventDefault();
    const uploadArea = document.getElementById(`edit-upload-area-${movieId}`);
    if (uploadArea) {
        uploadArea.classList.remove('dragover');
    }
}

function handleEditDrop(movieId, event) {
    event.preventDefault();
    const uploadArea = document.getElementById(`edit-upload-area-${movieId}`);
    if (uploadArea) {
        uploadArea.classList.remove('dragover');
    }
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        // Reset URL input untuk edit form
        const urlInput = document.getElementById(`edit-thumbnail-url-${movieId}`);
        if (urlInput) {
            urlInput.value = '';
        }
        
        processEditThumbnailFile(movieId, files[0]);
    }
}

// Upload movie ke database
async function uploadMovie() {
    showLoading();
    disableForm(true);
    
    try {
        let thumbnailUrl = '';
        
        // Prioritaskan file upload daripada URL
        if (currentThumbnailFile) {
            thumbnailUrl = await uploadThumbnail();
            if (!thumbnailUrl) {
                throw new Error('Gagal upload thumbnail');
            }
        } else if (elements.thumbnailUrl.value.trim()) {
            thumbnailUrl = elements.thumbnailUrl.value.trim();
        } else {
            // Jika tidak ada thumbnail yang diupload, generate dari URL video
            const videoUrl = elements.videoUrl.value.trim();
            const movieTitle = elements.movieTitle.value.trim();
            thumbnailUrl = generateThumbnailUrl(videoUrl, movieTitle);
            console.log('Generated thumbnail URL:', thumbnailUrl);
        }
        
        const movieData = {
            title: elements.movieTitle.value.trim(),
            description: elements.movieDesc.value.trim(),
            category: elements.movieCategory.value,
            video_url: elements.videoUrl.value.trim(),
            thumbnail_url: thumbnailUrl,
            duration: elements.movieDuration.value ? parseInt(elements.movieDuration.value) : null,
            views: 0,
            likes: 0
        };
        
        const { data: movie, error } = await supabase
            .from('movies')
            .insert([movieData])
            .select()
            .single();
            
        if (error) {
            throw error;
        }
        
        uploadedMovieId = movie.id;
        
        showSuccess('Film berhasil diupload!');
        
        resetForm();
        await loadMoviesList();
        
    } catch (error) {
        console.error('Error uploading movie:', error);
        showError('Gagal upload film: ' + error.message);
    } finally {
        hideLoading();
        disableForm(false);
    }
}

// Upload thumbnail ke storage
async function uploadThumbnail() {
    if (!currentThumbnailFile) return null;
    
    try {
        const fileExt = currentThumbnailFile.name.split('.').pop();
        const fileName = `thumbnails/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('thumbnails')
            .upload(fileName, currentThumbnailFile);
            
        if (error) {
            throw error;
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(fileName);
            
        return publicUrl;
        
    } catch (error) {
        console.error('Error uploading thumbnail:', error);
        throw new Error('Gagal upload thumbnail: ' + error.message);
    }
}

// Upload edit thumbnail ke storage
async function uploadEditThumbnail(movieId) {
    const file = editThumbnailFiles[movieId];
    if (!file) return null;
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `thumbnails/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('thumbnails')
            .upload(fileName, file);
            
        if (error) {
            throw error;
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(fileName);
            
        return publicUrl;
        
    } catch (error) {
        console.error('Error uploading edit thumbnail:', error);
        throw new Error('Gagal upload thumbnail: ' + error.message);
    }
}

// Load daftar film
async function loadMoviesList() {
    try {
        const { data: movies, error } = await supabase
            .from('movies')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            throw error;
        }
        
        allMovies = movies || [];
        displayMoviesList(allMovies);
        
    } catch (error) {
        console.error('Error loading movies:', error);
        elements.moviesList.innerHTML = '<div class="no-movies">Gagal memuat daftar film</div>';
    }
}

// Filter movies berdasarkan kategori
function filterMovies() {
    const selectedCategory = elements.categoryFilter.value;
    
    if (!selectedCategory) {
        displayMoviesList(allMovies);
        return;
    }
    
    const filteredMovies = allMovies.filter(movie => movie.category === selectedCategory);
    displayMoviesList(filteredMovies);
}

// Display movies list
function displayMoviesList(movies) {
    if (!movies || movies.length === 0) {
        elements.moviesList.innerHTML = '<div class="no-movies">Belum ada film yang diupload</div>';
        return;
    }
    
    elements.moviesList.innerHTML = movies.map(movie => {
        const categoryDisplay = movie.category ? 
            movie.category.charAt(0).toUpperCase() + movie.category.slice(1) : 
            'Lainnya';
            
        const categoryClass = movie.category ? `category-${movie.category}` : 'category-lainnya';
        
        if (editingMovieId === movie.id) {
            return `
                <div class="movie-item">
                    <div class="movie-info">
                        <div class="movie-title">Edit Film: ${movie.title}</div>
                        <form class="movie-edit-form" onsubmit="handleEditSubmit(event, '${movie.id}')">
                            <div class="form-group">
                                <label>Judul Film *</label>
                                <input type="text" name="title" value="${movie.title || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Deskripsi</label>
                                <textarea name="description">${movie.description || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Kategori *</label>
                                <select name="category" required>
                                    <option value="drakor" ${movie.category === 'drakor' ? 'selected' : ''}>Drakor</option>
                                    <option value="dracin" ${movie.category === 'dracin' ? 'selected' : ''}>Dracin</option>
                                    <option value="donghua" ${movie.category === 'donghua' ? 'selected' : ''}>Donghua</option>
                                    <option value="anime" ${movie.category === 'anime' ? 'selected' : ''}>Anime</option>
                                    <option value="film" ${movie.category === 'film' ? 'selected' : ''}>Film</option>
                                    <option value="series" ${movie.category === 'series' ? 'selected' : ''}>Series</option>
                                    <option value="lainnya" ${movie.category === 'lainnya' ? 'selected' : ''}>Lainnya</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>URL Video *</label>
                                <input type="url" name="video_url" value="${movie.video_url || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Durasi (menit)</label>
                                <input type="number" name="duration" value="${movie.duration || ''}" min="1">
                            </div>
                            
                            <div class="edit-thumbnail-section">
                                <label>Thumbnail</label>
                                <div class="edit-thumbnail-container">
                                    <div class="current-thumbnail">
                                        <img src="${movie.thumbnail_url || generateThumbnailUrl(movie.video_url, movie.title)}" 
                                             alt="Current thumbnail"
                                             onerror="this.src='https://placehold.co/120x90?text=No+Thumb'">
                                        <small>Thumbnail Saat Ini</small>
                                    </div>
                                    <div class="edit-thumbnail-upload">
                                        <!-- Opsi Upload File -->
                                        <div class="edit-upload-area" id="edit-upload-area-${movie.id}">
                                            <input 
                                                type="file" 
                                                id="edit-thumbnail-upload-${movie.id}" 
                                                accept="image/*" 
                                                hidden
                                                onchange="handleEditThumbnailUpload('${movie.id}', event)"
                                            >
                                            <div class="edit-upload-placeholder" id="edit-upload-placeholder-${movie.id}">
                                                <div class="upload-icon">📷</div>
                                                <p>Klik untuk upload thumbnail baru</p>
                                                <small>Format: JPG, PNG, WebP (Maks. 5MB)</small>
                                            </div>
                                            <div class="edit-upload-preview hidden" id="edit-upload-preview-${movie.id}">
                                                <img id="edit-thumbnail-preview-${movie.id}" src="" alt="Preview thumbnail baru">
                                                <button type="button" class="edit-change-btn" onclick="document.getElementById('edit-thumbnail-upload-${movie.id}').click()">Ganti</button>
                                            </div>
                                        </div>
                                        
                                        <!-- Opsi URL Gambar -->
                                        <div class="form-group" style="margin-top: 12px;">
                                            <label>Atau Masukkan URL Gambar Baru</label>
                                            <input 
                                                type="url" 
                                                id="edit-thumbnail-url-${movie.id}" 
                                                name="thumbnail_url" 
                                                placeholder="https://example.com/image.jpg"
                                                oninput="handleEditThumbnailUrlInput('${movie.id}')"
                                            >
                                            <small class="help-text">Kosongkan jika tidak ingin mengubah thumbnail</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="edit-form-actions">
                                <button type="button" class="action-btn cancel" onclick="cancelEdit()">Batal</button>
                                <button type="submit" class="action-btn save">Simpan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
        
        return `
        <div class="movie-item">
            <img src="${movie.thumbnail_url || generateThumbnailUrl(movie.video_url, movie.title)}" 
                 alt="${movie.title}" 
                 class="movie-thumbnail"
                 onerror="this.src='https://placehold.co/80x60?text=No+Thumb'">
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-meta">
                    <span class="category-badge ${categoryClass}">
                        ${categoryDisplay}
                    </span>
                    <span class="movie-views">👁️ ${movie.views || 0} views</span>
                    • ${movie.duration ? `${movie.duration} menit` : 'Durasi tidak diketahui'}
                    • ${new Date(movie.created_at).toLocaleDateString('id-ID')}
                </div>
            </div>
            <div class="movie-actions">
                <button class="action-btn view" onclick="viewMovie('${movie.id}')">Lihat</button>
                <button class="action-btn edit" onclick="startEdit('${movie.id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteMovie('${movie.id}')">Hapus</button>
            </div>
        </div>
        `;
    }).join('');
    
    setupEditFormListeners();
}

// Setup event listeners untuk form edit
function setupEditFormListeners() {
    allMovies.forEach(movie => {
        if (editingMovieId === movie.id) {
            const uploadArea = document.getElementById(`edit-upload-area-${movie.id}`);
            if (uploadArea) {
                uploadArea.addEventListener('dragover', (e) => handleEditDragOver(movie.id, e));
                uploadArea.addEventListener('dragleave', (e) => handleEditDragLeave(movie.id, e));
                uploadArea.addEventListener('drop', (e) => handleEditDrop(movie.id, e));
                uploadArea.addEventListener('click', () => document.getElementById(`edit-thumbnail-upload-${movie.id}`).click());
            }
        }
    });
}

// View movie
function viewMovie(movieId) {
    window.open(`detail.html?id=${movieId}`, '_blank');
}

// Start edit mode
function startEdit(movieId) {
    editingMovieId = movieId;
    delete editThumbnailFiles[movieId];
    loadMoviesList();
}

// Cancel edit mode
function cancelEdit() {
    editingMovieId = null;
    loadMoviesList();
}

// Handle edit form submission
async function handleEditSubmit(event, movieId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const updateData = {
        title: formData.get('title').trim(),
        description: formData.get('description').trim(),
        category: formData.get('category'),
        video_url: formData.get('video_url').trim(),
        duration: formData.get('duration') ? parseInt(formData.get('duration')) : null,
        updated_at: new Date().toISOString()
    };
    
    if (!isValidVideoUrl(updateData.video_url)) {
        showError('URL video tidak valid. Gunakan YouTube, Google Drive, atau URL video langsung.');
        return;
    }
    
    // Handle thumbnail update
    const thumbnailUrlInput = document.getElementById(`edit-thumbnail-url-${movieId}`);
    if (thumbnailUrlInput && thumbnailUrlInput.value.trim()) {
        if (!isValidImageUrl(thumbnailUrlInput.value.trim())) {
            showError('URL gambar thumbnail tidak valid');
            return;
        }
        updateData.thumbnail_url = thumbnailUrlInput.value.trim();
    } else if (editThumbnailFiles[movieId]) {
        const thumbnailUrl = await uploadEditThumbnail(movieId);
        if (thumbnailUrl) {
            updateData.thumbnail_url = thumbnailUrl;
        }
    } else {
        // Jika tidak ada thumbnail baru yang diupload, generate dari URL video
        const movie = allMovies.find(m => m.id === movieId);
        if (movie) {
            updateData.thumbnail_url = generateThumbnailUrl(updateData.video_url, updateData.title);
        }
    }
    
    await updateMovie(movieId, updateData);
}

// Update movie di database
async function updateMovie(movieId, updateData) {
    showLoading();
    
    try {
        const { error } = await supabase
            .from('movies')
            .update(updateData)
            .eq('id', movieId);
            
        if (error) {
            throw error;
        }
        
        editingMovieId = null;
        delete editThumbnailFiles[movieId];
        await loadMoviesList();
        showSuccess('Film berhasil diupdate!');
        
    } catch (error) {
        console.error('Error updating movie:', error);
        showError('Gagal update film: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Delete movie
async function deleteMovie(movieId) {
    if (!confirm('Hapus film ini?')) return;
    
    try {
        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', movieId);
            
        if (error) {
            throw error;
        }
        
        await loadMoviesList();
        showSuccess('Film berhasil dihapus');
        
    } catch (error) {
        console.error('Error deleting movie:', error);
        showError('Gagal menghapus film: ' + error.message);
    }
}

// View uploaded movie
function viewUploadedMovie() {
    if (uploadedMovieId) {
        viewMovie(uploadedMovieId);
    }
    hidePopup('success');
}

// Reset form
function resetForm() {
    elements.uploadForm.reset();
    currentThumbnailFile = null;
    elements.uploadPlaceholder.classList.remove('hidden');
    elements.uploadPreview.classList.add('hidden');
    elements.thumbnailPreview.src = '';
    elements.thumbnailUrl.style.borderColor = '#ddd';
}

// Disable/enable form
function disableForm(disabled) {
    const inputs = elements.uploadForm.querySelectorAll('input, textarea, button, select');
    inputs.forEach(input => {
        if (input !== elements.resetBtn && input !== elements.submitBtn) {
            input.disabled = disabled;
        }
    });
    
    if (disabled) {
        elements.submitText.textContent = 'Mengupload...';
        elements.submitSpinner.classList.remove('hidden');
        elements.submitBtn.disabled = true;
    } else {
        elements.submitText.textContent = 'Upload Film';
        elements.submitSpinner.classList.add('hidden');
        elements.submitBtn.disabled = false;
    }
}

// Show/hide loading
function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// Show/hide popup
function showPopup(type) {
    elements[`${type}Popup`].classList.remove('hidden');
}

function hidePopup(type) {
    elements[`${type}Popup`].classList.add('hidden');
}

// Show success message
function showSuccess(message) {
    elements.successMessage.textContent = message;
    showPopup('success');
}

// Show error message
function showError(message) {
    elements.errorMessage.textContent = message;
    showPopup('error');
}

// Export functions ke global scope
window.handleEditSubmit = handleEditSubmit;
window.viewMovie = viewMovie;
window.startEdit = startEdit;
window.cancelEdit = cancelEdit;
window.deleteMovie = deleteMovie;
window.handleEditThumbnailUpload = handleEditThumbnailUpload;
window.handleEditThumbnailUrlInput = handleEditThumbnailUrlInput;
window.handleEditDragOver = handleEditDragOver;
window.handleEditDragLeave = handleEditDragLeave;
window.handleEditDrop = handleEditDrop;