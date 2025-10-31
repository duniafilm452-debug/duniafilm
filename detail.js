import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Konfigurasi Supabase
const SUPABASE_URL = "https://kwuqrsnkxlxzqvimoydu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dXFyc25reGx4enF2aW1veWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ5ODUsImV4cCI6MjA3NDk5MDk4NX0.6XQjnexc69VVSzvB5XrL8gFGM54Me9c5TrR20ysfvTk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elemen HTML
const videoPlayer = document.getElementById("video-player");
const titleBelowEl = document.getElementById("movie-title-below");
const descEl = document.getElementById("movie-desc");
const viewCount = document.getElementById("view-count");
const likeBtn = document.getElementById("like-btn");
const favBtn = document.getElementById("fav-btn");
const shareBtn = document.getElementById("share-btn");
const likeCount = document.getElementById("like-count");
const commentList = document.getElementById("comment-list");
const commentInput = document.getElementById("comment-input");
const commentBtn = document.getElementById("comment-btn");
const recommendList = document.getElementById("recommend-list");
const toggleCommentsBtn = document.getElementById("toggle-comments");

// Popup
const popup = document.getElementById("login-popup");
const popupCancel = document.getElementById("popup-cancel");
const popupLogin = document.getElementById("popup-login");

// Data aplikasi
const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");
let currentUser = null;
let currentMovie = null;
let commentsExpanded = false;
let hasIncrementedViews = false;

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

// Fungsi inisialisasi
async function initializeApp() {
    showLoading(true);
    
    try {
        // Cek session user
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
        }

        await loadMovie();
        
    } catch (error) {
        console.error('Error in initializeApp:', error);
        showError('Gagal memuat aplikasi');
    } finally {
        showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    if (popupCancel) popupCancel.onclick = () => popup.classList.add("hidden");
    if (popupLogin) popupLogin.onclick = () => window.location.href = "loginuser.html";
    
    const backBtn = document.getElementById("back-btn");
    if (backBtn) backBtn.onclick = () => window.location.href = "index.html";
    
    // Comments
    if (commentBtn) commentBtn.onclick = postComment;
    if (commentInput) {
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                postComment();
            }
        });
    }
    if (toggleCommentsBtn) toggleCommentsBtn.onclick = toggleComments;
    
    // Actions
    if (likeBtn) likeBtn.onclick = handleLike;
    if (favBtn) favBtn.onclick = handleFavorite;
    if (shareBtn) shareBtn.onclick = handleShare;
    
    // Video events
    if (videoPlayer) {
        videoPlayer.addEventListener('load', handleVideoLoad);
        videoPlayer.addEventListener('play', handleVideoPlay);
        videoPlayer.addEventListener('error', handleVideoError);
    }

    // Auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await checkLikeStatus();
            await checkFavoriteStatus();
            if (popup) popup.classList.add("hidden");
            showSuccessPopup('Login berhasil!');
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            await checkLikeStatus();
            await checkFavoriteStatus();
        }
    });
}

// ===============================
// FUNGSI UTAMA
// ===============================

// Load movie data
async function loadMovie() {
    if (!movieId) {
        showError('ID film tidak ditemukan');
        return;
    }

    try {
        const { data, error } = await supabase
            .from("movies")
            .select("*")
            .eq("id", movieId)
            .single();

        if (error) {
            console.error('Error loading movie:', error);
            showError('Gagal memuat data film');
            return;
        }

        if (!data) {
            showError('Film tidak ditemukan');
            return;
        }

        currentMovie = data;
        if (titleBelowEl) titleBelowEl.textContent = data.title;
        if (descEl) descEl.textContent = data.description || "Tidak ada deskripsi.";

        // Update view count display
        if (viewCount) {
            viewCount.textContent = `👁️ ${data.views || 0} tayangan`;
        }

        // Process video URL
        let videoUrl = data.video_url;
        videoUrl = processVideoUrl(videoUrl);
        
        console.log('Video URL:', videoUrl);
        if (videoPlayer) videoPlayer.src = videoUrl;

        await Promise.all([
            loadComments(),
            loadRecommendations(),
            checkLikeStatus(),
            checkFavoriteStatus()
        ]);

    } catch (error) {
        console.error('Exception in loadMovie:', error);
        showError('Terjadi kesalahan saat memuat film');
    }
}

