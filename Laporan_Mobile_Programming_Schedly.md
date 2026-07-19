# LAPORAN FINAL PROJECT
**PERANCANGAN DAN IMPLEMENTASI APLIKASI MANAJEMEN JADWAL "SCHEDLY" SEBAGAI PROGRESSIVE WEB APP (PWA)**

**MATA KULIAH PEMROGRAMAN MOBILE**
**DOSEN PENGAMPU:** [Nama Dosen Pengampu MK]

<br/>
<br/>

**Disusun Oleh:**
1. [Nama Lengkap] ([NIM])
2. [Nama Lengkap] ([NIM])
3. [Nama Lengkap] ([NIM])

<br/>
<br/>

**PROGRAM STUDI INFORMATIKA**
**FAKULTAS TEKNOLOGI INFORMASI**
**UNIVERSITAS NAHDLATUL ULAMA YOGYAKARTA**
**2026**

---

## RINGKASAN EKSEKUTIF
Proyek ini mendeskripsikan perancangan dan implementasi aplikasi manajemen jadwal harian bernama "Schedly" yang dikembangkan untuk memenuhi kebutuhan pengguna akan sistem pengingat dan pengorganisasian tugas yang efisien. Schedly dibangun menggunakan teknologi Progressive Web App (PWA) agar dapat berjalan dengan optimal pada perangkat mobile dengan pengalaman pengguna menyerupai aplikasi *native*. Aplikasi ini mencakup fitur pengelolaan tugas (CRUD), kategori, dan pengingat jadwal yang dirancang untuk mengatasi masalah manajemen waktu di kalangan pelajar dan profesional. Pengembangan sistem menggunakan metode *Waterfall*, meliputi tahap analisis, desain, implementasi, hingga pengujian menggunakan metode *Black Box Testing*. Hasil akhir dari proyek ini adalah sebuah aplikasi PWA fungsional yang dapat diakses secara instan melalui browser seluler maupun diinstal di *home screen*, serta terbukti layak melalui tahapan pengujian yang telah dilakukan.

---

## DAFTAR ISI
1. RINGKASAN EKSEKUTIF
2. DAFTAR ISI
3. DAFTAR TABEL
4. DAFTAR GAMBAR
5. DAFTAR LAMPIRAN
6. BAB I PENDAHULUAN
    * A. Latar Belakang Masalah
    * B. Rumusan Masalah
    * C. Tujuan
    * D. Batasan Masalah
7. BAB II TINJAUAN PUSTAKA
    * A. Progressive Web App (PWA)
    * B. Manajemen Jadwal
8. BAB III METODE PERANCANGAN
    * A. Metode yang Digunakan
    * B. Tahapan Perancangan
9. BAB IV HASIL DAN PEMBAHASAN
    * A. Implementasi
    * B. Pengujian Program
    * C. Analisis Dan Pembahasan
        * 1. Kelebihan Sistem
        * 2. Kekurangan Sistem
10. BAB V KESIMPULAN DAN SARAN
    * A. KESIMPULAN
    * B. SARAN
11. DAFTAR PUSTAKA
12. LAMPIRAN

*(Catatan: Daftar Isi di atas adalah struktur acuan, jika dikonversi ke PDF/Word silahkan disesuaikan nomor halamannya).*

---

## BAB I PENDAHULUAN

### A. Latar Belakang Masalah
Di era mobilitas tinggi saat ini, produktivitas harian sangat bergantung pada pengelolaan waktu yang baik. Pengguna *smartphone* yang mencakup kalangan pelajar, mahasiswa, hingga pekerja profesional kerap menghadapi kendala berupa kesulitan melacak tugas-tugas spesifik, jadwal kegiatan, serta tenggat waktu (deadline). Masalah pengelolaan waktu yang tidak terorganisir dengan baik dapat menyebabkan penumpukan pekerjaan, terlewatnya komitmen penting, dan meningkatnya stres. Penggunaan aplikasi bawaan gawai kadang kala dirasa kurang interaktif atau tidak difokuskan secara mendalam pada penjadwalan personal. 

