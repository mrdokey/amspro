// =========================================================================
// AMS PRO - APP CONTROLLER & SPA ROUTER SINKRONISASI DATABASE (MODULAR V1.2)
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

    // Menampung riwayat navigasi untuk tombol "Back Arrow"
    let lastActiveTab = "dashboard";
    let isSubViewActive = false;

    /**
     * 🔄 UTILITY: SWITCH VIEW UTAMA SPA
     */
    window.switchViewSPA = function(viewId, customTitle, isSubView = false) {
        appViews.forEach(view => view.classList.add("d-none"));
        
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.remove("d-none");
        }

        lblHeaderTitle.innerText = customTitle;
        isSubViewActive = isSubView;

        // ANIMASI NAVIGASI HEADER: Hambuger vs Back Arrow (<-)
        const hamburgerIcon = btnHamburger.querySelector("i");
        if (isSubView) {
            hamburgerIcon.className = "fas fa-arrow-left text-white"; // Ubah jadi panah kembali
        } else {
            hamburgerIcon.className = "fas fa-bars text-white"; // Kembalikan jadi hamburger menu
            lastActiveTab = viewId;
            // Aktifkan kembali status tab navigasi bawah yang sesuai
            tabButtons.forEach(btn => {
                if (btn.getAttribute("data-tab") === viewId) btn.classList.add("active");
                else btn.classList.remove("active");
            });
        }
    };

    // A. TOGGLE BUTTON (HAMBURGER / BACK ARROW CLICK HANDLER)
    btnHamburger.addEventListener("click", () => {
        if (isSubViewActive) {
            // Jika berada di detail/form, klik panah kembali akan memulangkan staff ke tab semula
            window.switchViewSPA(lastActiveTab, lastActiveTab.charAt(0).toUpperCase() + lastActiveTab.slice(1), false);
        } else {
            // Jika berada di menu utama, buka sidebar drawer seperti biasa
            sidebar.classList.add("open");
            overlay.classList.add("show");
        }
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    });

    // B. BOTTOM NAVIGATION ROUTER (Tab Switcher SPA)
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            window.switchViewSPA(targetTab, btn.querySelector("span").innerText, false);
            window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: targetTab } }));
        });
    });

    // C. MANUAL SYNC BUTTON
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

    // D. SIDEBAR DRAWER MENU ACTIONS
    const menuItems = document.querySelectorAll(".nav-menu-item[data-menu]");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetMenuName = item.getAttribute("data-menu");

            sidebar.classList.remove("open");
            overlay.classList.remove("show");

            if (targetMenuName === "tambah_unit") {
                // Trigger form tambah unit baru (tanpa plat)
                window.switchViewSPA("unit-form", "Tambah Unit Baru", true);
                if (window.AMSUI) window.AMSUI.renderUnitForm("");
            } else {
                alert(`Modul "${targetMenuName}" terpilih.`);
            }
        });
    });

    // E. SINKRONISASI STATUS ANTREAN OFFLINE TERTUNDA (SYNC QUEUE)
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

    // F. AUTOMATIC INITIAL SYNC
    if (window.AMSDatabase) {
        window.AMSDatabase.syncDataFromServer().then((success) => {
            if (success) {
                window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: 'dashboard' } }));
            }
        });
    }
}