// Handle video load
function handleVideoLoad() {
    console.log('Video loaded, checking for view increment...');
    // Increment views when video is loaded and ready to play
    if (!hasIncrementedViews) {
        updateViewCount();
    }
}

// Handle video play
function handleVideoPlay() {
    console.log('Video started playing...');
    // Increment views when video starts playing (fallback)
    if (!hasIncrementedViews) {
        updateViewCount();
    }
}

// Process video URL untuk berbagai sumber
function processVideoUrl(videoUrl) {
    if (!videoUrl) return '';
    
    // YouTube URLs
    if (videoUrl.includes("youtube.com/watch?v=")) {
        const id = new URL(videoUrl).searchParams.get("v");
        return `https://www.youtube.com/embed/${id}?autoplay=0`;
    } else if (videoUrl.includes("youtu.be/")) {
        const id = videoUrl.split("youtu.be/")[1];
        return `https://www.youtube.com/embed/${id}?autoplay=0`;
    } 
    // Google Drive URLs
    else if (videoUrl.includes("drive.google.com")) {
        if (videoUrl.includes("/file/d/")) {
            const fileId = videoUrl.split('/file/d/')[1].split('/')[0];
            return `https://drive.google.com/file/d/${fileId}/preview`;
        } else if (videoUrl.includes("id=")) {
            const fileId = new URL(videoUrl).searchParams.get("id");
            return `https://drive.google.com/file/d/${fileId}/preview`;
        }
    } 
    // Supabase Storage URLs
    else if (!videoUrl.startsWith("http")) {
        const { data: urlData } = supabase.storage.from("videos").getPublicUrl(videoUrl);
        return urlData.publicUrl;
    }
    
    return videoUrl;
}

// Update view count - FIXED VERSION
async function updateViewCount() {
    if (!movieId || hasIncrementedViews) return;
    
    try {
        // Cek session storage untuk mencegah multiple increments
        const viewKey = `viewed_${movieId}`;
        const hasViewed = sessionStorage.getItem(viewKey);
        
        if (hasViewed) {
            console.log('Already viewed in this session');
            return;
        }

        console.log('Incrementing view count for movie:', movieId);
        
        // Method 1: Try RPC function first
        const { data: rpcData, error: rpcError } = await supabase.rpc('increment_views', {
            movie_id: movieId
        });
        
        if (rpcError) {
            console.log('RPC failed, trying direct update:', rpcError);
            
            // Method 2: Direct update sebagai fallback
            const { data: movieData } = await supabase
                .from("movies")
                .select("views")
                .eq("id", movieId)
                .single();
                
            if (movieData) {
                const newViews = (movieData.views || 0) + 1;
                const { error: updateError } = await supabase
                    .from("movies")
                    .update({ views: newViews })
                    .eq("id", movieId);
                    
                if (updateError) {
                    console.error('Direct update also failed:', updateError);
                    throw updateError;
                }
                
                console.log('Direct update successful, new views:', newViews);
                
                // Update display
                if (viewCount) {
                    viewCount.textContent = `👁️ ${newViews} tayangan`;
                }
            }
        } else {
            console.log('RPC increment successful');
            
            // Refresh view count display
            const { data: updatedMovie } = await supabase
                .from("movies")
                .select("views")
                .eq("id", movieId)
                .single();
                
            if (updatedMovie && viewCount) {
                viewCount.textContent = `️ ${updatedMovie.views || 0} tayangan`;
            }
        }
        
        // Tandai sudah di-increment dalam session ini
        sessionStorage.setItem(viewKey, 'true');
        hasIncrementedViews = true;
        
        // Record watch history jika user login
        await recordWatchHistory();
        
    } catch (error) {
        console.error('Exception in updateViewCount:', error);
        // Tetap tampilkan error tapi jangan ganggu user experience
    }
}

// Record watch history
async function recordWatchHistory() {
    if (!currentUser || !movieId) return;
    
    try {
        await supabase
            .from("watch_history")
            .upsert({
                user_id: currentUser.id,
                movie_id: movieId,
                last_watched: new Date().toISOString()
            });
    } catch (error) {
        console.error('Exception in recordWatchHistory:', error);
    }
}