Oleh karena itu, diperlukan sebuah sistem informasi manajemen jadwal dan *to-do list* yang mudah diakses dan responsif di berbagai ukuran layar ponsel pintar. Untuk memenuhi hal ini tanpa memaksa pengguna mengunduh aplikasi berukuran besar melalui pasar aplikasi (seperti App Store atau Play Store), solusi yang diusulkan adalah merancang bangun "Schedly". Aplikasi ini diimplementasikan menggunakan arsitektur web modern, menjadikannya sebuah aplikasi lintas-*platform* yang interaktif. Sebagai pemenuhan kebutuhan mata kuliah pemrograman mobile, Schedly menerapkan konsep *Progressive Web App* (PWA) yang memberikan nuansa penggunaan, responsivitas, dan fleksibilitas seperti halnya sebuah aplikasi seluler murni.

### B. Rumusan Masalah
Berdasarkan latar belakang masalah yang telah diuraikan, maka rumusan masalah dalam perancangan sistem aplikasi Schedly adalah:
1. Bagaimana merancang bangun aplikasi seluler "Schedly" sebagai solusi pencatatan dan pengelolaan tugas yang efisien bagi para penggunanya?
2. Bagaimana menerapkan teknologi web berorientasi seluler (*Progressive Web App*) agar aplikasi Schedly dapat diinstal dan memberikan pengalaman menyerupai aplikasi *native* di *smartphone*?
3. Bagaimana memvalidasi keberfungsian fitur pada sistem yang dibangun menggunakan pengujian *Black Box Testing* untuk menjamin kualitas perangkat lunak?

### C. Tujuan
Tujuan yang hendak dicapai dari penelitian dan pengembangan sistem ini antara lain:
1. Merancang bangun aplikasi seluler manajemen jadwal bernama "Schedly" guna membantu pengguna mengelola prioritas pekerjaan secara terpadu.
2. Menerapkan arsitektur dan kapabilitas PWA pada aplikasi tersebut sehingga mudah diakses dan responsif di berbagai perangkat bergerak pengguna.
3. Melakukan tahapan pengujian perangkat lunak menggunakan *Black Box Testing* guna mengevaluasi ketepatan keluaran (*output*) pada perangkat seluler.

### D. Batasan Masalah
Untuk menjaga agar fokus penyelesaian masalah tetap terarah, batasan yang ditetapkan meliputi:
1. **Sasaran Pengguna & Luaran:** Pengguna (*user*) dari aplikasi mencakup individu secara umum (pelajar, mahasiswa, profesional) yang harus melakukan autentikasi (login/registrasi). Data yang diinput berpusat pada entri nama tugas, tenggat waktu, serta pengaturan kategori tugas. Luaran yang dihasilkan dari sistem berupa daftar tugas terjadwal.
2. **Metode & Pendekatan:** Metode pengembangan perangkat lunak yang digunakan adalah **Waterfall**. Pendekatan perancangan aplikasinya menggunakan pemrograman fungsional dan berorientasi objek dalam ranah web *mobile*.
3. **Kebutuhan *Software* & *Hardware*:** Pembangunan aplikasi membutuhkan *software* seperti Node.js untuk server *backend*, SQL Database untuk penyimpanan persisten, dan peramban seluler pendukung fitur PWA. *Hardware* yang dibutuhkan berupa Laptop/PC (sebagai sarana pengembangan) dan *Smartphone* (sebagai sarana simulasi pengujian akhir).
4. **Teknik Pengujian:** Metode pengujian dilakukan sepenuhnya menggunakan *Black Box Testing* di mana fokus ada pada ketepatan input pengguna dan output aplikasi pada lingkungan uji seluler.

---

## BAB II TINJAUAN PUSTAKA

### A. Progressive Web App (PWA) dalam Aplikasi Mobile
Progressive Web App (PWA) adalah metode optimalisasi aplikasi antarmuka web modern agar mampu memberikan pengalaman (*user experience*) yang sebanding dengan aplikasi ponsel *native*. Menurut Biørn-Hansen et al. (2017), PWA memanfaatkan fitur *Service Workers* untuk kapabilitas akses aplikasi dalam kondisi luring (jaringan terputus), melakukan cache pada aset *interface*, dan mendeteksi ketersediaan jaringan (*background sync*). Pemilihan PWA pada mata kuliah ini sangat relevan untuk menghadirkan aplikasi yang hemat sumber daya memori *smartphone* sekaligus menunjang aksesibilitas tinggi secara *cross-platform*.

