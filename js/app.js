// =========================================================================
// AMS PRO - APP CONTROLLER & SPA ROUTER SINKRONISASI DATABASE (MODULAR V1.1)
// =========================================================================

// URL Hardcode Sementara untuk sinkronisasi awal (disamakan dengan unit.html)
const MASTER_GAS_URL = "https://script.google.com/macros/s/AKfycbxdnEun8-kSEK_9c0j8kQXMD6VNU8q_D-xGV-33dQ8SM6uuLZiGjDewh-RNPWq4YBHk/exec";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Ekstrak parameter token dari URL browser
    const params = new URLSearchParams(window.location.search);
    const clientToken = params.get('token') || 'mrd';

    // 2. Sesuaikan penamaan visual di Header utama
    const lblHeaderTitle = document.getElementById("lblHeaderTitle");
    const navBrandTitle = document.getElementById("navBrandTitle");
    if (navBrandTitle) {
        navBrandTitle.innerHTML = `<i class="fas fa-motorcycle me-2 text-warning"></i> ${clientToken.toUpperCase()} - Unit Monitor`;
    }

    // 3. Inisialisasi Database Lokal Offline-Ready
    if (window.AMSDatabase) {
        window.AMSDatabase.init(clientToken, MASTER_GAS_URL);
    }

    // 4. Jalankan Pengaturan Navigasi, Event Listeners, & Sinkronisasi Data Awal
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

    // A. TOGGLE SIDEBAR DRAWER
    btnHamburger.addEventListener("click", () => {
        sidebar.classList.add("open");
        overlay.classList.add("show");
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    });

    // B. BOTTOM NAVIGATION ROUTER (Tab Switcher SPA)
    const tabButtons = document.querySelectorAll(".nav-tab-btn");
    const appViews = document.querySelectorAll(".app-view");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            // Atur status aktif pada kelas tombol navigasi bawah
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Alihkan visibilitas kontainer view
            appViews.forEach(view => view.classList.add("d-none"));
            const targetView = document.getElementById(`view-${targetTab}`);
            if (targetView) {
                targetView.classList.remove("d-none");
                
                // Trigger event kustom untuk merender konten spesifik view (digunakan oleh ui.js nanti)
                window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: targetTab } }));
            }

            // Perbarui Judul Header Atas secara dinamis
            lblHeaderTitle.innerText = btn.querySelector("span").innerText;
        });
    });

    // C. MANUAL SYNC BUTTON WITH TACTILE ROTATION ANIMATION
    btnSync.addEventListener("click", async () => {
        const icon = btnSync.querySelector("i");
        icon.classList.add("fa-spin"); // Jalankan efek putar pada ikon

        console.log("Memulai sinkronisasi manual...");
        
        if (window.AMSDatabase) {
            const success = await window.AMSDatabase.syncDataFromServer();
            if (success) {
                console.log("Sinkronisasi manual berhasil dilakukan.");
                
                // Trigger update event agar data di layar langsung diperbarui otomatis
                const activeTabBtn = document.querySelector(".nav-tab-btn.active");
                if (activeTabBtn) {
                    const currentView = activeTabBtn.getAttribute("data-tab");
                    window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: currentView } }));
                }
            } else {
                alert("Gagal sinkronisasi data. Periksa koneksi internet.");
            }
        }

        // Hentikan putaran ikon setelah jeda singkat agar transisi visual terasa halus
        setTimeout(() => {
            icon.classList.remove("fa-spin");
        }, 800);
    });

    // D. SIDEBAR DRAWER MENU ACTIONS
    const menuItems = document.querySelectorAll(".nav-menu-item[data-menu]");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetMenuName = item.getAttribute("data-menu");

            sidebar.classList.remove("open");
            overlay.classList.remove("show");

            // Contoh penanganan sederhana menu Sidebar (Dapat diperluas sesuai modul spesifik)
            if (targetMenuName === "setting_wa") {
                alert("Membuka Modul Setting WhatsApp...");
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
            // Ubah tampilan box menjadi warna kuning peringatan untuk menandakan ada data antrean lokal
            offlineBox.style.backgroundColor = "#fff3cd";
            offlineBox.style.borderColor = "#ffeeba";
            offlineBox.querySelector("span").innerText = `${queueLength} Transaksi tertunda`;
            offlineBox.querySelector("span").className = "small fw-bold text-warning-emphasis";
            offlineBox.querySelector("i").className = "fas fa-exclamation-triangle text-warning fs-5";
        } else {
            // Kembalikan ke tampilan default "Offline ready" centang hijau jika antrean bersih
            offlineBox.style.backgroundColor = "#ffffff";
            offlineBox.style.borderColor = "#e2e8f0";
            offlineBox.querySelector("span").innerText = "Offline ready";
            offlineBox.querySelector("span").className = "small fw-semibold text-secondary";
            offlineBox.querySelector("i").className = "fas fa-check-circle text-success fs-5";
        }
    });

    // F. SINKRONISASI DATA UTAMA SECARA OTOMATIS SAAT PERTAMA KALI DIBUKA
    if (window.AMSDatabase) {
        window.AMSDatabase.syncDataFromServer().then((success) => {
            if (success) {
                // Trigger event awal untuk merender Dashboard setelah muat data pertama kali sukses
                window.dispatchEvent(new CustomEvent('ams_view_changed', { detail: { viewName: 'dashboard' } }));
            }
        });
    }
}