// Load comments
async function loadComments() {
    if (!movieId) return;
    
    try {
        if (commentList) commentList.innerHTML = '<div class="loading-comments">Memuat komentar...</div>';
        
        // Coba query dengan join terlebih dahulu
        const { data, error } = await supabase
            .from("comments")
            .select(`
                *,
                profiles (
                    username,
                    avatar_url
                )
            `)
            .eq("movie_id", movieId)
            .order("created_at", { ascending: false });
            
        if (error) {
            // Fallback ke query tanpa join jika error
            await loadCommentsFallback();
            return;
        }
        
        renderComments(data || []);
        
    } catch (error) {
        console.error('Exception in loadComments:', error);
        await loadCommentsFallback();
    }
}

// Fallback load comments tanpa join
async function loadCommentsFallback() {
    try {
        const { data, error } = await supabase
            .from("comments")
            .select("*")
            .eq("movie_id", movieId)
            .order("created_at", { ascending: false });
            
        if (error) throw error;
        
        renderCommentsSimple(data || []);
        
    } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        if (commentList) commentList.innerHTML = '<div class="loading-comments">Gagal memuat komentar.</div>';
    }
}

// Render comments dengan data profiles
function renderComments(comments) {
    if (!commentList) return;
    
    if (!comments.length) {
        commentList.innerHTML = '<div class="loading-comments">Belum ada komentar. Jadilah yang pertama berkomentar!</div>';
        return;
    }
    
    commentList.innerHTML = comments.map(comment => `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-user">
                    <div class="comment-avatar-placeholder">${(comment.profiles?.username || 'U').charAt(0).toUpperCase()}</div>
                    <span class="comment-username">${comment.profiles?.username || 'User'}</span>
                </div>
                ${currentUser && comment.user_id === currentUser.id ? 
                    `<button class="comment-delete" onclick="deleteComment('${comment.id}')">Hapus</button>` : ''
                }
            </div>
            <p class="comment-text">${escapeHtml(comment.comment_text)}</p>
            <div class="comment-time">${formatTimeAgo(comment.created_at)}</div>
        </div>
    `).join('');
}

// Render comments tanpa data profiles
function renderCommentsSimple(comments) {
    if (!commentList) return;
    
    if (!comments.length) {
        commentList.innerHTML = '<div class="loading-comments">Belum ada komentar. Jadilah yang pertama berkomentar!</div>';
        return;
    }
    
    commentList.innerHTML = comments.map(comment => `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-user">
                    <div class="comment-avatar-placeholder">U</div>
                    <span class="comment-username">User</span>
                </div>
                ${currentUser && comment.user_id === currentUser.id ? 
                    `<button class="comment-delete" onclick="deleteComment('${comment.id}')">Hapus</button>` : ''
                }
            </div>
            <p class="comment-text">${escapeHtml(comment.comment_text)}</p>
            <div class="comment-time">${formatTimeAgo(comment.created_at)}</div>
        </div>
    `).join('');
}

// Post comment
async function postComment() {
    if (!currentUser) {
        showLoginPopup("berkomentar");
        return;
    }
    
    const commentText = commentInput ? commentInput.value.trim() : '';
    
    if (!commentText) {
        showError('Komentar tidak boleh kosong');
        return;
    }
    
    try {
        const { error } = await supabase
            .from("comments")
            .insert({
                movie_id: movieId,
                user_id: currentUser.id,
                comment_text: commentText
            });
            
        if (error) throw error;
        
        if (commentInput) commentInput.value = '';
        await loadComments();
        showSuccessPopup('Komentar berhasil dikirim!');
        
    } catch (error) {
        console.error('Exception in postComment:', error);
        showError('Gagal mengirim komentar');
    }
}

// Delete comment
async function deleteComment(commentId) {
    if (!confirm('Hapus komentar ini?')) return;
    
    try {
        const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", currentUser.id);
            
        if (error) throw error;
        
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentElement) {
            commentElement.remove();
        }
        showSuccessPopup('Komentar berhasil dihapus!');
        
    } catch (error) {
        console.error('Exception in deleteComment:', error);
        showError('Gagal menghapus komentar');
    }
}

