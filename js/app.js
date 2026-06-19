// =========================================================================
// AMS PRO - APP CONTROLLER & SPA ROUTER (MODULAR V1.4 - MULTI-FILTER)
// =========================================================================

const MASTER_GAS_URL = "https://script.google.com/macros/s/AKfycbxdnEun8-kSEK_9c0j8kQXMD6VNU8q_D-xGV-33dQ8SM6uuLZiGjDewh-RNPWq4YBHk/exec";

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const clientToken = params.get('token') || 'mrd';

    const navBrandTitle = document.getElementById("navBrandTitle");
    if (navBrandTitle) {
        navBrandTitle.innerHTML = `<i class="fas fa-motorcycle me-2 text-warning"></i> ${clientToken.toUpperCase()} - Unit Monitor`;
    }

    if (window.AMSDatabase) {
        window.AMSDatabase.init(clientToken, MASTER_GAS_URL);
    }

    initUIOrchestrator(clientToken);
});

/**
 * ⚙️ PENGATUR ALUR ANTARMUKA (UI ORCHESTRATOR)
 */
function initUIOrchestrator(clientToken) {
    const sidebar = document.getElementById("appSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const btnHamburger = document.getElementById("btnHamburger");
    const btnSync = document.getElementById("btnSync");
    const lblHeaderTitle = document.getElementById("lblHeaderTitle");
    const tabButtons = document.querySelectorAll(".nav-tab-btn");
    const appViews = document.querySelectorAll(".app-view");
    const fabAddUnit = document.getElementById("btnFabAddUnit");

    // Elemen Pencarian & Saringan Header
    const btnSearchTrigger = document.getElementById("btnHeaderSearchTrigger");
    const headerSearchBar = document.getElementById("headerSearchBar");
    const btnCloseSearch = document.getElementById("btnCloseHeaderSearch");
    const txtHeaderSearch = document.getElementById("txtHeaderSearch");
    const filterChips = document.querySelectorAll(".badge-chip");

    let lastActiveTab = "dashboard";
    let isSubViewActive = false;

    /**
     * 🔄 SWITCH VIEW SPA DENGAN EFFECT SMOOTH (SLIDE-IN ACCELERATION)
     */
    window.switchViewSPA = function(viewId, customTitle, isSubView = false) {
        appViews.forEach(view => {
            view.classList.add("d-none");
            view.classList.remove("active-view");
        });
        
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.remove("d-none");
            targetView.offsetHeight; 
            targetView.classList.add("active-view");
        }

        lblHeaderTitle.innerText = customTitle;
        isSubViewActive = isSubView;

        // RESET PENYARINGAN SAAT BERPINDAH TAB (Mencegah kebocoran filter antar halaman)
        if (headerSearchBar) {
            headerSearchBar.classList.add("d-none");
            if (txtHeaderSearch) txtHeaderSearch.value = "";
            filterChips.forEach(chip => {
                if (chip.getAttribute("data-filter") === "all") chip.classList.add("active");
                else chip.classList.remove("active");
            });
            window.filterActiveViewContent(); // Kembalikan visibilitas default semua baris
        }

        // ANIMASI NAVIGASI HEADER: Hamburger vs Back Arrow (<-)
        const hamburgerIcon = btnHamburger.querySelector("i");
        if (isSubView) {
            hamburgerIcon.className = "fas fa-arrow-left text-white";
            if (fabAddUnit) fabAddUnit.classList.add("d-none");
        } else {
            hamburgerIcon.className = "fas fa-bars text-white";
            lastActiveTab = viewId;
            
            tabButtons.forEach(btn => {
                if (btn.getAttribute("data-tab") === viewId) btn.classList.add("active");
                else btn.classList.remove("active");
            });

            if (viewId === "dashboard" && fabAddUnit) {
                fabAddUnit.classList.remove("d-none");
            } else {
                if (fabAddUnit) fabAddUnit.classList.add("d-none");
            }
        }
    };

    // A. TOGGLE BUTTON (HAMBURGER / BACK ARROW)
    btnHamburger.addEventListener("click", () => {
        if (isSubViewActive) {
            window.switchViewSPA(lastActiveTab, lastActiveTab.charAt(0).toUpperCase() + lastActiveTab.slice(1), false);
        } else {
            sidebar.classList.add("open");
            overlay.classList.add("show");
        }
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    });

    // B. BOTTOM NAVIGATION ROUTER
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            window.switchViewSPA(targetTab, btn.querySelector("span").innerText, false);
            window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: targetTab } }));
        });
    });

    // C. FLOATING ACTION BUTTON (FAB) TAMBAH UNIT
    if (fabAddUnit) {
        fabAddUnit.addEventListener("click", () => {
            window.switchViewSPA("unit-form", "Tambah Unit Baru", true);
            if (window.AMSUI) window.AMSUI.renderUnitForm("");
        });
    }

    // D. PENANGANAN AKTIF TOMBOL SARINGAN CHIP (FILTER CHIPS EVENT)
    filterChips.forEach(chip => {
        chip.addEventListener("click", () => {
            // Matikan status aktif di semua chip saringan
            filterChips.forEach(c => c.classList.remove("active"));
            // Nyalakan status aktif di chip yang ditekan
            chip.classList.add("active");
            
            // Picu pembaruan saringan konten secara instan
            window.filterActiveViewContent();
        });
    });

    // E. SINKRONISASI PENCARIAN HEADER SECARA UNIVERSAL
    if (btnSearchTrigger && headerSearchBar && btnCloseSearch) {
        btnSearchTrigger.addEventListener("click", () => {
            headerSearchBar.classList.remove("d-none");
            txtHeaderSearch.focus();
        });

        btnCloseSearch.addEventListener("click", () => {
            headerSearchBar.classList.add("d-none");
            txtHeaderSearch.value = "";
            filterChips.forEach(c => {
                if (c.getAttribute("data-filter") === "all") c.classList.add("active");
                else c.classList.remove("active");
            });
            window.filterActiveViewContent(); // Kembalikan semua baris
        });
    }

    // F. MANUAL SYNC BUTTON
    btnSync.addEventListener("click", async () => {
        const icon = btnSync.querySelector("i");
        icon.classList.add("fa-spin");
        if (window.AMSDatabase) {
            const success = await window.AMSDatabase.syncDataFromServer();
            if (success) {
                const activeTabBtn = document.querySelector(".nav-tab-btn.active");
                if (activeTabBtn) {
                    const currentView = activeTabBtn.getAttribute("data-tab");
                    window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: currentView } }));
                }
            } else {
                alert("Gagal sinkronisasi data. Periksa koneksi internet.");
            }
        }
        setTimeout(() => { icon.classList.remove("fa-spin"); }, 800);
    });

    // G. SIDEBAR DRAWER MENU ACTIONS
    const menuItems = document.querySelectorAll(".nav-menu-item[data-menu]");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetMenuName = item.getAttribute("data-menu");
            sidebar.classList.remove("open");
            overlay.classList.remove("show");
            alert(`Modul "${targetMenuName}" terpilih.`);
        });
    });

    // H. SINKRONISASI STATUS ANTREAN OFFLINE TERTUNDA
    window.addEventListener('ams_queue_updated', (e) => {
        const queueLength = e.detail.queueLength;
        const offlineBox = document.getElementById("offlineStatusBox");
        if (!offlineBox) return;

        if (queueLength > 0) {
            offlineBox.style.backgroundColor = "#fff3cd";
            offlineBox.style.borderColor = "#ffeeba";
            offlineBox.querySelector("span").innerText = `${queueLength} Transaksi tertunda`;
            offlineBox.querySelector("span").className = "small fw-bold text-warning-emphasis";
            offlineBox.querySelector("i").className = "fas fa-exclamation-triangle text-warning fs-5";
        } else {
            offlineBox.style.backgroundColor = "#ffffff";
            offlineBox.style.borderColor = "#e2e8f0";
            offlineBox.querySelector("span").innerText = "Offline ready";
            offlineBox.querySelector("span").className = "small fw-semibold text-secondary";
            offlineBox.querySelector("i").className = "fas fa-check-circle text-success fs-5";
        }
    });

    // I. AUTOMATIC INITIAL SYNC
    if (window.AMSDatabase) {
        window.AMSDatabase.syncDataFromServer().then((success) => {
            if (success) {
                window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: 'dashboard' } }));
            }
        });
    }
}

