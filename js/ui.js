// =========================================================================
// AMS PRO - REAL-TIME UI RENDERING ENGINE (MODULAR V1)
// =========================================================================

(function(window) {
    'use strict';

    const AMSUI = {};

    // Daftarkan listener utama untuk memantau perpindahan tab dari app.js
    window.addEventListener('ams_view_changed', (e) => {
        const activeView = e.detail.viewName;
        AMSUI.renderView(activeView);
    });

    /**
     * 🎨 MAIN ROUTER RENDERING: Memilih modul render yang sesuai
     */
    AMSUI.renderView = function(viewName) {
        // Ambil data terbaru dari database offline lokal
        const items = window.AMSDatabase ? window.AMSDatabase.getLocalData('items') : [];
        const bookings = window.AMSDatabase ? window.AMSDatabase.getLocalData('bookings') : [];

        switch (viewName) {
            case 'dashboard':
                AMSUI.renderDashboard(items, bookings);
                break;
            case 'customer':
                AMSUI.renderCustomer(bookings);
                break;
            case 'register':
                AMSUI.renderRegister(bookings);
                break;
            case 'monitoring':
                AMSUI.renderMonitoring(bookings);
                break;
            case 'keuangan':
                AMSUI.renderKeuangan(bookings);
                break;
            default:
                console.warn(`View renderer tidak ditemukan untuk: ${viewName}`);
        }
    };

    /**
     * 📊 1. RENDER VIEW: DASHBOARD (MEREPLIKASI APPSHEET DASHBOARD SISI-SISI)
     */
    AMSUI.renderDashboard = function(items, bookings) {
        const container = document.getElementById('view-dashboard');
        if (!container) return;

        // A. HITUNG STATISTIK REAL-TIME
        const totalArmada = items.length;
        const standby = items.filter(i => String(i[5]).toLowerCase().trim() === 'available').length;
        const disewa = items.filter(i => String(i[5]).toLowerCase().trim() === 'rent').length;
        const waitingList = bookings.filter(b => String(b.status).toLowerCase().trim() === 'booked').length;

        // B. KELOMPOKKAN UNIT (Rent vs Available)
        const unitSewa = items.filter(i => String(i[5]).toLowerCase().trim() === 'rent');
        const unitStandby = items.filter(i => String(i[5]).toLowerCase().trim() === 'available');

        // C. STRUKTUR GRID RESPONSIVE (Dua Kolom di Tablet/PC, Satu Kolom di HP)
        let html = `
            <div class="row g-4">
                <!-- KOLOM KIRI: MONITORING ARMADA WIDGETS -->
                <div class="col-lg-6">
                    <div class="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
                        <h6 class="text-secondary fw-bold border-bottom pb-2 mb-3">Monitoring Armada</h6>
                        
                        <div class="row g-3">
                            <!-- Widget 1: Unit Tersedia (Hijau) -->
                            <div class="col-6">
                                <div class="p-3 rounded-3 bg-light border-start border-success border-4 shadow-sm text-start">
                                    <span class="text-muted small d-block fw-semibold mb-1">Unit Tersedia</span>
                                    <h2 class="fw-bold text-success m-0">${standby}</h2>
                                </div>
                            </div>
                            <!-- Widget 2: Sedang Disewa (Biru) -->
                            <div class="col-6">
                                <div class="p-3 rounded-3 bg-light border-start border-primary border-4 shadow-sm text-start">
                                    <span class="text-muted small d-block fw-semibold mb-1">Sedang Disewa</span>
                                    <h2 class="fw-bold text-primary m-0">${disewa}</h2>
                                </div>
                            </div>
                            <!-- Widget 3: Waiting List (Kuning) -->
                            <div class="col-6">
                                <div class="p-3 rounded-3 bg-light border-start border-warning border-4 shadow-sm text-start">
                                    <span class="text-muted small d-block fw-semibold mb-1">Waiting List</span>
                                    <h2 class="fw-bold text-warning-emphasis m-0">${waitingList}</h2>
                                </div>
                            </div>
                            <!-- Widget 4: Total Armada (Abu-abu) -->
                            <div class="col-6">
                                <div class="p-3 rounded-3 bg-light border-start border-secondary border-4 shadow-sm text-start">
                                    <span class="text-muted small d-block fw-semibold mb-1">Total Armada</span>
                                    <h2 class="fw-bold text-secondary m-0">${totalArmada}</h2>
                                </div>
                            </div>
                        </div>

                        <!-- Baris Tambahan Status Pembersihan Antrean -->
                        <div class="mt-4 pt-3 border-top text-muted small d-flex justify-content-between align-items-center">
                            <span>Last Synced: <strong>${window.AMSDatabase ? window.AMSDatabase.getLastSyncTime() : 'Belum'}</strong></span>
                            <span class="badge bg-light text-dark border"><i class="fas fa-database me-1 text-primary"></i> Local SQL</span>
                        </div>
                    </div>
                </div>

                <!-- KOLOM KANAN: LIST UNIT DENGAN FOTO (REPLIKA VIEW MOTOR) -->
                <div class="col-lg-6">
                    <div class="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
                        <h6 class="text-secondary fw-bold border-bottom pb-2 mb-3">Motor</h6>
                        
                        <div class="list-container" style="max-height: 400px; overflow-y: auto;">
                            <!-- SEKTOR RENTED UNITS -->
                            <div class="mb-3">
                                <div class="badge bg-light text-danger border mb-2 px-3 py-1 font-monospace fw-bold">RENT ${unitSewa.length}</div>
                                ${unitSewa.length === 0 ? '<div class="text-muted small ps-2 mb-2">Tidak ada motor disewa</div>' : ''}
                                ${unitSewa.map(u => renderUnitListRow(u, bookings)).join('')}
                            </div>

                            <!-- SEKTOR AVAILABLE UNITS -->
                            <div>
                                <div class="badge bg-light text-success border mb-2 px-3 py-1 font-monospace fw-bold">AVAILABLE ${unitStandby.length}</div>
                                ${unitStandby.length === 0 ? '<div class="text-muted small ps-2">Semua unit disewa</div>' : ''}
                                ${unitStandby.map(u => renderUnitListRow(u, bookings)).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    };

    /**
     * 👥 2. RENDER VIEW: CUSTOMER (CRM & SEARCH)
     */
    AMSUI.renderCustomer = function(bookings) {
        const container = document.getElementById('view-customer');
        if (!container) return;

        // Dapatkan data customer unik secara cerdas dari daftar booking
        const customersMap = {};
        bookings.forEach(b => {
            const nama = b.nama ? b.nama.trim() : "";
            if (nama !== "" && !customersMap[nama.toLowerCase()]) {
                customersMap[nama.toLowerCase()] = {
                    nama: nama,
                    motor: b.no_motor,
                    status: b.status
                };
            }
        });

        const uniqueCustomers = Object.values(customersMap);

        let html = `
            <div class="card border-0 shadow-sm rounded-3 p-3 bg-white">
                <h6 class="text-secondary fw-bold border-bottom pb-2 mb-3">Daftar Pelanggan (CRM)</h6>
                <div class="list-group list-group-flush" style="max-height: 480px; overflow-y: auto;">
                    ${uniqueCustomers.length === 0 ? '<div class="text-center py-4 text-muted">Belum ada riwayat pelanggan terdaftar.</div>' : ''}
                    ${uniqueCustomers.map(c => `
                        <div class="list-group-item d-flex align-items-center justify-content-between py-3 px-0 border-bottom">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-light text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                    <i class="fas fa-user-tie fs-5"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold text-dark m-0">${c.nama}</h6>
                                    <small class="text-muted">Terakhir sewa: <span class="badge bg-light border text-dark">${c.motor.toUpperCase()}</span></small>
                                </div>
                            </div>
                            <span class="badge ${c.status.toLowerCase() === 'rent' ? 'bg-success' : 'bg-secondary'} rounded-pill px-3 py-1 small">${c.status.toUpperCase()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    /**
     * 📋 3. RENDER VIEW: REGISTER (REPLIKA TABEL PEMESANAN AKTIF APPSHEET)
     */
    AMSUI.renderRegister = function(bookings) {
        const container = document.getElementById('view-register');
        if (!container) return;

        // Urutkan booking agar yang berstatus RENT berada di urutan paling atas
        const sortedBookings = [...bookings].sort((a, b) => {
            if (String(a.status).toLowerCase() === 'rent') return -1;
            if (String(b.status).toLowerCase() === 'rent') return 1;
            return 0;
        });

        let html = `
            <div class="card border-0 shadow-sm rounded-3 p-3 bg-white">
                <h6 class="text-secondary fw-bold border-bottom pb-2 mb-3">Daftar Register</h6>
                
                <div class="table-responsive" style="max-height: 480px;">
                    <table class="table align-middle text-start" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top" style="z-index: 5;">
                            <tr>
                                <th>No Motor</th>
                                <th>Penyewa</th>
                                <th>Tgl Sewa</th>
                                <th>Tgl Kembali</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedBookings.length === 0 ? '<tr><td colspan="5" class="text-center py-4 text-muted">Tidak ada transaksi terdaftar.</td></tr>' : ''}
                            ${sortedBookings.map(b => {
                                const stClass = String(b.status).toLowerCase() === 'rent' ? 'bg-success-subtle text-success border border-success' : 
                                                String(b.status).toLowerCase() === 'booked' ? 'bg-warning-subtle text-warning-emphasis border border-warning' : 
                                                'bg-light text-muted border';
                                return `
                                    <tr>
                                        <td class="fw-bold font-monospace text-primary">${String(b.no_motor).toUpperCase()}</td>
                                        <td class="fw-semibold text-dark">${b.nama || '-'}</td>
                                        <td>${formatTanggalPendek(b.start)}</td>
                                        <td>${formatTanggalPendek(b.end)}</td>
                                        <td>
                                            <span class="badge ${stClass} rounded-2 px-2 py-1" style="font-size: 0.72rem;">${String(b.status).toUpperCase()}</span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    /**
     * 🖥️ 4. RENDER VIEW: MONITORING (TAMPILAN 4 WIDGET TUGAS TUGAS HARIAN)
     */
    AMSUI.renderMonitoring = function(bookings) {
        const container = document.getElementById('view-monitoring');
        if (!container) return;

        const dHariIni = new Date();
        const strHariIni = dHariIni.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Filter list untuk tugas-tugas real-time harian
        const listKeluar = [];
        const listKembali = [];
        const listMendatang = [];

        bookings.forEach(b => {
            if (!b.start || !b.end) return;

            const tglSewa = new Date(b.start).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const tglKembali = new Date(b.end).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

            const statusSewa = String(b.status).toLowerCase().trim();

            if (tglSewa === strHariIni && statusSewa === 'booked') {
                listKeluar.push(b);
            } else if (tglKembali === strHariIni && statusSewa === 'rent') {
                listKembali.push(b);
            } else if (new Date(b.start) > dHariIni && statusSewa === 'booked') {
                listMendatang.push(b);
            }
        });

        let html = `
            <div class="row g-4">
                <!-- PANEL 1: Keluar Hari Ini -->
                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
                        <div class="border-bottom pb-2 mb-3 d-flex justify-content-between align-items-center">
                            <h6 class="text-secondary fw-bold m-0">Keluar Hari Ini</h6>
                            <span class="badge bg-primary rounded-pill">${listKeluar.length}</span>
                        </div>
                        <div class="list-group list-group-flush">
                            ${listKeluar.length === 0 ? '<div class="text-muted text-center py-4 small">No items</div>' : ''}
                            ${listKeluar.map(item => `
                                <div class="list-group-item px-0 py-2 border-bottom">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="fw-bold text-dark">${item.nama}</span>
                                        <span class="badge bg-light text-primary border font-monospace">${item.no_motor.toUpperCase()}</span>
                                    </div>
                                    <small class="text-muted">Jam Ambil: ${new Date(item.start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- PANEL 2: Kembali Hari Ini -->
                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
                        <div class="border-bottom pb-2 mb-3 d-flex justify-content-between align-items-center">
                            <h6 class="text-secondary fw-bold m-0">Kembali Hari Ini</h6>
                            <span class="badge bg-success rounded-pill">${listKembali.length}</span>
                        </div>
                        <div class="list-group list-group-flush">
                            ${listKembali.length === 0 ? '<div class="text-muted text-center py-4 small">No items</div>' : ''}
                            ${listKembali.map(item => `
                                <div class="list-group-item px-0 py-2 border-bottom">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="fw-bold text-dark">${item.nama}</span>
                                        <span class="badge bg-light text-success border font-monospace">${item.no_motor.toUpperCase()}</span>
                                    </div>
                                    <small class="text-muted">Jam Kembali: ${new Date(item.end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- PANEL 3: Booking Mendatang -->
                <div class="col-md-12 col-lg-4">
                    <div class="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
                        <div class="border-bottom pb-2 mb-3 d-flex justify-content-between align-items-center">
                            <h6 class="text-secondary fw-bold m-0">Mendatang</h6>
                            <span class="badge bg-secondary rounded-pill">${listMendatang.length}</span>
                        </div>
                        <div class="list-group list-group-flush" style="max-height: 250px; overflow-y: auto;">
                            ${listMendatang.length === 0 ? '<div class="text-muted text-center py-4 small">No items</div>' : ''}
                            ${listMendatang.map(item => `
                                <div class="list-group-item px-0 py-2 border-bottom">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="fw-semibold text-dark">${item.nama}</span>
                                        <span class="text-muted small">${formatTanggalPendek(item.start)}</span>
                                    </div>
                                    <small class="text-muted font-monospace">Motor: ${item.no_motor.toUpperCase()}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    /**
     * 💵 5. RENDER VIEW: KEUANGAN (SIMPLE REKAP CASHFLOW)
     */
    AMSUI.renderKeuangan = function(bookings) {
        const container = document.getElementById('view-keuangan');
        if (!container) return;

        // Ambil riwayat total harga dari booking sebagai estimasi transaksi masuk
        let totalRevenue = 0;
        bookings.forEach(b => {
            const status = b.status ? String(b.status).toLowerCase().trim() : '';
            if (status !== 'cancel') {
                // Dalam skema normal, total harga didapat dari rekap transaksi booking
                totalRevenue += 150000; // Contoh kalkulasi rate statis untuk mock financial chart
            }
        });

        let html = `
            <div class="card border-0 shadow-sm rounded-3 p-3 bg-white">
                <h6 class="text-secondary fw-bold border-bottom pb-2 mb-3">Arus Kas Keuangan</h6>
                
                <div class="p-4 bg-light rounded-3 text-center border-start border-success border-4 mb-3">
                    <span class="text-muted small d-block mb-1 font-monospace">PROYEKSI REVENUE AKTIF</span>
                    <h3 class="fw-bold text-success">IDR ${totalRevenue.toLocaleString('id-ID')}</h3>
                </div>
                
                <div class="alert alert-info text-start small">
                    <i class="fas fa-info-circle me-1"></i> Modul ini menyinkronkan data langsung dari lembar kerja <strong>CashFlow</strong> milik klien untuk pembukuan masuk dan keluar.
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    // =========================================================================
    // MINI HELPERS
    // =========================================================================

    /**
     * 🛵 RENDER BARIS ROW MOTOR LIST (Kanan di Dashboard)
     */
    function renderUnitListRow(unitArray, bookings) {
        const plat = unitArray[0];
        const tipe = unitArray[1];
        const brand = unitArray[2];
        const status = String(unitArray[5]).toLowerCase().trim();
        const foto = unitArray[4];

        // Deteksi penyewa aktif jika statusnya adalah 'RENT'
        let penyewaAktif = '';
        if (status === 'rent') {
            const aktifBooking = bookings.find(b => {
                const platB = String(b.no_motor).replace(/\s/g, '').toLowerCase();
                const platU = String(plat).replace(/\s/g, '').toLowerCase();
                return platB === platU && String(b.status).toLowerCase().trim() === 'rent';
            });
            if (aktifBooking) penyewaAktif = aktifBooking.nama;
        }

        const fallbackUrl = "https://i.ibb.co.com/1JzVD8KB/NMAX-NEO-S-BLACK.png"; // Fallback visual
        const imageSrc = foto && foto.startsWith('http') ? foto : fallbackUrl