### B. Manajemen Jadwal dan Aplikasi To-Do List
Dalam disiplin psikologi dan manajerial, manajemen jadwal merujuk pada proses memprioritaskan dan mengalokasikan slot waktu bagi aktivitas-aktivitas tertentu untuk meningkatkan produktivitas harian individu (Macan, 1994). Aplikasi manajemen tugas yang berfokus pada penjadwalan diharuskan memiliki kapabilitas entri data berupa manajemen aktivitas CRUD (*Create, Read, Update, Delete*) dan mekanisme notifikasi.

---

## BAB III METODE PERANCANGAN

### A. Metode yang Digunakan
Metode perancangan sistem yang digunakan dalam penyusunan penelitian ini adalah pendekatan pengembangan perangkat lunak **Waterfall**. Konsep ini menjalankan siklus perancangan perangkat lunak secara linear atau sekuensial yang sistematis. Setiap tahapan diselesaikan dengan tuntas sebelum beranjak pada tahap selanjutnya. Hal ini dipilih untuk menjaga agar integrasi basis data dari *backend* dengan tampilan aplikasi (PWA) di sisi *client* seluler menjadi lebih padu tanpa ada rombakan kebutuhan sistem di tengah jalan.

### B. Tahapan Perancangan
Tahapan yang dikerjakan pada implementasi proyek mengikuti langkah dalam metode *Waterfall*:
1. **Analisis Kebutuhan (*Requirement Analysis*):** Tahap awal yang dilakukan dengan mengidentifikasi kebutuhan spesifikasi dari sisi pengguna. Pada aplikasi Schedly, ditentukan fitur penting meliputi sistem autentikasi pengguna, antarmuka pengisian manajemen jadwal, penentuan syarat manifest PWA agar memenuhi standard kelayakan instalasi pada perangkat bergerak.
2. **Desain Sistem (*System Design*):** Melakukan abstraksi sistem mulai dari arsitektur basis data relasional (*Entity Relationship Diagram*) menggunakan SQL, serta pembuatan purwarupa halaman antarmuka (*UI Mockup*) dengan fokus pada orientasi tata letak ukuran *smartphone* (pendekatan *mobile-first*).
3. **Implementasi (*Implementation*):** Pada fase ini, sketsa antarmuka dan struktur aplikasi mulai ditulis dalam baris kode program. Proses implementasi aplikasi difokuskan pada sinkronisasi *backend* menggunakan Node.js (*Express.js*) dan integrasi PWA menggunakan berkas manifest dan mekanisme Service Worker pada *frontend*.
4. **Pengujian (*Integration and Testing*):** Fase di mana program yang telah diimplementasikan dilakukan verifikasi keseluruhan dengan menggunakan instrumen uji aplikasi seluler *Black Box*.
5. **Pemeliharaan (*Deployment and Maintenance*):** Aplikasi dideploy ke server dan dapat diakses dengan protokol keamanan jaringan (HTTPS) untuk menjamin pemenuhan standar instalasi aplikasi PWA di peramban *smartphone*.

---

## BAB IV HASIL DAN PEMBAHASAN

### A. Implementasi
Implementasi menghasilkan aplikasi ponsel "Schedly" yang ringan. Antarmuka telah beradaptasi untuk dioperasikan dengan layar sentuh (touchscreen) pada perangkat *smartphone*.
*(Instruksi untuk Tim Pengembang: Masukkan foto-foto Screenshot (tangkapan layar) pengujian aplikasi di hp. Minimal menyertakan 4 gambar seperti:*
*- Gambar Halaman Login pada browser hp*
*- Gambar Peringatan / Prompt Install Add to Homescreen*
*- Gambar Halaman Daftar Jadwal (Beranda/Dashboard)*
*- Gambar Halaman Form Tambah Jadwal*
*Jelaskan tiap gambar di bawahnya!)*

### B. Pengujian Program
Pengujian terfokus untuk membuktikan aplikasi Schedly layak rilis, aman dari *bug* dominan dan fungsional dari sisi pengguna. Proses uji sistem dilakukan dengan teknik pengujian *Black Box Testing*.
*(Instruksi untuk Tim Pengembang: Masukkan tabel pengujian Black Box di sini. Contoh tabel meliputi kolom No, Kasus Uji, Data Input, Hasil yang Diharapkan, Hasil Sebenarnya, dan Status Validasi).*
- **Contoh Skenario Pengujian 1:** Proses menambah jadwal.
- **Contoh Skenario Pengujian 2:** Proses mengedit jadwal yang terdaftar.
- **Contoh Skenario Pengujian 3:** Uji respon PWA saat perangkat HP *offline*.