/**
 * 🔍 CORE FILTER: FITUR SINKRONISASI MULTI-FILTER DI HEADER (TEKS + KATEGORI OFFLINE)
 * Menangani pencarian teks dan filter status ketersediaan secara bersamaan
 */
window.filterActiveViewContent = function(query) {
    const activeView = document.querySelector('.app-view:not(.d-none)');
    if (!activeView) return;

    const q = query.toLowerCase().trim();
    
    // Temukan filter status aktif dari tombol chip tag
    const activeChip = document.querySelector(".badge-chip.active");
    const activeFilterTag = activeChip ? activeChip.getAttribute("data-filter").toLowerCase().trim() : "all";

    // Kumpulkan seluruh elemen baris data yang ada di halaman aktif
    const rows = activeView.querySelectorAll('.list-container > div > div, .table tbody tr, .list-group-item');
    
    rows.forEach(row => {
        const rowText = row.innerText.toLowerCase();
        
        // A. Validasi Teks Pencarian
        const matchesQuery = rowText.includes(q);
        
        // B. Validasi Filter Status Chip
        let matchesStatusFilter = true;
        if (activeFilterTag !== "all") {
            // Saring berdasarkan teks status (tersedia/standby, rent/disewa, atau servis/bengkel)
            if (activeFilterTag === "available") {
                matchesStatusFilter = rowText.includes("available") || rowText.includes("standby");
            } else if (activeFilterTag === "rent") {
                matchesStatusFilter = rowText.includes("rent") || rowText.includes("disewa");
            } else if (activeFilterTag === "servis") {
                matchesStatusFilter = rowText.includes("servis") || rowText.includes("bengkel") || rowText.includes("rusak");
            }
        }

        // C. Gabungkan Kedua Validasi (Multi-Criteria Gate)
        if (matchesQuery && matchesStatusFilter) {
            row.style.setProperty('display', '', 'important');
        } else {
            row.style.setProperty('display', 'none', 'important');
        }
    });
};