// Ads Management untuk DuniaFilm
class AdsManager {
    constructor() {
        this.adSlots = {};
        this.stickyAdShown = false;
        this.init();
    }

    init() {
        this.initializeAdSlots();
        this.loadGoogleAds();
        this.setupStickyAd();
    }

    initializeAdSlots() {
        // Definisikan slot iklan
        this.adSlots = {
            'top-banner': {
                element: 'ad-top-banner',
                size: [728, 90],
                sizeMapping: {
                    mobile: [300, 50],
                    tablet: [468, 60],
                    desktop: [728, 90]
                }
            },
            'in-article': {
                element: 'ad-in-article',
                size: [300, 250],
                sizeMapping: {
                    mobile: [300, 250],
                    tablet: [300, 250],
                    desktop: [300, 250]
                }
            },
            'sticky-bottom': {
                element: 'ad-sticky-bottom',
                size: [320, 50],
                sizeMapping: {
                    mobile: [300, 50],
                    tablet: [320, 50],
                    desktop: [320, 50]
                }
            }
        };
    }

    loadGoogleAds() {
        // Initialize GPT
        googletag.cmd.push(() => {
            // Define ad slots
            Object.keys(this.adSlots).forEach(slotName => {
                const slotConfig = this.adSlots[slotName];
                const element = document.getElementById(slotConfig.element);
                
                if (element) {
                    const slot = googletag.defineSlot('/22100121536/DuniaFilm_' + slotName.replace('-', '_').toUpperCase(), 
                                                     this.getAdSize(slotConfig), 
                                                     slotConfig.element)
                                         .addService(googletag.pubads());
                    
                    // Apply targeting
                    googletag.pubads().setTargeting('category', ['entertainment', 'movies']);
                    googletag.pubads().setTargeting('page', ['homepage']);
                }
            });

            // Enable services
            googletag.pubads().enableSingleRequest();
            googletag.pubads().collapseEmptyDivs();
            googletag.enableServices();

            // Display ads
            Object.keys(this.adSlots).forEach(slotName => {
                const element = document.getElementById(this.adSlots[slotName].element);
                if (element && element.offsetParent !== null) {
                    googletag.display(this.adSlots[slotName].element);
                }
            });
        });

        // Fallback ads jika GPT tidak tersedia
        this.setupFallbackAds();
    }

    getAdSize(slotConfig) {
        const width = window.innerWidth;
        
        if (width < 768) {
            return slotConfig.sizeMapping.mobile;
        } else if (width < 1024) {
            return slotConfig.sizeMapping.tablet;
        } else {
            return slotConfig.sizeMapping.desktop;
        }
    }

    setupStickyAd() {
        // Tampilkan sticky ad setelah 30 detik
        setTimeout(() => {
            this.showStickyAd();
        }, 30000);

        // Atau ketika user scroll ke bawah 75%
        window.addEventListener('scroll', () => {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercent > 75 && !this.stickyAdShown) {
                this.showStickyAd();
            }
        });
    }

    showStickyAd() {
        if (this.stickyAdShown) return;
        
        const stickyAd = document.querySelector('.ad-sticky-bottom');
        if (stickyAd) {
            stickyAd.style.display = 'flex';
            stickyAd.style.animation = 'fadeInUp 0.5s ease-out';
            this.stickyAdShown = true;

            // Auto hide setelah 15 detik
            setTimeout(() => {
                this.hideStickyAd();
            }, 15000);
        }
    }

    hideStickyAd() {
        const stickyAd = document.querySelector('.ad-sticky-bottom');
        if (stickyAd) {
            stickyAd.style.animation = 'fadeOutDown 0.5s ease-out';
            setTimeout(() => {
                stickyAd.style.display = 'none';
            }, 500);
        }
    }

    setupFallbackAds() {
        // Fallback untuk ad top banner
        const topBanner = document.getElementById('ad-top-banner');
        if (topBanner && topBanner.innerHTML.trim() === '') {
            setTimeout(() => {
                if (topBanner.innerHTML.trim() === '') {
                    topBanner.innerHTML = this.createFallbackAd('Partner Kami', 'Dukung kami dengan menonaktifkan adblock');
                }
            }, 2000);
        }

        // Fallback untuk in-article ad
        const inArticle = document.getElementById('ad-in-article');
        if (inArticle && inArticle.innerHTML.trim() === '') {
            setTimeout(() => {
                if (inArticle.innerHTML.trim() === '') {
                    inArticle.innerHTML = this.createFallbackAd('Sponsor', 'Iklan membantu kami menyediakan konten gratis');
                }
            }, 3000);
        }
    }

    createFallbackAd(title, message) {
        return `
            <div class="fallback-ad">
                <div class="ad-label">Iklan</div>
                <div class="fallback-ad-content">
                    <h4>${title}</h4>
                    <p>${message}</p>
                    <small>Terima kasih atas dukungannya</small>
                </div>
            </div>
        `;
    }
}

// Fungsi global untuk menutup sticky ad
function closeStickyAd() {
    const adsManager = window.adsManager;
    if (adsManager) {
        adsManager.hideStickyAd();
    }
}

// Initialize ads manager ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.adsManager = new AdsManager();
});

// CSS untuk fallback ads
const fallbackStyles = `
    .fallback-ad {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-align: center;
        border-radius: 8px;
    }

    .fallback-ad-content h4 {
        margin-bottom: 8px;
        font-size: 1.1rem;
    }

    .fallback-ad-content p {
        margin-bottom: 5px;
        font-size: 0.9rem;
        opacity: 0.9;
    }

    .fallback-ad-content small {
        font-size: 0.7rem;
        opacity: 0.7;
    }

    @keyframes fadeOutDown {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
    }
`;

// Inject fallback styles
const styleSheet = document.createElement('style');
styleSheet.textContent = fallbackStyles;
document.head.appendChild(styleSheet);