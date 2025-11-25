// detail.js (NO VIDEO ADS VERSION - BANNER ONLY)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// ⚠️ PENTING: Pastikan Row Level Security (RLS) diaktifkan di Supabase Anda!
const SUPABASE_URL = "https://kwuqrsnkxlxzqvimoydu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dXFyc25reGx4enF2aW1veWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ5ODUsImV4cCI6MjA3NDk5MDk4NX0.6XQjnexc69VVSzvB5XrL8gFGM54Me9c5TrR20ysfvTk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ------------------------
// DOM ELEMENTS
// ------------------------
let videoPlayer;
const titleBelowEl = document.getElementById("movie-title-below");
const descEl = document.getElementById("movie-desc");
const viewCount = document.getElementById("view-count");
const likeBtn = document.getElementById("like-btn");
const favBtn = document.getElementById("fav-btn");
const shareBtn = document.getElementById("share-btn");
const likeCount = document.getElementById("like-count");
const recommendList = document.getElementById("recommend-list");
const toggleDescBtn = document.getElementById("toggle-desc-btn");

const episodesTab = document.getElementById("episodes-tab");
const recommendationsTab = document.getElementById("recommendations-tab");
const episodesContent = document.getElementById("episodes-content");
const recommendationsContent = document.getElementById("recommendations-content");
const episodesList = document.getElementById("episodes-list");

const popup = document.getElementById("login-popup");
const popupCancel = document.getElementById("popup-cancel");
const popupLogin = document.getElementById("popup-login");

// ------------------------
// STATE
// ------------------------
const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");
let currentUser = null;
let currentMovie = null;
let hasIncrementedViews = false;

// ------------------------
// INITIALIZATION
// ------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  setupEventListeners();
});

async function initializeApp() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) currentUser = session.user;

    await loadMovie();
  } catch (err) {
    console.error('Init Error', err);
    showError('Gagal memuat aplikasi. Periksa koneksi internet.');
  }
}

// ------------------------
// EVENT LISTENERS
// ------------------------
function setupEventListeners() {
  if (popupCancel) popupCancel.onclick = () => popup.classList.add("hidden");
  if (popupLogin) popupLogin.onclick = () => window.location.href = "loginuser.html";

  const backBtn = document.getElementById("back-btn");
  if (backBtn) backBtn.onclick = () => window.location.href = "index.html";

  if (likeBtn) likeBtn.onclick = handleLike;
  if (favBtn) favBtn.onclick = handleFavorite;
  if (shareBtn) shareBtn.onclick = handleShare;

  if (episodesTab) episodesTab.onclick = () => switchTab('episodes');
  if (recommendationsTab) recommendationsTab.onclick = () => switchTab('recommendations');

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await Promise.all([checkLikeStatus(), checkFavoriteStatus()]);
      if (popup) popup.classList.add("hidden");
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
    }
  });
}

// ------------------------
// CORE LOGIC
// ------------------------
async function loadMovie() {
  if (!movieId) return showError('ID film tidak ditemukan di URL');

  try {
    const { data, error } = await supabase.from("movies").select("*").eq("id", movieId).single();
    if (error || !data) throw new Error('Film tidak ditemukan');

    currentMovie = data;
    await displayMovieData();
    await Promise.all([checkLikeStatus(), checkFavoriteStatus()]);

    const seriesTitle = extractSeriesTitle(currentMovie.title);
    if (seriesTitle) {
      switchTab('episodes');
    } else {
      switchTab('recommendations');
    }
  } catch (err) {
    console.error(err);
    showError('Gagal memuat data film.');
  }
}

async function displayMovieData() {
  if (titleBelowEl) titleBelowEl.textContent = currentMovie.title;
  if (descEl) {
    descEl.textContent = currentMovie.description || "Tidak ada deskripsi.";
    checkDescriptionLength();
  }
  if (viewCount) viewCount.textContent = `👁️ ${currentMovie.views || 0} tayangan`;
  if (likeCount) {
    // Hitung total like dari tabel (opsional, untuk akurasi saat load pertama)
    const { count } = await supabase.from("likes").select("*", { count: 'exact', head: true }).eq('movie_id', currentMovie.id);
    likeCount.textContent = count || 0;
  }

  let videoUrl = currentMovie.video_url;
  videoUrl = await processVideoUrl(videoUrl);

  videoPlayer = document.getElementById("video-player");
  if (!videoPlayer) return;

  const isEmbed = videoUrl.includes('youtube.com/embed') || videoUrl.includes('drive.google.com') || (videoUrl.includes('gofile.io') && !videoUrl.endsWith('.mp4'));

  if (isEmbed) {
    videoPlayer.src = videoUrl;
    videoPlayer.style.display = 'block';
    // Iklan dihapus, langsung main
  } else {
    replaceIframeWithVideoPlayer(videoUrl);
  }
}