// Handle like
async function handleLike() {
    if (!currentUser) {
        showLoginPopup("menyukai film");
        return;
    }
    
    try {
        const { data: existingLike } = await supabase
            .from("likes")
            .select("id")
            .eq("movie_id", movieId)
            .eq("user_id", currentUser.id)
            .single();
            
        if (existingLike) {
            await supabase.from("likes").delete().eq("id", existingLike.id);
            if (likeBtn) likeBtn.classList.remove("liked");
            showSuccessPopup('Like dihapus');
        } else {
            await supabase.from("likes").insert({
                movie_id: movieId,
                user_id: currentUser.id
            });
            if (likeBtn) likeBtn.classList.add("liked");
            showSuccessPopup('Film disukai!');
        }
        
        await updateLikeCount();
        
    } catch (error) {
        console.error('Exception in handleLike:', error);
        showError('Gagal memperbarui like');
    }
}

// Handle favorite
async function handleFavorite() {
    if (!currentUser) {
        showLoginPopup("menambah favorit");
        return;
    }
    
    try {
        const { data: existingFav } = await supabase
            .from("favorites")
            .select("id")
            .eq("movie_id", movieId)
            .eq("user_id", currentUser.id)
            .single();
            
        if (existingFav) {
            await supabase.from("favorites").delete().eq("id", existingFav.id);
            if (favBtn) favBtn.classList.remove("favorited");
            showSuccessPopup('Dihapus dari favorit');
        } else {
            await supabase.from("favorites").insert({
                movie_id: movieId,
                user_id: currentUser.id
            });
            if (favBtn) favBtn.classList.add("favorited");
            showSuccessPopup('Ditambahkan ke favorit!');
        }
        
    } catch (error) {
        console.error('Exception in handleFavorite:', error);
        showError('Gagal memperbarui favorit');
    }
}

// Handle share
function handleShare() {
    const shareUrl = window.location.href;
    const shareText = `Tonton "${currentMovie?.title || 'Film Menarik'}" di Dunia Film`;
    
    if (navigator.share) {
        navigator.share({
            title: currentMovie?.title || 'Dunia Film',
            text: shareText,
            url: shareUrl
        }).catch(err => {
            fallbackShare(shareUrl);
        });
    } else {
        fallbackShare(shareUrl);
    }
}

// Fallback share
function fallbackShare(url) {
    navigator.clipboard.writeText(url).then(() => {
        showSuccessPopup('Link berhasil disalin!');
    }).catch(err => {
        prompt('Salin link berikut:', url);
    });
}

// Check like status
async function checkLikeStatus() {
    if (!currentUser || !movieId) {
        if (likeBtn) likeBtn.classList.remove("liked");
        return;
    }
    
    try {
        const { data } = await supabase
            .from("likes")
            .select("id")
            .eq("movie_id", movieId)
            .eq("user_id", currentUser.id)
            .single();
            
        if (data) {
            if (likeBtn) likeBtn.classList.add("liked");
        } else {
            if (likeBtn) likeBtn.classList.remove("liked");
        }
        
        await updateLikeCount();
        
    } catch (error) {
        console.error('Exception in checkLikeStatus:', error);
    }
}

// Check favorite status
async function checkFavoriteStatus() {
    if (!currentUser || !movieId) {
        if (favBtn) favBtn.classList.remove("favorited");
        return;
    }
    
    try {
        const { data } = await supabase
            .from("favorites")
            .select("id")
            .eq("movie_id", movieId)
            .eq("user_id", currentUser.id)
            .single();
            
        if (data) {
            if (favBtn) favBtn.classList.add("favorited");
        } else {
            if (favBtn) favBtn.classList.remove("favorited");
        }
        
    } catch (error) {
        console.error('Exception in checkFavoriteStatus:', error);
    }
}

// Update like count
async function updateLikeCount() {
    if (!movieId) return;
    
    try {
        const { count } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("movie_id", movieId);
            
        if (likeCount) likeCount.textContent = count || 0;
        
    } catch (error) {
        console.error('Exception in updateLikeCount:', error);
    }
}

