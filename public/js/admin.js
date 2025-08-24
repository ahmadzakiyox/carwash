document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    // Elemen Tabel
    const ordersTableBody = document.getElementById('orders-table-body');
    const usersTableBody = document.getElementById('users-table-body');
    
    // Tombol Download
    const downloadExcelBtn = document.getElementById('download-excel');

    // Elemen Modal untuk QR Code
    const qrModalElement = document.getElementById('qrCodeModal');
    const qrCodeModal = new bootstrap.Modal(qrModalElement);
    const qrCodeContainer = document.getElementById('qrCodeContainer');

    // --- FUNGSI UNTUK MENGAMBIL DAN MENAMPILKAN DATA PESANAN ---
    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders', { 
                headers: { 'x-auth-token': token } 
            });

            if (res.status >= 400) {
                 const data = await res.json();
                 alert(data.msg || 'Akses ditolak.');
                 window.location.href = '/';
                 return;
            }
            
            const orders = await res.json();
            ordersTableBody.innerHTML = ''; 

            orders.forEach(order => {
                const row = document.createElement('tr');
                
                // Siapkan data untuk QR code dalam format string JSON
                const orderDataString = JSON.stringify({
                    orderId: order._id,
                    customer: order.customerName,
                    plate: order.plateNumber,
                    service: order.service
                });

                row.innerHTML = `
                    <td>${new Date(order.date).toLocaleDateString('id-ID')}</td>
                    <td>${order.customerName}</td>
                    <td>${order.plateNumber}</td>
                    <td>${order.vehicleBrand}</td>
                    <td>${order.service}</td>
                    <td>Rp ${order.price.toLocaleString('id-ID')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-dark show-qr-btn" data-order='${orderDataString}'>
                            Tampilkan QR
                        </button>
                    </td>
                `;
                ordersTableBody.appendChild(row);
            });
        } catch (err) {
            console.error('Gagal mengambil data pesanan:', err);
        }
    };
    
  // --- FUNGSI UNTUK MENGAMBIL DAN MENAMPILKAN DATA PENGGUNA ---
const fetchUsers = async () => {
    try {
        const res = await fetch('/api/users', {
            headers: { 'x-auth-token': token }
        });

        // Perbaikan kecil: Ganti 'if (!res.ok) return;' dengan ini agar lebih informatif
        if (!res.ok) {
            console.error('Gagal mengambil data pengguna. Status:', res.status);
            return; // Hentikan fungsi jika ada error
        }
        
        const users = await res.json();
        usersTableBody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            const isVerifiedBadge = user.isVerified 
                ? `<span class="badge bg-success">Terverifikasi</span>` 
                : `<span class="badge bg-warning text-dark">Belum</span>`;

            row.innerHTML = `
                <td>${new Date(user.date).toLocaleDateString('id-ID')}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${isVerifiedBadge}</td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error di dalam fetchUsers:', err);
    }
};
    
    // --- FUNGSI UNTUK EKSPOR DATA PESANAN KE EXCEL ---
    const exportToExcel = async () => {
        try {
            const res = await fetch('/api/orders', { headers: { 'x-auth-token': token } });
            const orders = await res.json();
            const dataToExport = orders.map(order => ({
                'Tanggal': new Date(order.date).toLocaleDateString('id-ID'),
                'Nama Customer': order.customerName,
                'Plat Kendaraan': order.plateNumber,
                'Merk Kendaraan': order.vehicleBrand,
                'Kategori': order.vehicleCategory,
                'Layanan': order.service,
                'Harga': order.price
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pesanan');
            XLSX.writeFile(workbook, 'DataPesananCarwash.xlsx');
        } catch (err) {
            console.error('Gagal mengekspor ke Excel:', err);
            alert('Gagal mengekspor data.');
        }
    };
    
    // --- EVENT LISTENER UNTUK SEMUA TOMBOL "TAMPILKAN QR" ---
    ordersTableBody.addEventListener('click', (event) => {
        if (event.target && event.target.classList.contains('show-qr-btn')) {
            const orderData = JSON.parse(event.target.getAttribute('data-order'));
            
            // Bersihkan container QR code dari sisa sebelumnya
            qrCodeContainer.innerHTML = '';

            // Buat QR Code baru di dalam modal
            new QRCode(qrCodeContainer, {
                text: JSON.stringify(orderData),
                width: 256,
                height: 256
            });

            // Tampilkan modal
            qrCodeModal.show();
        }
    });

    // --- INISIALISASI HALAMAN ---
    if (!token) {
        alert('Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }
    
    // Panggil semua fungsi untuk memuat data saat halaman dibuka
    fetchOrders();
    fetchUsers(); 
    
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', exportToExcel);
    }
});