// ------------------------
// VIDEO PLAYER LOGIC
// ------------------------
function replaceIframeWithVideoPlayer(videoUrl) {
  const oldPlayer = document.getElementById('video-player');
  const newVideo = document.createElement('video');
  newVideo.id = 'video-player';
  newVideo.controls = true;
  newVideo.playsInline = true;
  newVideo.setAttribute('webkit-playsinline', 'true');
  newVideo.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain;";
  newVideo.src = videoUrl;
  
  oldPlayer.replaceWith(newVideo);
  videoPlayer = newVideo;

  videoPlayer.addEventListener('loadeddata', () => {
    console.log('Video ready');
    updateViewCount();
  });
  
  videoPlayer.addEventListener('play', () => {
    if (!hasIncrementedViews) updateViewCount();
  });

  videoPlayer.addEventListener('error', () => {
    showError('Gagal memutar video. Format mungkin tidak didukung atau link kadaluarsa.');
  });
}

async function processVideoUrl(url) {
  if (!url) return '';
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.includes("v=") ? new URL(url).searchParams.get("v") : url.split("/").pop();
    return `https://www.youtube.com/embed/${id}?autoplay=0`;
  }
  if (!url.startsWith("http")) {
    const { data } = supabase.storage.from("videos").getPublicUrl(url);
    return data.publicUrl;
  }
  return url; 
}

