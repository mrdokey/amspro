// =========================================================================
// AMS PRO - APP CONTROLLER & SPA ROUTER (MODULAR V1.3 - REVISED NAV & SEARCH)
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

    // Elemen Pencarian Header
    const btnSearchTrigger = document.getElementById("btnHeaderSearchTrigger");
    const headerSearchBar = document.getElementById("headerSearchBar");
    const btnCloseSearch = document.getElementById("btnCloseHeaderSearch");
    const txtHeaderSearch = document.getElementById("txtHeaderSearch");

    let lastActiveTab = "dashboard";
    let isSubViewActive = false;

    /**
     * 🔄 SWITCH VIEW SPA DENGAN EFFECT SMOOTH (SLIDE-IN ACCELERATION)
     */
    window.switchViewSPA = function(viewId, customTitle, isSubView = false) {
        appViews.forEach(view => {
            view.classList.add("d-none");
            view.classList.remove("active-view"); // Matikan animasi
        });
        
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.remove("d-none");
            
            // Force reflow browser untuk memastikan animasi CSS mentransisikan elemen dari kanan ke tengah
            targetView.offsetHeight; 
            targetView.classList.add("active-view"); // Picu animasi geser
        }

        lblHeaderTitle.innerText = customTitle;
        isSubViewActive = isSubView;

        // ANIMASI NAVIGASI HEADER: Hamburger vs Back Arrow (<-)
        const hamburgerIcon = btnHamburger.querySelector("i");
        if (isSubView) {
            hamburgerIcon.className = "fas fa-arrow-left text-white";
            if (fabAddUnit) fabAddUnit.classList.add("d-none"); // Sembunyikan FAB saat masuk detail/form
        } else {
            hamburgerIcon.className = "fas fa-bars text-white";
            lastActiveTab = viewId;
            
            // Atur status aktif tab navigasi bawah
            tabButtons.forEach(btn => {
                if (btn.getAttribute("data-tab") === viewId) btn.classList.add("active");
                else btn.classList.remove("active");
            });

            // TAMPILKAN FAB HANYA DI TAB DASHBOARD UTAMA
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

    // D. SINKRONISASI PENCARIAN HEADER SECARA UNIVERSAL
    if (btnSearchTrigger && headerSearchBar && btnCloseSearch) {
        btnSearchTrigger.addEventListener("click", () => {
            headerSearchBar.classList.remove("d-none");
            txtHeaderSearch.focus();
        });

        btnCloseSearch.addEventListener("click", () => {
            headerSearchBar.classList.add("d-none");
            txtHeaderSearch.value = "";
            window.filterActiveViewContent(""); // Bersihkan saringan pencarian
        });
    }

    // E. MANUAL SYNC BUTTON
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

    // F. SIDEBAR DRAWER MENU ACTIONS (Hanya Menu Non-Bawaan AppSheet)
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

    // G. SINKRONISASI STATUS ANTREAN OFFLINE TERTUNDA
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

    // H. AUTOMATIC INITIAL SYNC
    if (window.AMSDatabase) {
        window.AMSDatabase.syncDataFromServer().then((success) => {
            if (success) {
                window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: 'dashboard' } }));
            }
        });
    }
}

/**
 * 🔍 CORE FILTER: FITUR PENCARIAN UNIVERSAL DI HEADER (MENDUKUNG SEMUA VIEW)
 * Mencari kecocokan teks secara dinamis di dalam kontainer view yang sedang aktif
 */
window.filterActiveViewContent = function(query) {
    const activeView = document.querySelector('.app-view:not(.d-none)');
    if (!activeView) return;

    const q = query.toLowerCase().trim();
    
    // Cari semua elemen baris di dalam view yang aktif (bisa di list-container, table tr, atau list-group-item)
    const rows = activeView.querySelectorAll('.list-container > div > div, .table tbody tr, .list-group-item');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(q)) {
            row.style.setProperty('display', '', 'important');
        } else {
            row.style.setProperty('display', 'none', 'important');
        }
    });
};