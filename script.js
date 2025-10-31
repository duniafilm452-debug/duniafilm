import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Konfigurasi Supabase
const SUPABASE_URL = "https://kwuqrsnkxlxzqvimoydu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dXFyc25reGx4enF2aW1veWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ5ODUsImV4cCI6MjA3NDk5MDk4NX0.6XQjnexc69VVSzvB5XrL8gFGM54Me9c5TrR20ysfvTk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elemen DOM
const elements = {
    moviesGrid: document.getElementById('movies-grid'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    categoryBtns: document.querySelectorAll('.category-btn'),
    tabBtns: document.querySelectorAll('.tab-btn')
};

// State
let allMovies = [];
let currentCategory = 'all';
let currentTab = 'recommended';
let currentSearch = '';

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

// Fungsi inisialisasi
async function initializeApp() {
    await loadMovies();
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Category buttons
    elements.categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            elements.categoryBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            currentCategory = btn.dataset.category;
            filterMovies();
        });
    });

    // Tab buttons
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            currentTab = btn.dataset.tab;
            filterMovies();
        });
    });
}

// Load movies dari Supabase
async function loadMovies() {
    try {
        const { data: movies, error } = await supabase
            .from('movies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        allMovies = movies || [];
        filterMovies();

    } catch (error) {
        console.error('Error loading movies:', error);
        elements.moviesGrid.innerHTML = `
            <div class="no-movies">
                <p>Gagal memuat film. Silakan refresh halaman.</p>
            </div>
        `;
    }
}

// Handle search
function handleSearch() {
    currentSearch = elements.searchInput.value.trim().toLowerCase();
    filterMovies();
}

// Fungsi untuk mengacak array (Fisher-Yates shuffle)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Filter movies berdasarkan category, tab, dan search
function filterMovies() {
    let filteredMovies = [...allMovies];

    // Filter berdasarkan kategori (menggunakan kolom category dari database)
    if (currentCategory !== 'all') {
        filteredMovies = filteredMovies.filter(movie => {
            const movieCategory = movie.category?.toLowerCase() || 'lainnya';
            return movieCategory === currentCategory;
        });
    }

    // Filter berdasarkan tab dengan logika berbeda
    switch (currentTab) {
        case 'latest':
            // Untuk tab TERBARU: selalu urutkan berdasarkan created_at (yang paling baru di atas)
            filteredMovies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
            
        case 'popular':
            // Untuk tab POPULER: urutkan berdasarkan views
            filteredMovies.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
            
        case 'recommended':
        default:
            // Untuk tab REKOMENDASI: acak urutan film setiap kali di-refresh
            filteredMovies = shuffleArray(filteredMovies);
            break;
    }

    // Filter berdasarkan search
    if (currentSearch) {
        filteredMovies = filteredMovies.filter(movie => 
            movie.title?.toLowerCase().includes(currentSearch) ||
            movie.description?.toLowerCase().includes(currentSearch)
        );
    }

    displayMovies(filteredMovies);
}

// Display movies dengan thumbnail aspect ratio 9:16 dan info penonton
function displayMovies(movies) {
    if (!movies || movies.length === 0) {
        elements.moviesGrid.innerHTML = `
            <div class="no-movies">
                <p>Tidak ada film yang ditemukan.</p>
            </div>
        `;
        return;
    }

    elements.moviesGrid.innerHTML = movies.map(movie => {
        // Potong judul jika terlalu panjang (max 35 karakter)
        const title = movie.title.length > 35 ? movie.title.substring(0, 35) + '...' : movie.title;
        
        // Format jumlah penonton
        const views = movie.views || 0;
        const viewsText = views >= 1000 ? `${(views / 1000).toFixed(1)}K` : views.toString();
        
        return `
        <div class="movie-card" data-id="${movie.id}">
            <div class="movie-thumbnail-container">
                <img 
                    src="${movie.thumbnail_url || 'https://placehold.co/400x225?text=No+Thumbnail'}" 
                    alt="${movie.title}"
                    class="movie-thumbnail"
                    onerror="this.src='https://placehold.co/400x225?text=No+Thumbnail'"
                >
                ${movie.category ? `<div class="category-badge category-${movie.category}">${movie.category.toUpperCase()}</div>` : ''}
            </div>
            <div class="movie-info">
                <h3 class="movie-title" title="${movie.title}">${title}</h3>
                <div class="movie-meta">
                    <span class="movie-views">️▶ ${viewsText}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Add click event to movie cards
    elements.moviesGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const movieId = card.dataset.id;
            window.location.href = `detail.html?id=${movieId}`;
        });
    });
}