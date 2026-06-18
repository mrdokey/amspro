// =========================================================================
// AMS PRO - OFFLINE DATA & SYNC CONTROLLER (MODULAR V1)
// =========================================================================

(function(window) {
    'use strict';

    // Definisikan namespace global jika belum ada
    const AMSDatabase = {};

    // Konfigurasi internal database
    let _clientToken = 'mrd';
    let _defaultGasUrl = '';
    const QUEUE_KEY = 'ams_sync_queue';

    /**
     * ⚙️ INISIALISASI DATABASE
     * Dipanggil pertama kali oleh app.js saat aplikasi dimuat
     */
    AMSDatabase.init = function(token, defaultGasUrl) {
        _clientToken = token || 'mrd';
        _defaultGasUrl = defaultGasUrl || '';
        
        console.log(`Database terinisialisasi untuk token: ${_clientToken.toUpperCase()}`);
        
        // Daftarkan event listener otomatis saat koneksi kembali online
        window.addEventListener('online', () => {
            console.log('Koneksi pulih. Memulai sinkronisasi antrean tertunda...');
            AMSDatabase.processSyncQueue();
        });
    };

    /**
     * 🔍 RESOLVER URL GAS KLIEN
     * Menentukan rute API target secara dinamis
     */
    AMSDatabase.getGasUrl = function() {
        const cachedUrl = localStorage.getItem(`gas_url_${_clientToken}`);
        if (cachedUrl) {
            return `${cachedUrl}?token=${_clientToken}`;
        }
        return `${_defaultGasUrl}?token=${_clientToken}`;
    };

    /**
     * 🔄 FETCH & SYNC: Ambil data dari server dan perbarui memori lokal
     */
    AMSDatabase.syncDataFromServer = async function() {
        if (!navigator.onLine) {
            console.warn('Aplikasi offline. Tidak dapat melakukan sinkronisasi dengan server.');
            return false;
        }

        const requestUrl = `${AMSDatabase.getGasUrl()}&t=${Date.now()}`; // T-Bypass anti-cache

        try {
            const response = await fetch(requestUrl);
            const data = await response.json();

            if (data.error) {
                console.error('Error dari server:', data.message);
                return false;
            }

            // Simpan data master tabel ke memori lokal
            AMSDatabase.saveLocalData('items', data.items || []);
            AMSDatabase.saveLocalData('bookings', data.bookings || []);
            AMSDatabase.saveLocalData('columns', data.columns || []);
            localStorage.setItem(`last_sync_${_clientToken}`, Date.now());

            console.log('Sinkronisasi database lokal selesai.');
            return true;
        } catch (error) {
            console.error('Gagal mengambil data dari server:', error);
            return false;
        }
    };

    /**
     * 💾 BACA DATA LOKAL: Mengambil salinan data dari memori offline
     */
    AMSDatabase.getLocalData = function(key) {
        const data = localStorage.getItem(`ams_${_clientToken}_${key}`);
        try {
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Gagal parsing data lokal untuk key: ${key}`, e);
            return [];
        }
    };

    /**
     * 💾 TULIS DATA LOKAL: Menyimpan salinan data ke memori offline
     */
    AMSDatabase.saveLocalData = function(key, data) {
        localStorage.setItem(`ams_${_clientToken}_${key}`, JSON.stringify(data));
    };

    /**
     * 🕒 AMBIL WAKTU SINKRONISASI TERAKHIR
     */
    AMSDatabase.getLastSyncTime = function() {
        const ts = localStorage.getItem(`last_sync_${_clientToken}`);
        if (!ts) return 'Belum pernah';
        
        const date = new Date(parseInt(ts));
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
               date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    /**
     * 📥 ANTRIAN TRANSAKSI OFFLINE: Simpan perintah POST saat internet mati
     */
    AMSDatabase.queueOfflineAction = function(actionType, messagePayload) {
        let queue = [];
        const rawQueue = localStorage.getItem(QUEUE_KEY);
        
        if (rawQueue) {
            try {
                queue = JSON.parse(rawQueue);
            } catch (e) {
                queue = [];
            }
        }

        const newAction = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            token: _clientToken,
            action: actionType, // 'addBooking' atau 'addCashflow'
            payload: messagePayload, // Berisi format string teks rapi yang dimengerti oleh GAS Suhu
            timestamp: Date.now()
        };

        queue.push(newAction);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.warn(`Aplikasi Offline: Transaksi dimasukkan ke antrean lokal [ID: ${newAction.id}]`);
        
        // Trigger event custom agar UI bisa memberikan notifikasi "1 Transaksi tertunda"
        window.dispatchEvent(new CustomEvent('ams_queue_updated', { detail: { queueLength: queue.length } }));
    };

    /**
     * 🚀 PROSES SINKRONISASI ANTREAN (FLUSH QUEUE TO SERVER)
     * Mengirimkan satu per satu transaksi tertunda ke GAS Master saat koneksi pulih
     */
    AMSDatabase.processSyncQueue = async function() {
        if (!navigator.onLine) return;

        const rawQueue = localStorage.getItem(QUEUE_KEY);
        if (!rawQueue) return;

        let queue = [];
        try {
            queue = JSON.parse(rawQueue);
        } catch (e) {
            queue = [];
        }

        if (queue.length === 0) return;

        console.log(`Mengirimkan ${queue.length} transaksi tertunda ke server...`);

        // Gunakan perulangan terbalik untuk mempermudah penghapusan item dari array antrean jika berhasil dikirim
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            
            // Format payload sesuai kebutuhan endpoint doPost(e) Master GAS Suhu
            const requestBody = {
                token: item.token,
                message: item.payload
            };

            try {
                const response = await fetch(AMSDatabase.getGasUrl(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain' // Menggunakan text/plain untuk menghindari preflight CORS pre-request di GAS
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    console.log(`✓ Transaksi tertunda [ID: ${item.id}] sukses disinkronkan ke Google Sheet.`);
                    // Hapus item yang sukses dikirim dari antrean lokal
                    queue.splice(i, 1);
                    i--; // Sesuaikan indeks pasca-penghapusan
                    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
                }
            } catch (error) {
                console.error(`❌ Gagal mengirimkan transaksi [ID: ${item.id}]:`, error);
                break; // Hentikan proses jika terjadi gangguan jaringan tengah jalan agar urutan transaksi tetap aman
            }
        }

        // Trigger update UI setelah proses pembersihan antrean selesai
        window.dispatchEvent(new CustomEvent('ams_queue_updated', { detail: { queueLength: queue.length } }));
        
        // Setelah antrean bersih, lakukan fetch ulang untuk memperbarui memori lokal dengan data terbaru dari Sheet
        if (queue.length === 0) {
            console.log('Seluruh antrean sukses diproses. Memperbarui basis data lokal...');
            await AMSDatabase.syncDataFromServer();
        }
    };

    /**
     * 📋 HITUNG PANJANG ANTREAN TERTUNDA
     */
    AMSDatabase.getQueueLength = function() {
        const rawQueue = localStorage.getItem(QUEUE_KEY);
        if (!rawQueue) return 0;
        try {
            return JSON.parse(rawQueue).length;
        } catch (e) {
            return 0;
        }
    };

    // Ekspos namespace ke objek window global
    window.AMSDatabase = AMSDatabase;

})(window);