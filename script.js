// Konfigurasi Tarif
const TARIF = {
    Motor: { pertama: 3000, berikutnya: 2000 },
    Mobil: { pertama: 5000, berikutnya: 3000 },
    Truk: { pertama: 10000, berikutnya: 5000 }
};

// State Data (Ambil dari LocalStorage jika ada)
let vehicles = JSON.parse(localStorage.getItem('parkingData')) || [];
let activeVehicleExit = null;

// Utility: Format Rupiah
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// Utility: Format Tanggal Waktu
const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

// Utility: Toast Notification
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.className = 'toast hidden', 3000);
};

// Logika Menghitung Durasi dan Biaya
const hitungBiaya = (jenis, timeMasuk, timeKeluar) => {
    const masuk = new Date(timeMasuk);
    const keluar = new Date(timeKeluar);
    const diffMs = keluar - masuk;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));

    // Konversi durasi seperti di contoh soal (misal 4j 30m dihitung 4 jam sisa untuk perhitungan base jam)
    const jam = Math.floor(diffMins / 60);
    const menit = diffMins % 60;
    const chargeJam = Math.max(1, jam); // Minimal dihitung 1 jam pertama

    let biaya = TARIF[jenis].pertama;
    if (chargeJam > 1) {
        biaya += (chargeJam - 1) * TARIF[jenis].berikutnya;
    }

    return { durasi: `${jam} Jam ${menit} Menit`, biaya: biaya };
};

// ---------------- LOGIN SYSTEM ---------------- //
document.getElementById('toggle-password').addEventListener('click', function() {
    const passInput = document.getElementById('password');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        this.classList.replace('fa-eye-slash', 'fa-eye');
    } else {
        passInput.type = 'password';
        this.classList.replace('fa-eye', 'fa-eye-slash');
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === 'admin' && pass === 'admin123') {
        document.getElementById('login-section').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');
            initDashboard();
        }, 500);
        showToast('Login Berhasil!');
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('login-section').style.opacity = '1';
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
});

// ---------------- NAVIGATION SYSTEM ---------------- //
const navLinks = document.querySelectorAll('.nav-links li');
const views = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('page-title');

navLinks.forEach(link => {
    link.addEventListener('click', function() {
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        const targetView = this.getAttribute('data-view');
        views.forEach(v => v.classList.add('hidden'));
        document.getElementById(targetView).classList.remove('hidden');

        pageTitle.textContent = this.querySelector('.nav-text').textContent;

        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

        // Refresh Data saat tab dipindah
        if (targetView === 'view-dashboard') updateStats();
        if (targetView === 'view-data') renderTableData();
        if (targetView === 'view-laporan') renderLaporan();
        if (targetView === 'view-masuk') updateWaktuMasukForm();
    });
});

// Mobile Sidebar Toggle
document.querySelector('.top-header').addEventListener('click', (e) => {
    if (e.offsetX < 30) document.getElementById('sidebar').classList.add('open');
});
document.getElementById('toggle-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
});

// ---------------- CORE FUNCTIONALITY ---------------- //

function initDashboard() {
    updateStats();
    renderTableData();
    updateWaktuMasukForm();
}

function updateWaktuMasukForm() {
    // Set field waktu dengan waktu saat ini (readonly)
    document.getElementById('in-waktu').value = formatDateTime(new Date().toISOString());
}

// Simpan Data Kendaraan Masuk
document.getElementById('form-masuk').addEventListener('submit', (e) => {
    e.preventDefault();
    const nopol = document.getElementById('in-nopol').value.toUpperCase();

    // Cek apakah kendaraan masih parkir
    const isExist = vehicles.find(v => v.nopol === nopol && v.status === 'Parkir');
    if (isExist) {
        showToast('Kendaraan masih berstatus parkir!', 'error');
        return;
    }

    const newVehicle = {
        id: Date.now(),
        nopol: nopol,
        jenis: document.getElementById('in-jenis').value,
        nama: document.getElementById('in-nama').value || '-',
        waktuMasuk: new Date().toISOString(),
        waktuKeluar: null,
        status: 'Parkir',
        biaya: 0,
        durasi: '-'
    };

    vehicles.push(newVehicle);
    localStorage.setItem('parkingData', JSON.stringify(vehicles));

    showToast('Kendaraan masuk berhasil disimpan!');
    document.getElementById('form-masuk').reset();
    updateWaktuMasukForm();
    updateStats();
});