// ------------------------
// TAB & CONTENT LOGIC
// ------------------------
function switchTab(tab) {
  if (episodesTab) episodesTab.classList.toggle('active', tab === 'episodes');
  if (recommendationsTab) recommendationsTab.classList.toggle('active', tab === 'recommendations');
  if (episodesContent) episodesContent.classList.toggle('active', tab === 'episodes');
  if (recommendationsContent) recommendationsContent.classList.toggle('active', tab === 'recommendations');
  
  if (tab === 'episodes') loadEpisodes();
  else loadRecommendations();
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function loadEpisodes() {
  if (!currentMovie) return;
  const seriesTitle = extractSeriesTitle(currentMovie.title);
  
  if (!seriesTitle) {
      episodesList.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#aaa;">Tidak ada episode lain.</div>';
      return;
  }

  const { data } = await supabase.from("movies")
      .select("id, title, thumbnail_url, views, duration")
      .ilike("title", `${seriesTitle}%`)
      .order("created_at", { ascending: true });

  if (!data || data.length === 0) {
      episodesList.innerHTML = '<div style="grid-column:1/-1;">Tidak ada data.</div>';
      return;
  }

  episodesList.innerHTML = data.map(m => {
      const isCurr = m.id === currentMovie.id ? 'current' : '';
      const epsNum = extractEpisodeNumber(m.title);
      return `
        <div class="episode-item ${isCurr}" onclick="handleEpisodeNavigation('${m.id}')">
          <div class="episode-thumbnail-container">
            <img src="${escapeHtml(m.thumbnail_url)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x169?text=No+Image'">
          </div>
          <div class="episode-info">
            <div class="episode-number">${epsNum ? 'Episode '+epsNum : ''}</div>
            <p class="episode-title">${escapeHtml(m.title)}</p>
            <div class="episode-meta">
              <span>👁️ ${m.views||0}</span>
              <span>${escapeHtml(m.duration||'')}</span>
            </div>
          </div>
        </div>
      `;
  }).join('');
}

async function loadRecommendations() {
    if (!currentMovie) return;
    
    const RECOMMENDATION_LIMIT = 12;
    let finalMovies = [];
    let existingIds = new Set(); 
    existingIds.add(currentMovie.id);

    try {
        if (currentMovie.genre) {
            const mainGenre = currentMovie.genre.split(',')[0].trim();
            const { data: genreData } = await supabase
                .from("movies")
                .select("id, title, thumbnail_url, views, genre")
                .neq("id", currentMovie.id)
                .ilike("genre", `%${mainGenre}%`)
                .limit(RECOMMENDATION_LIMIT);

            if (genreData && genreData.length > 0) {
                finalMovies = [...genreData];
                genreData.forEach(m => existingIds.add(m.id));
            }
        }

        if (finalMovies.length < RECOMMENDATION_LIMIT) {
            const slotsNeeded = RECOMMENDATION_LIMIT - finalMovies.length;
            const { data: randomData } = await supabase
                .from("movies")
                .select("id, title, thumbnail_url, views, genre")
                .neq("id", currentMovie.id)
                .limit(40); 

            if (randomData && randomData.length > 0) {
                const uniqueRandoms = randomData.filter(m => !existingIds.has(m.id));
                const shuffled = uniqueRandoms.sort(() => 0.5 - Math.random());
                const fillers = shuffled.slice(0, slotsNeeded);
                finalMovies = [...finalMovies, ...fillers];
            }
        }

        if (finalMovies.length === 0) {
            recommendList.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#888;">Belum ada rekomendasi.</div>';
            return;
        }

        recommendList.innerHTML = finalMovies.map(m => `
          <div class="recommend-item" onclick="handleRecommendationNavigation('${m.id}')">
            <div class="recommend-thumbnail-container">
              <img src="${escapeHtml(m.thumbnail_url)}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
            </div>
            <div class="recommend-info">
              <p class="recommend-title-text">${escapeHtml(m.title)}</p>
              <div class="recommend-meta">
                <span>👁️ ${m.views || 0}</span>
                ${m.genre ? `<span class="genre">${escapeHtml(m.genre.split(',')[0])}</span>` : ''}
              </div>
            </div>
          </div>
        `).join('');

    } catch (err) {
        console.error('Recommendation Error:', err);
        recommendList.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#888;">Gagal memuat rekomendasi.</div>';
    }
}

// ------------------------
// UTILS
// ------------------------
function extractSeriesTitle(title) {
  if (!title) return null;
  const match = title.match(/(.*?)\s*(?:Episode|Ep|Part|Ch)\s*\d+/i);
  return match ? match[1].trim() : null;
}

function extractEpisodeNumber(title) {
  const match = title.match(/(?:Episode|Ep|Part)\s*(\d+)/i);
  return match ? match[1] : '';
}

function checkDescriptionLength() {
  if (descEl.scrollHeight > descEl.clientHeight) {
      toggleDescBtn.classList.remove('hidden');
      toggleDescBtn.onclick = () => {
          descEl.classList.toggle('description-collapsed');
          toggleDescBtn.textContent = descEl.classList.contains('description-collapsed') ? 'Selengkapnya' : 'Sembunyikan';
      };
      descEl.classList.add('description-collapsed');
  }
}

function showError(msg) {
    const d = document.createElement('div');
    d.innerHTML = `<div class="popup-overlay"><div class="popup-box error-popup"><h3>Error</h3><p>${msg}</p><button onclick="this.parentElement.parentElement.remove()" class="popup-ok-btn">OK</button></div></div>`;
    document.body.appendChild(d.firstChild);
}

// Update View Count Logic
async function updateViewCount() {
    if (hasIncrementedViews || !currentMovie) return;
    hasIncrementedViews = true;
    const viewKey = `viewed_${currentMovie.id}`;
    if (sessionStorage.getItem(viewKey)) return;

    await supabase.rpc('increment_views', { movie_id: currentMovie.id });
    sessionStorage.setItem(viewKey, '1');
}

// Like & Fav Logic Simpel (DIPERBAIKI DENGAN UI UPDATE REALTIME)
async function checkLikeStatus() {
    if (!currentUser) return;
    const { data } = await supabase.from("likes").select("id").match({movie_id: currentMovie.id, user_id: currentUser.id});
    if (likeBtn) data && data.length ? likeBtn.classList.add("liked") : likeBtn.classList.remove("liked");
}
async function checkFavoriteStatus() {
    if (!currentUser) return;
    const { data } = await supabase.from("favorites").select("id").match({movie_id: currentMovie.id, user_id: currentUser.id});
    if (favBtn) data && data.length ? favBtn.classList.add("favorited") : favBtn.classList.remove("favorited");
}

async function handleLike() {
    if (!currentUser) return popup.classList.remove("hidden");
    
    // UI Update Optimistic (Langsung berubah sebelum request selesai)
    const isLiked = likeBtn.classList.contains("liked");
    let currentCount = parseInt(likeCount.innerText) || 0;

    if (isLiked) {
        // Un-like
        likeBtn.classList.remove("liked");
        likeCount.innerText = Math.max(0, currentCount - 1);
        await supabase.from("likes").delete().match({movie_id: currentMovie.id, user_id: currentUser.id});
    } else {
        // Like
        likeBtn.classList.add("liked");
        likeCount.innerText = currentCount + 1;
        await supabase.from("likes").insert({movie_id: currentMovie.id, user_id: currentUser.id});
    }
}

async function handleFavorite() {
    if (!currentUser) return popup.classList.remove("hidden");
    
    // UI Update Optimistic
    const isFav = favBtn.classList.contains("favorited");
    if (isFav) {
        favBtn.classList.remove("favorited");
        await supabase.from("favorites").delete().match({movie_id: currentMovie.id, user_id: currentUser.id});
    } else {
        favBtn.classList.add("favorited");
        await supabase.from("favorites").insert({movie_id: currentMovie.id, user_id: currentUser.id});
    }
}

function handleShare() {
    const data = { title: currentMovie.title, url: window.location.href };
    if (navigator.share) navigator.share(data);
    else {
        navigator.clipboard.writeText(data.url);
        alert('Link disalin!');
    }
}

// Global Expose
window.handleEpisodeNavigation = (id) => window.location.href = `detail.html?id=${id}`;
window.handleRecommendationNavigation = (id) => window.location.href = `detail.html?id=${id}`;