// Load recommendations
async function loadRecommendations() {
    if (!movieId) return;
    
    try {
        if (recommendList) recommendList.innerHTML = '<div class="loading-recommendations">Memuat rekomendasi...</div>';
        
        const { data, error } = await supabase
            .from("movies")
            .select("*")
            .neq("id", movieId)
            .limit(6)
            .order("created_at", { ascending: false });
            
        if (error) throw error;
        
        renderRecommendations(data || []);
        
    } catch (error) {
        console.error('Exception in loadRecommendations:', error);
        if (recommendList) recommendList.innerHTML = '<div class="loading-recommendations">Gagal memuat rekomendasi.</div>';
    }
}

// Render recommendations
function renderRecommendations(movies) {
    if (!recommendList) return;
    
    if (!movies.length) {
        recommendList.innerHTML = '<div class="loading-recommendations">Tidak ada rekomendasi.</div>';
        return;
    }
    
    recommendList.innerHTML = movies.map(movie => `
        <div class="recommend-item" onclick="location.href='detail.html?id=${movie.id}'">
            <img src="${movie.thumbnail_url || 'https://via.placeholder.com/200x120?text=No+Thumbnail'}" 
                 alt="${movie.title}" 
                 onerror="this.src='https://via.placeholder.com/200x120?text=No+Thumbnail'">
            <p>${escapeHtml(movie.title)}</p>
        </div>
    `).join('');
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

// Toggle comments
function toggleComments() {
    if (!commentList || !toggleCommentsBtn) return;
    
    commentsExpanded = !commentsExpanded;
    
    if (commentsExpanded) {
        commentList.classList.remove("comments-collapsed");
        commentList.classList.add("comments-expanded");
        toggleCommentsBtn.textContent = "Sembunyikan";
    } else {
        commentList.classList.remove("comments-expanded");
        commentList.classList.add("comments-collapsed");
        toggleCommentsBtn.textContent = "Lihat Semua";
    }
}

// Show login popup
function showLoginPopup(action = "melakukan aksi ini") {
    const popupText = document.querySelector(".login-popup p");
    if (popupText) popupText.textContent = `Untuk ${action}, silakan login terlebih dahulu.`;
    if (popup) popup.classList.remove("hidden");
}

// Loading state
function showLoading(show) {
    let loadingEl = document.getElementById('loading-overlay');
    if (!loadingEl && show) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loading-overlay';
        loadingEl.className = 'loading-overlay';
        loadingEl.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Memuat...</p>
        `;
        document.body.appendChild(loadingEl);
    } else if (loadingEl && !show) {
        loadingEl.remove();
    }
}

// Error handling
function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-popup popup-overlay';
    errorEl.innerHTML = `
        <div class="popup-box error-popup">
            <div class="popup-icon">❌</div>
            <h3>Error</h3>
            <p>${message}</p>
            <button class="popup-ok-btn" onclick="this.parentElement.parentElement.remove()">OK</button>
        </div>
    `;
    document.body.appendChild(errorEl);
}

// Success popup
function showSuccessPopup(message) {
    const successEl = document.createElement('div');
    successEl.className = 'success-popup popup-overlay';
    successEl.innerHTML = `
        <div class="popup-box success-popup">
            <div class="popup-icon">✅</div>
            <h3>Sukses</h3>
            <p>${message}</p>
            <button class="popup-ok-btn" onclick="this.parentElement.parentElement.remove()">OK</button>
        </div>
    `;
    document.body.appendChild(successEl);
    
    setTimeout(() => {
        if (successEl.parentElement) {
            successEl.remove();
        }
    }, 3000);
}

// Handle video error
function handleVideoError() {
    if (!videoPlayer) return;
    
    const errorMessage = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 3rem; margin-bottom: 15px;">📹</div>
            <h3>Video Tidak Dapat Diputar</h3>
            <p>Silakan coba beberapa saat lagi atau hubungi administrator.</p>
            <button onclick="location.reload()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                margin-top: 15px;
            ">Coba Lagi</button>
        </div>
    `;
    videoPlayer.outerHTML = errorMessage;
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID');
}

// Global functions
window.deleteComment = deleteComment;
window.handleVideoError = handleVideoError;