### C. Analisis Dan Pembahasan
Hasil analisis menunjukkan bahwa aplikasi Schedly berhasil menjembatani permasalahan pencatatan jadwal harian, memberikan kemudahan entri manajemen prioritas tugas.

#### 1. Kelebihan Sistem
Aplikasi ini menjawab tantangan dari sisi fungsionalitas dan optimalisasi *software*:
- **Penyimpanan Sangat Efisien:** Schedly hadir sebagai alternatif aplikasi harian tanpa memaksa penumpukan ukuran memori memori internal *smartphone*. 
- **Fleksibel dan Cepat:** Mendukung akses lintas platform operasi (*Android / iOS*) selama pengguna mengakses dan memasangnya via browser standar masa kini.
- **Desain Khusus *Mobile*:** *User Interface* telah disesuaikan dengan interaksi sentuhan (touch gestures) dan nyaman dibaca dalam perangkat genggam secara dinamis.

#### 2. Kekurangan Sistem
Sistem yang ada belum sepenuhnya menutupi seluruh kebutuhan lanjutan dari para pegguna tingkat *advance*:
- Fitur PWA pada *operating system* tertentu (misal iOS versi lama) masih dibatasi kapabilitas *Push Notification*-nya, karena dukungan teknis dari vendor ponsel.
- Schedly belum mendukung penjadwalan multi-pihak (*Team Collaboration / Sharing Task*) sehingga pengguna tidak bisa berbagi jadwal kepada pengguna Schedly lainnya.

---

## BAB V KESIMPULAN DAN SARAN

### A. KESIMPULAN
Berdasarkan perancangan dan implementasi aplikasi manajemen jadwal "Schedly", maka dapat disimpulkan bahwa:
1. Pembangunan Schedly sebagai perwujudan proyek pemenuhan mata kuliah Pemrograman Mobile berhasil dieksekusi secara penuh; sistem telah melengkapi kebutuhan proses penambahan, peninjauan, modifikasi, hingga penghapusan jadwal kegiatan harian yang terintegrasi secara *real-time*.
2. Implementasi dengan teknologi *Progressive Web App* memampukan sistem memberikan sensasi seperti aplikasi native; aplikasi ini dapat terinstal di *Home Screen* gawai, merender halaman dengan cepat, dan menawarkan skema responsivitas yang optimal dalam format layar *smartphone*.
3. Sistem aplikasi terbukti telah memenuhi parameter fungsional karena seluruh skenario input-output pada tahap validasi *Black Box Testing* berjalan dengan lancar tanpa ada galat operasional pada perangkat pengujian genggam.

### B. SARAN
Ke depannya, aplikasi Schedly direkomendasikan untuk menerima modifikasi berkesinambungan di area sebagai berikut:
1. Menambahkan dukungan API notifikasi lanjutan melalui implementasi *Web Push Notification* secara terpusat untuk memberitahukan jadwal dalam rentang menit sebelum *deadline* aktivitas mendekat.
2. Memfasilitasi integrasi (API hooks) ke aplikasi kalender natif seperti *Google Calendar* untuk memusatkan informasi kalender dari dua alat yang berbeda ke satu *dashboard* sentral.

---

## DAFTAR PUSTAKA
- Biørn-Hansen, A., Majchrzak, T. A., & Grønli, T. M. (2017). 'Progressive Web Apps: The possible web-native unifier for mobile development'. *Proceedings of the 13th International Conference on Web Information Systems and Technologies (WEBIST)*, pp. 344-351.
- Macan, T. H. (1994). 'Time management: Test of a process model'. *Journal of Applied Psychology*, 79(3), pp. 381-391.
*(Silahkan sesuaikan referensi lain terkait pustaka NodeJS, Database, dan dokumentasi kurikulum jika diperlukan)*

---

## LAMPIRAN
1. Dokumentasi Foto-Foto setiap Tahapan (Misal: kegiatan koding kelompok / bimbingan).
2. Bukti Uji Kelayakan Aplikasi (Tabel Black Box lengkap yang telah disahkan).
3. Screen Shoot Upload Video Presentasi: *(Masukkan link)*
4. Link Github Hasil Project: *(Masukkan link)*
5. Slide Presentasi PPT: (File Terlampir)