// Cari Kendaraan Keluar
document.getElementById('btn-search-out').addEventListener('click', () => {
    const nopol = document.getElementById('out-search-nopol').value.toUpperCase();
    const vehicle = vehicles.find(v => v.nopol === nopol && v.status === 'Parkir');

    if (vehicle) {
        activeVehicleExit = vehicle;
        const now = new Date().toISOString();
        const kalkulasi = hitungBiaya(vehicle.jenis, vehicle.waktuMasuk, now);

        document.getElementById('out-nopol').textContent = vehicle.nopol;
        document.getElementById('out-jenis').textContent = vehicle.jenis;
        document.getElementById('out-masuk').textContent = formatDateTime(vehicle.waktuMasuk);
        document.getElementById('out-keluar').textContent = formatDateTime(now);
        document.getElementById('out-durasi').textContent = kalkulasi.durasi;
        document.getElementById('out-biaya').textContent = formatRupiah(kalkulasi.biaya);

        // Simpan sementara kalkulasi di object active
        activeVehicleExit.tempKeluar = now;
        activeVehicleExit.tempDurasi = kalkulasi.durasi;
        activeVehicleExit.tempBiaya = kalkulasi.biaya;

        document.getElementById('out-result').classList.remove('hidden');
    } else {
        showToast('Kendaraan tidak ditemukan atau sudah keluar!', 'error');
        document.getElementById('out-result').classList.add('hidden');
    }
});

// Proses Kendaraan Keluar
document.getElementById('btn-proses-keluar').addEventListener('click', () => {
    if (!activeVehicleExit) return;

    // Update status di array
    const index = vehicles.findIndex(v => v.id === activeVehicleExit.id);
    vehicles[index].status = 'Keluar';
    vehicles[index].waktuKeluar = activeVehicleExit.tempKeluar;
    vehicles[index].durasi = activeVehicleExit.tempDurasi;
    vehicles[index].biaya = activeVehicleExit.tempBiaya;

    localStorage.setItem('parkingData', JSON.stringify(vehicles));
    showToast('Pembayaran berhasil, kendaraan keluar!');

    document.getElementById('out-result').classList.add('hidden');
    document.getElementById('out-search-nopol').value = '';
    activeVehicleExit = null;
    updateStats();
});

// Hapus Data
function hapusData(id) {
    if (confirm('Yakin ingin menghapus data ini?')) {
        vehicles = vehicles.filter(v => v.id !== id);
        localStorage.setItem('parkingData', JSON.stringify(vehicles));
        renderTableData();
        updateStats();
        showToast('Data berhasil dihapus');
    }
}

// Render Data Table
function renderTableData(filterText = '') {
    const tbody = document.getElementById('table-body-data');
    tbody.innerHTML = '';

    // Sort desc (Terbaru diatas)
    const sorted = [...vehicles].sort((a, b) => b.id - a.id);

    let no = 1;
    sorted.forEach(v => {
        if (filterText && !v.nopol.includes(filterText.toUpperCase())) return;

        const tr = document.createElement('tr');
        const badgeClass = v.status === 'Parkir' ? 'badge-active' : 'badge-done';
        tr.innerHTML = `
            <td>${no++}</td>
            <td class="fw-bold">${v.nopol}</td>
            <td>${v.jenis}</td>
            <td>${v.nama}</td>
            <td>${formatDateTime(v.waktuMasuk)}</td>
            <td><span class="badge ${badgeClass}">${v.status}</span></td>
            <td>
                <button class="btn btn-danger" onclick="hapusData(${v.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Live Search Data Kendaraan
document.getElementById('search-data').addEventListener('keyup', (e) => {
    renderTableData(e.target.value);
});

// Update Dashboard Statistics
function updateStats() {
    const todayStr = new Date().toDateString();
    let hariIni = vehicles.filter(v => new Date(v.waktuMasuk).toDateString() === todayStr);

    const totalHariIni = hariIni.length;
    const parkirSekarang = vehicles.filter(v => v.status === 'Parkir').length;
    const keluarHariIni = hariIni.filter(v => v.status === 'Keluar').length;

    const pendapatan = hariIni.reduce((total, v) => total + (v.biaya || 0), 0);

    document.getElementById('stat-total').textContent = totalHariIni;
    document.getElementById('stat-masuk').textContent = parkirSekarang;
    document.getElementById('stat-keluar').textContent = keluarHariIni;
    document.getElementById('stat-pendapatan').textContent = formatRupiah(pendapatan);
}

// Render Laporan Harian
function renderLaporan() {
    const tbody = document.getElementById('table-body-laporan');
    tbody.innerHTML = '';

    const filterDateValue = document.getElementById('filter-date').value;
    let filtered = vehicles.filter(v => v.status === 'Keluar'); // Laporan fokus yang sudah keluar & bayar

    if (filterDateValue) {
        filtered = filtered.filter(v => v.waktuMasuk.startsWith(filterDateValue));
    }

    filtered.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${v.nopol}</td>
            <td>${v.jenis}</td>
            <td>${formatDateTime(v.waktuMasuk)}</td>
            <td>${formatDateTime(v.waktuKeluar)}</td>
            <td>${v.durasi}</td>
            <td class="text-green fw-bold">${formatRupiah(v.biaya)}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('filter-date').addEventListener('change', renderLaporan);

// Simulasi Export
document.getElementById('btn-export-pdf').addEventListener('click', () => { showToast('Mengunduh Laporan PDF...'); });
document.getElementById('btn-export-excel').addEventListener('click', () => { showToast('Mengunduh Laporan Excel...'); });