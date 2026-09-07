-- ---------------------------------------------------------------------------
-- TNG Daily — seed_articles.sql (GENERATED, do not edit by hand)
--
-- Source: src/lib/data/demo/articles-part-one.ts and articles-part-two.ts
-- Regenerate: npm run seed:articles
--
-- Apply after supabase/seed.sql. Every row is flagged is_sample = true, and the
-- public UI renders a visible "Contoh" patch on sample articles.
-- ---------------------------------------------------------------------------

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Enam Spot Nongkrong di Cipondoh yang Belum Diserbu Anak Jakarta$t$,
  $s$spot-nongkrong-cipondoh-masih-sepi$s$,
  $d$Bukan daftar tempat paling estetik. Ini daftar tempat yang masih bisa kamu duduki dua jam tanpa antre dan tanpa dilihatin barista.$d$,
  $e$Ada satu tanda yang paling jujur untuk menilai tempat nongkrong di Tangerang: berapa lama kamu bisa duduk sebelum merasa harus pesan lagi. Di kafe yang sudah viral, jawabannya sek…$e$,
  $md$Ada satu tanda yang paling jujur untuk menilai tempat nongkrong di Tangerang: berapa lama kamu bisa duduk sebelum merasa harus pesan lagi. Di kafe yang sudah viral, jawabannya sekitar 40 menit. Di enam tempat berikut, jawabannya masih dua jam lebih.

Semua tempat di daftar ini kami datangi sendiri di hari kerja, antara jam 10 pagi dan 4 sore. Kami catat harga menu termurah, jumlah colokan yang benar-benar hidup, dan apakah ada meja yang cukup lebar untuk laptop plus buku.

## Yang kami cari, dan yang kami abaikan

Kami tidak menilai estetika. Kami tidak peduli apakah dindingnya beton ekspos atau tembok cat biasa. Yang kami hitung: harga, colokan, kursi yang tidak bikin punggung sakit setelah satu jam, dan sikap pemiliknya terhadap orang yang nongkrong lama.

Satu hal yang kami tolak masukkan ke daftar: tempat yang memasang aturan minimum pembelian per jam. Bukan karena aturannya salah, tapi karena artinya tempat itu memang tidak diniatkan untuk duduk lama, dan tidak jujur kalau kami rekomendasikan untuk itu.

## Kenapa Cipondoh, bukan Alam Sutera

Alam Sutera dan BSD sudah punya ekosistem kafe sendiri, lengkap dengan harga yang ikut menyesuaikan. Cipondoh berada di posisi yang menarik: cukup dekat ke pusat Kota Tangerang, tapi belum jadi tujuan akhir pekan orang Jakarta. Efeknya terasa di harga dan di tingkat keramaian.

Ini juga area yang padat mahasiswa dan pekerja shift. Banyak tempat di sini buka sampai lewat tengah malam bukan karena mengejar tren, tapi karena pelanggannya memang datang jam segitu.

## Catatan soal harga

Angka yang kami tulis adalah harga saat kami datang. Harga kopi di Tangerang bergerak cepat, terutama setelah harga biji impor naik. Kalau kamu datang dan harganya beda, itu wajar, dan bukan berarti tempatnya menipu.

Untuk kamu yang datang naik angkot: lima dari enam tempat ini berada di jalur yang dilewati angkot dari Terminal Cimone. Satu tempat butuh jalan kaki sekitar tujuh menit dari pemberhentian terdekat, dan trotoarnya tidak nyaman kalau hujan.

## Yang paling sering ditanya

Pertanyaan yang paling sering masuk ke DM kami soal daftar seperti ini bukan "mana yang paling enak kopinya", tapi "mana yang paling aman ditinggal laptop kalau ke toilet". Jawaban jujurnya: tidak ada tempat yang aman untuk itu, di Cipondoh atau di mana pun. Bawa laptopmu.

Kalau kamu punya tempat yang layak masuk daftar berikutnya, kirim ke kami. Yang kami butuh cuma nama tempat, harga menu termurah, dan satu alasan kenapa kamu masih balik ke situ.$md$,
  $img$/images/articles/vibes/vibes-spot-nongkrong-cipondoh-masih-sepi.webp$img$,
  $alt$Nongkrong santai di warung kopi Cipondoh Tangerang sore hari$alt$,
  $crd$Foto: Redaksi TNG Daily / Midday Cipondoh$crd$,
  'vibes'::tng_pillar,
  '{"nongkrong","cipondoh","kopi","murah"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '1 days',
  $st$6 Spot Nongkrong Cipondoh yang Masih Sepi dan Murah$st$,
  $mdesc$Enam tempat nongkrong di Cipondoh yang masih longgar, colokan lengkap, dan harga di bawah dua puluh ribu. Catatan dari yang beneran duduk di situ.$mdesc$,
  $pk$nongkrong cipondoh$pk$,
  '{"kopi murah tangerang","tempat kerja tangerang"}',
  2,
  true,
  4218, 312, 188, 74
where not exists (
  select 1 from public.articles a where a.slug = $s2$spot-nongkrong-cipondoh-masih-sepi$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Angkot Tangerang Tidak Mati Mendadak, Dia Hilang Pelan-Pelan$t$,
  $s$angkot-tangerang-hilang-pelan-pelan$s$,
  $d$Yang berubah bukan cuma jumlah armada. Yang berubah adalah siapa yang masih punya pilihan untuk tidak naik angkot.$d$,
  $e$Kalau kamu naik angkot di Tangerang minggu ini, kemungkinan besar kamu duduk di kendaraan yang setengah kosong. Bukan karena jamnya salah. Sopir yang kami ajak ngobrol di Cimone b…$e$,
  $md$Kalau kamu naik angkot di Tangerang minggu ini, kemungkinan besar kamu duduk di kendaraan yang setengah kosong. Bukan karena jamnya salah. Sopir yang kami ajak ngobrol di Cimone bilang dia sekarang butuh 50 menit untuk menunggu penuh, padahal beberapa tahun lalu cukup 15 menit.

Cerita ini biasanya diceritakan sebagai nostalgia. Kami mau menceritakannya sebagai soal pilihan: siapa yang masih tidak punya pilihan lain.

## Yang pindah dan yang tidak

Orang yang punya akses ke motor, cicilan, atau ojek online sudah pindah. Yang tersisa di angkot punya pola yang cukup konsisten: pelajar yang belum boleh bawa motor, pekerja lansia, dan orang yang membawa barang terlalu banyak untuk motor tapi terlalu sedikit untuk sewa mobil bak.

[BUTUH VERIFIKASI: data resmi jumlah armada angkot aktif per rute di Kota Tangerang tiga tahun terakhir, dari Dinas Perhubungan]

Kelompok terakhir yang paling sering hilang dari percakapan. Ibu-ibu pedagang yang bawa dua karung dagangan tidak bisa naik ojek online, dan biaya sewa kendaraan memakan margin harian mereka.

## Ongkos yang tidak turun

Satu hal yang jarang dibahas: ketika penumpang berkurang, ongkos tidak ikut turun. Sopir menahan tarif atau menaikkannya untuk menutup setoran dan bensin. Jadi kelompok yang paling bergantung pada angkot justru menanggung layanan yang makin jarang dengan harga yang tidak makin murah.

Ini pola yang muncul di banyak kota, bukan cuma Tangerang. Yang khas Tangerang adalah geografinya: banyak permukiman baru yang dibangun tanpa jalur angkot sama sekali, jadi penurunan penumpang sebagian bukan soal orang meninggalkan angkot, tapi soal orang tinggal di tempat yang angkotnya tidak pernah masuk.

## Yang bisa dibaca dari halte

Coba perhatikan halte dan titik naik turun di jalur utama. Sebagian besar tidak punya informasi rute sama sekali. Untuk orang yang sudah hafal, itu bukan masalah. Untuk pendatang, mahasiswa baru, atau siapa pun yang baru pindah, angkot praktis jadi sistem tertutup yang hanya bisa dipakai kalau kamu sudah tahu caranya.

Kalau sebuah moda transportasi hanya bisa dipakai oleh orang yang sudah paham, dia tidak sedang menunggu penumpang baru. Dia sedang menunggu penumpang lamanya habis.

## Apa yang kami cari berikutnya

Kami sedang mengumpulkan catatan rute dari pembaca: nomor angkot, jam operasional yang sebenarnya, dan titik mana yang sudah tidak dilayani lagi meski masih tertulis di papan. Kalau kamu punya, kirim ke kami. Data kecil dari banyak orang biasanya lebih akurat daripada satu papan yang tidak diperbarui sejak lama.$md$,
  $img$/images/articles/suara/suara-angkot-tangerang-hilang-pelan-pelan.webp$img$,
  $alt$Angkot khas Tangerang menunggu penumpang di Terminal Cimone$alt$,
  $crd$Foto: Redaksi TNG Daily / Dokumenter Cimone$crd$,
  'suara'::tng_pillar,
  '{"transportasi","angkot","kota","commute"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '2 days',
  $st$Angkot Tangerang Makin Sepi: Siapa yang Paling Kena?$st$,
  $mdesc$Penumpang angkot Tangerang menyusut tahun demi tahun. Kami telusuri siapa yang benar-benar terdampak dan kenapa ini bukan sekadar soal nostalgia.$mdesc$,
  $pk$angkot tangerang$pk$,
  '{"transportasi tangerang","commute tangerang"}',
  2,
  true,
  7841, 604, 421, 233
where not exists (
  select 1 from public.articles a where a.slug = $s2$angkot-tangerang-hilang-pelan-pelan$s2$
);

insert into public.article_sources (
  article_id, source_name, source_url, attribution_text, source_type
)
select a.id,
  $sn$Contoh Sumber Riset$sn$,
  $su$https://example.org/riset-transportasi-lokal$su$,
  $sa$Contoh entri sumber untuk demo panel atribusi.$sa$,
  'reference'
from public.articles a
where a.slug = $s3$angkot-tangerang-hilang-pelan-pelan$s3$
  and not exists (
    select 1 from public.article_sources s
     where s.article_id = a.id and s.source_url = $su2$https://example.org/riset-transportasi-lokal$su2$
  );

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Gaji Pertama 4,2 Juta di Tangerang: Hitungan yang Tidak Ada di Loker$t$,
  $s$gaji-pertama-tangerang-hitungan-jujur$s$,
  $d$Kos, transportasi, makan, dan satu pos yang selalu lupa dihitung orang yang baru kerja.$d$,
  $e$Angka 4,2 juta terdengar cukup sampai kamu membaginya. Kami susun hitungan ini dari kiriman pembaca yang bekerja di Kota Tangerang dan Tangerang Selatan, ditambah harga yang kami …$e$,
  $md$Angka 4,2 juta terdengar cukup sampai kamu membaginya. Kami susun hitungan ini dari kiriman pembaca yang bekerja di Kota Tangerang dan Tangerang Selatan, ditambah harga yang kami cek sendiri bulan ini.

Yang paling sering salah bukan angka besarnya. Yang salah biasanya pos kecil yang muncul tiap hari.

## Pos yang bisa diprediksi

Kos dengan kamar mandi dalam di area Cikokol dan Cibodas ada di kisaran 1,1 juta sampai 1,4 juta per bulan. Tanpa kamar mandi dalam bisa turun ke 800 ribu. Listrik token biasanya di luar, sekitar 100 ribu kalau kamu tidak pakai AC, dan bisa dua kali lipat kalau pakai.

Makan tiga kali sehari di warung sekitar kos, dengan sesekali masak sendiri, jatuh sekitar 1,2 juta sampai 1,5 juta. Angka ini yang paling sering diremehkan, karena orang menghitung harga per porsi tapi lupa menghitung 30 hari.

## Pos yang selalu lupa dihitung

Transportasi harian bukan cuma ongkos ke kantor. Ada perjalanan yang tidak terjadwal: ke minimarket, ke rumah teman, ke tempat servis motor. Pembaca yang mengirim catatan ke kami rata-rata mengeluarkan 150 ribu sampai 300 ribu lebih dari yang mereka rencanakan.

Yang benar-benar sering hilang dari hitungan adalah biaya masuk kerja. Sepatu, kemeja, tas, dan kadang pelatihan atau sertifikat. Ini keluar di bulan pertama dan kedua, sebelum gajimu stabil.

## Sisa yang realistis

Setelah kos, makan, transportasi, pulsa, dan kebutuhan harian, sisa yang realistis biasanya 400 ribu sampai 900 ribu. Itu sudah termasuk hiburan. Kalau kamu mengirim uang ke keluarga, sisa ini bisa habis sepenuhnya.

Ini bukan alasan untuk menolak pekerjaan dengan angka itu. Ini alasan untuk tidak kaget di bulan kedua, dan untuk bertanya soal komponen di luar gaji pokok sebelum tanda tangan: apakah ada tunjangan transportasi, apakah makan disediakan, dan apakah lemburnya dibayar.

## Pertanyaan yang layak kamu ajukan saat wawancara

Tanyakan struktur gajinya, bukan cuma angkanya. Pokok, tunjangan, dan potongan BPJS punya efek berbeda ke uang yang benar-benar masuk rekening. Banyak pelamar baru tidak menanyakan ini karena takut terlihat tidak sopan. Menanyakan struktur gaji bukan tidak sopan, itu bagian dari pekerjaan.

Kalau kamu mau menyumbang data ke hitungan berikutnya, kirim rincian pengeluaran bulananmu tanpa nama. Semakin banyak catatan yang masuk, semakin sulit angkanya dikarang.$md$,
  $img$/images/articles/hustle/hustle-gaji-pertama-tangerang-hitungan-jujur.webp$img$,
  $alt$Buku catatan pengeluaran dan uang rupiah di meja kos Cikokol$alt$,
  $crd$Foto: Redaksi TNG Daily / Arsip Kos Cikokol$crd$,
  'hustle'::tng_pillar,
  '{"gaji","biaya hidup","kos","fresh graduate"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '3 days',
  $st$Hitungan Biaya Hidup Gaji 4,2 Juta di Tangerang$st$,
  $mdesc$Rincian realistis biaya hidup bulanan di Tangerang untuk gaji pertama 4,2 juta, termasuk pos pengeluaran yang paling sering dilupakan.$mdesc$,
  $pk$biaya hidup tangerang$pk$,
  '{"gaji fresh graduate tangerang","harga kos tangerang"}',
  2,
  true,
  12903, 1104, 1502, 318
where not exists (
  select 1 from public.articles a where a.slug = $s2$gaji-pertama-tangerang-hitungan-jujur$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Penjaga Warnet Terakhir di Karawaci Masih Buka Tiap Malam$t$,
  $s$penjaga-warnet-terakhir-karawaci$s$,
  $d$Warnetnya tinggal tujuh komputer. Pelanggannya tinggal belasan. Dia masih buka karena satu alasan yang tidak ada di rencana bisnis.$d$,
  $e$Pintu kacanya masih ditempeli stiker turnamen yang selesai bertahun-tahun lalu. Di dalam, tujuh komputer menyala, empat di antaranya terisi. Suara kipas prosesor lebih keras dari …$e$,
  $md$Pintu kacanya masih ditempeli stiker turnamen yang selesai bertahun-tahun lalu. Di dalam, tujuh komputer menyala, empat di antaranya terisi. Suara kipas prosesor lebih keras dari suara musik.

Kami datang jam sepuluh malam di hari Selasa, jam yang menurut penjaganya adalah jam paling sepi dalam seminggu.

## Tujuh komputer dan satu daftar tulisan tangan

Sistem pembukuannya masih buku tulis. Nama, jam masuk, jam keluar. Dia bilang pernah mencoba pakai aplikasi kasir, tapi berhenti karena pelanggan tetapnya sering bayar belakangan, dan aplikasi tidak punya kolom untuk itu.

Di kolom paling kanan buku itu ada tanda centang dan tanda silang. Centang berarti sudah bayar. Silang berarti belum, dan tidak dikejar.

## Yang datang bukan cuma untuk main

Empat orang yang ada di situ malam itu punya alasan berbeda. Satu mengerjakan tugas karena laptopnya rusak. Satu mencetak dokumen. Dua sedang main game yang sama seperti yang mereka mainkan di tempat itu sejak SMP.

Yang mencetak dokumen bilang dia bisa ke tempat fotokopi yang lebih dekat, tapi di sini bisa nitip berkas dan diambil besok. Layanan seperti itu tidak ada di daftar harga di dinding.

## Alasan yang tidak masuk rencana bisnis

Kami tanya kenapa belum tutup, padahal jelas tidak untung. Jawabannya bukan soal cinta pada industri warnet. Dia bilang, sebagian pelanggannya tidak punya tempat lain untuk duduk berjam-jam tanpa dilihatin.

Ada anak yang orang tuanya kerja shift malam. Ada yang rumahnya terlalu ramai untuk belajar. Dia menyebut nama-nama mereka satu per satu tanpa perlu membuka buku.

## Yang akan hilang kalau tempat ini tutup

Warnet ini akan tutup, cepat atau lambat. Sewa naik, komputer menua, dan pelanggan tetapnya lulus lalu pindah kerja. Yang menarik bukan pertanyaan apakah warnet bisa bertahan, tapi pertanyaan siapa yang akan menyediakan ruang duduk murah di Karawaci setelah tempat ini tidak ada.

Mal punya kursi, tapi punya juga rasa harus belanja. Masjid dan taman punya jam. Warnet ini punya pintu yang bisa dibuka jam sebelas malam dan tidak menanyakan apa-apa.

Kalau kamu tahu tempat lain di Tangerang yang mengambil peran serupa, kirim ke kami. Kami sedang mencatatnya.$md$,
  $img$/images/articles/story/story-penjaga-warnet-terakhir-karawaci.webp$img$,
  $alt$Suasana bilik komputer warnet malam hari di Karawaci$alt$,
  $crd$Foto: Editorial TNG Daily / Suasana Malam Karawaci$crd$,
  'story'::tng_pillar,
  '{"cerita","karawaci","warnet","komunitas"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '5 days',
  $st$Cerita Penjaga Warnet Terakhir di Karawaci$st$,
  $mdesc$Warnet di Karawaci yang tinggal tujuh komputer masih buka tiap malam. Ini cerita orang yang menjaganya dan alasan dia belum berhenti.$mdesc$,
  $pk$warnet karawaci$pk$,
  '{"cerita tangerang","komunitas lokal"}',
  2,
  true,
  9520, 1421, 604, 512
where not exists (
  select 1 from public.articles a where a.slug = $s2$penjaga-warnet-terakhir-karawaci$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Pasar Lama Jam Lima Pagi Adalah Kota yang Berbeda$t$,
  $s$pasar-lama-jam-lima-pagi$s$,
  $d$Kalau kamu cuma kenal Pasar Lama sebagai tempat makan malam, kamu melewatkan setengah dari tempat itu.$d$,
  $e$Jam lima pagi di Pasar Lama, lampu tenda yang malamnya menyilaukan sudah mati. Yang menyala tinggal lampu neon panjang di kios yang menjual bahan mentah. Suasananya lebih mirip pa…$e$,
  $md$Jam lima pagi di Pasar Lama, lampu tenda yang malamnya menyilaukan sudah mati. Yang menyala tinggal lampu neon panjang di kios yang menjual bahan mentah. Suasananya lebih mirip pasar kerja daripada tujuan wisata kuliner.

Kami datang dua kali, di hari kerja dan di hari Minggu, untuk memastikan yang kami lihat bukan kebetulan.

## Yang buka pagi bukan yang buka malam

Ini bagian yang paling sering bikin orang salah datang. Pedagang malam dan pedagang pagi sebagian besar orang yang berbeda, dengan menu yang berbeda. Yang buka pagi condong ke sarapan berat: bubur, lontong, nasi uduk, dan kopi yang diseduh di panci besar.

Harga pagi biasanya lebih rendah untuk porsi yang sama, karena pelanggannya orang yang mau kerja, bukan orang yang sedang jalan-jalan.

## Ritme yang harus kamu ikuti

Antara jam lima dan setengah tujuh, semuanya bergerak cepat. Pedagang tidak punya waktu untuk menjelaskan menu panjang-panjang, dan orang di belakangmu sedang menunggu. Kalau kamu belum tahu mau pesan apa, mundur dulu, lihat dari samping, baru maju.

Setelah jam tujuh, ritmenya berubah lagi. Pedagang mulai punya waktu ngobrol, dan ini jam terbaik kalau kamu mau tanya soal bahan atau asal resep.

## Soal parkir dan akses

Parkir pagi lebih longgar daripada malam, tapi jalannya dipakai kendaraan pengangkut barang. Kalau kamu bawa motor, cari titik di sisi luar dan jalan sedikit. Kalau bawa mobil, pertimbangkan datang dengan asumsi kamu akan memutar dua kali.

Untuk yang naik angkutan umum, jam lima pagi adalah jam yang tidak nyaman: sebagian angkot belum jalan penuh. Ini salah satu alasan kenapa versi pagi Pasar Lama lebih banyak diisi warga sekitar daripada pengunjung dari luar.

## Kenapa ini layak dicoba sekali

Bukan karena makanan paginya lebih enak. Sebagian iya, sebagian tidak. Yang membuat ini layak adalah kamu melihat bagaimana satu ruang yang sama dipakai dua komunitas berbeda dalam satu hari, dengan aturan tidak tertulis masing-masing.

Datang sekali, pesan satu porsi apa pun yang antreannya panjang, lalu duduk dan lihat. Setengah jam cukup untuk paham polanya.$md$,
  $img$/images/articles/vibes/vibes-pasar-lama-jam-lima-pagi.webp$img$,
  $alt$Uap panas masakan pasar tradisional Pasar Lama saat fajar$alt$,
  $crd$Foto: Dokumentasi TNG Daily / Subuh di Pasar Lama$crd$,
  'vibes'::tng_pillar,
  '{"pasar lama","kuliner","pagi","kota tangerang"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '7 days',
  $st$Pasar Lama Tangerang Jam Lima Pagi: Panduan Singkat$st$,
  $mdesc$Pasar Lama Tangerang di pagi hari punya pedagang, harga, dan ritme yang beda dari versi malamnya. Ini catatan dari dua kunjungan subuh.$mdesc$,
  $pk$pasar lama tangerang$pk$,
  '{"kuliner pagi tangerang","sarapan tangerang"}',
  1,
  true,
  6188, 498, 356, 141
where not exists (
  select 1 from public.articles a where a.slug = $s2$pasar-lama-jam-lima-pagi$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Trotoar di Cikokol Sudah Diperbaiki, Tapi Bukan untuk Pejalan Kaki$t$,
  $s$trotoar-cikokol-siapa-yang-punya$s$,
  $d$Ubinnya baru, lebarnya cukup, dan hampir seluruhnya dipakai untuk hal lain.$d$,
  $e$Kami jalan kaki 1,8 kilometer di jalur Cikokol pada jam empat sore, dan berhenti setiap kali harus turun ke aspal. Hitungan akhirnya: 23 kali. Trotoarnya sendiri tidak jelek. Ubin…$e$,
  $md$Kami jalan kaki 1,8 kilometer di jalur Cikokol pada jam empat sore, dan berhenti setiap kali harus turun ke aspal. Hitungan akhirnya: 23 kali.

Trotoarnya sendiri tidak jelek. Ubin baru, tinggi cukup, dan di beberapa titik ada jalur pemandu untuk tunanetra. Masalahnya bukan kualitas bangunan.

## Apa yang menempati trotoar

Dari 23 titik itu, sebagian besar bukan pedagang. Yang paling banyak: kendaraan parkir, diikuti tiang dan kabel yang dipasang di tengah jalur, lalu material bangunan yang ditumpuk.

Pedagang ada, tapi jumlahnya lebih sedikit daripada yang biasa dituduhkan. Yang menarik, pedagang cenderung menyisakan celah untuk lewat, karena pembeli mereka juga pejalan kaki. Kendaraan parkir tidak menyisakan apa-apa.

## Jalur pemandu yang berakhir di tiang

Di dua titik, jalur pemandu untuk tunanetra berakhir tepat di depan tiang. Ini bukan soal kurangnya anggaran, ini soal urutan pekerjaan: jalur dipasang tanpa mengecek apa yang sudah berdiri di situ.

[BUTUH VERIFIKASI: instansi mana yang berwenang atas pemindahan tiang utilitas di trotoar Cikokol, dan apakah ada mekanisme aduan yang aktif]

Untuk pengguna kursi roda, satu tiang di tengah jalur setara dengan trotoar yang tidak ada.

## Kenapa ini bukan keluhan kecil

Tangerang punya banyak perjalanan pendek: dari kos ke warung, dari halte ke kantor, dari kampus ke tempat fotokopi. Perjalanan seperti ini paling logis dilakukan dengan jalan kaki. Kalau trotoarnya tidak bisa dipakai, perjalanan itu berpindah ke motor, dan jalan yang sudah padat menampung lebih banyak kendaraan untuk jarak yang sebenarnya bisa ditempuh berjalan.

Jadi trotoar yang tidak berfungsi bukan cuma soal kenyamanan. Dia menambah kendaraan di jalan yang sama yang kita keluhkan macetnya.

## Yang bisa kamu lakukan

Kalau kamu melewati titik yang terhalang, foto dan catat lokasinya. Kami sedang menyusun peta titik hambatan trotoar dari kiriman pembaca, dan peta seperti ini lebih sulit diabaikan daripada satu keluhan tunggal.

Kami tidak sedang mengklaim peta itu akan langsung mengubah kebijakan. Yang jelas, tanpa catatan lokasi yang spesifik, keluhan soal trotoar akan selalu berhenti di tahap perasaan.$md$,
  $img$/images/articles/suara/suara-trotoar-cikokol-siapa-yang-punya.webp$img$,
  $alt$Deretan kendaraan di tepi trotoar pejalan kaki perkotaan$alt$,
  $crd$Foto: Dokumenter Kota TNG Daily / Koridor Cikokol$crd$,
  'suara'::tng_pillar,
  '{"ruang kota","trotoar","cikokol","pejalan kaki"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '9 days',
  $st$Trotoar Cikokol: Diperbaiki tapi Tidak Bisa Dipakai$st$,
  $mdesc$Kami jalan kaki 1,8 kilometer di Cikokol dan mencatat apa saja yang menghalangi trotoar. Hasilnya menjelaskan kenapa orang memilih jalan di aspal.$mdesc$,
  $pk$trotoar cikokol$pk$,
  '{"ruang publik tangerang","pejalan kaki tangerang"}',
  1,
  true,
  5402, 588, 274, 196
where not exists (
  select 1 from public.articles a where a.slug = $s2$trotoar-cikokol-siapa-yang-punya$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Side Hustle Cetak Stiker: Modal 1,5 Juta, Realita di Bulan Ketiga$t$,
  $s$side-hustle-cetak-stiker-modal-kecil$s$,
  $d$Cerita dari tiga orang di Tangerang yang mulai jualan stiker custom, termasuk yang berhenti.$d$,
  $e$Cetak stiker custom sering direkomendasikan sebagai usaha modal kecil. Kami ngobrol dengan tiga orang di Tangerang yang benar-benar menjalankannya, dan satu di antaranya sudah ber…$e$,
  $md$Cetak stiker custom sering direkomendasikan sebagai usaha modal kecil. Kami ngobrol dengan tiga orang di Tangerang yang benar-benar menjalankannya, dan satu di antaranya sudah berhenti. Ceritanya melengkapi bagian yang biasanya hilang dari konten "usaha modal kecil".

## Modal awal yang sebenarnya

Printer inkjet bekas yang layak untuk stiker ada di kisaran 900 ribu sampai 1,4 juta. Kertas vinyl per rol, tinta, dan cutting mat menambah sekitar 300 ribu untuk stok awal. Total di bawah dua juta, sesuai janji konten-konten yang beredar.

Yang tidak masuk hitungan: waktu belajar. Ketiganya menghabiskan dua sampai empat minggu untuk mendapatkan hasil potong yang rapi. Selama periode itu, bahan yang terbuang cukup banyak.

## Harga jual dan margin

Harga jual di pasar lokal Tangerang untuk stiker vinyl custom ukuran kecil berada di kisaran yang cukup ketat, karena pembandingnya adalah harga marketplace dari penjual dengan mesin besar. Dua dari tiga narasumber kami memilih tidak bersaing di harga dan fokus ke pesanan cepat untuk komunitas dan event lokal.

Yang berhenti mengambil jalan sebaliknya: bersaing di harga marketplace. Dia bilang di bulan ketiga margin per pesanan tidak menutup waktu yang dia habiskan untuk membalas chat.

## Masalah yang muncul di bulan ketiga

Pola yang sama muncul di ketiga cerita. Bulan pertama ramai karena teman dan keluarga. Bulan kedua turun. Bulan ketiga adalah momen ketika usaha ini harus punya pelanggan yang tidak mengenalmu secara pribadi.

Yang berhasil melewatinya punya satu kesamaan: mereka menemukan satu tipe pelanggan spesifik dan melayani itu dengan serius. Satu fokus ke komunitas motor, satu fokus ke UMKM makanan yang butuh label kemasan.

## Kalau kamu mau coba

Hitung waktu, bukan cuma modal. Ambil satu tipe pelanggan, bukan semua orang. Dan siapkan jawaban untuk pertanyaan yang akan datang di bulan ketiga: kenapa orang harus beli dari kamu, bukan dari penjual yang lebih murah di marketplace.

Kalau jawabanmu adalah "karena saya lebih murah", cerita narasumber ketiga kami sudah menunjukkan ke mana arahnya.$md$,
  $img$/images/articles/hustle/hustle-side-hustle-cetak-stiker-modal-kecil.webp$img$,
  $alt$Proses pemotongan bahan stiker vinyl di meja kerja studio$alt$,
  $crd$Foto: Workshop Kreatif TNG Daily / Tangerang Maker$crd$,
  'hustle'::tng_pillar,
  '{"side hustle","umkm","modal kecil","cetak"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '11 days',
  $st$Side Hustle Cetak Stiker di Tangerang: Hitungan Nyata$st$,
  $mdesc$Modal, harga jual, dan masalah yang muncul di bulan ketiga dari tiga pelaku usaha stiker custom di Tangerang. Termasuk satu yang memutuskan berhenti.$mdesc$,
  $pk$side hustle tangerang$pk$,
  '{"usaha stiker custom","modal kecil tangerang"}',
  1,
  true,
  8410, 702, 988, 205
where not exists (
  select 1 from public.articles a where a.slug = $s2$side-hustle-cetak-stiker-modal-kecil$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Mereka Latihan di Gudang Neglasari karena Studio Terlalu Mahal$t$,
  $s$band-lokal-latihan-di-gudang-neglasari$s$,
  $d$Empat band, satu gudang, dan jadwal yang disusun lewat grup WhatsApp sejak dua tahun lalu.$d$,
  $e$Gudangnya tidak dirancang untuk musik. Dinding seng, lantai beton, dan satu pintu rolling door yang harus ditutup rapat kalau sudah lewat jam sembilan malam supaya tidak menggangg…$e$,
  $md$Gudangnya tidak dirancang untuk musik. Dinding seng, lantai beton, dan satu pintu rolling door yang harus ditutup rapat kalau sudah lewat jam sembilan malam supaya tidak mengganggu rumah di belakang.

Empat band berbagi tempat ini. Jadwalnya diatur di satu grup WhatsApp yang isinya nyaris cuma negosiasi jam.

## Hitungan yang membuat mereka pindah ke gudang

Tarif studio latihan di area Tangerang membuat latihan rutin dua kali seminggu jadi pos pengeluaran yang serius untuk band yang belum punya pemasukan tetap. Satu vokalis bilang, dalam sebulan biaya latihan bisa setara dengan uang kos kamarnya.

Gudang ini disewa bersama, dibagi empat. Angkanya jadi masuk. Konsekuensinya: tidak ada peredam suara, tidak ada AC, dan drum harus dibongkar tiap kali band lain masuk.

## Sistem yang mereka bikin sendiri

Ada papan tulis kecil di dekat pintu berisi jadwal minggu itu. Ada aturan tidak tertulis bahwa siapa pun yang datang terakhir menutup dan mengunci. Ada juga kotak kecil untuk iuran perbaikan alat yang isinya dicatat di kertas yang ditempel.

Yang bikin sistem ini jalan bukan kerapiannya, tapi konsekuensi sosial: mereka saling kenal, dan gudang ini satu-satunya pilihan mereka.

## Apa yang sedang mereka kerjakan

Dua dari empat band sudah merilis lagu di platform streaming. Satu sedang menyiapkan rekaman pertama, dengan cara yang cukup umum di skena lokal: rekam drum di studio berbayar satu hari, sisanya rekam sendiri di gudang dengan interface pinjaman.

[BUTUH VERIFIKASI: nama band, judul rilisan, dan tanggal rilis sebelum artikel dipublikasikan, konfirmasi langsung ke masing-masing band]

Mereka tidak sedang menunggu ditemukan label. Yang mereka kejar lebih sederhana: slot di acara lokal yang bayarannya cukup untuk menutup sewa gudang bulan itu.

## Kenapa cerita ini bukan cerita kekurangan

Mudah menulis ini sebagai cerita anak band yang kekurangan fasilitas. Tapi yang mereka bangun sebenarnya sebuah infrastruktur kecil: ruang berbagi dengan aturan sendiri, di kota yang tidak menyediakan itu.

Kalau kamu tahu ruang serupa di Tangerang, komunitas apa pun, kirim ke kami. Peta ruang komunitas di kota ini nyaris tidak ada, dan itu bukan karena ruangnya tidak ada.$md$,
  $img$/images/articles/story/story-band-lokal-latihan-di-gudang-neglasari.webp$img$,
  $alt$Anak band latihan bersama di ruang studio musik independen$alt$,
  $crd$Foto: Arsip Skena TNG Daily / Gudang Neglasari$crd$,
  'story'::tng_pillar,
  '{"musik","komunitas","neglasari","kreator"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '14 days',
  $st$Band Lokal Tangerang Latihan di Gudang: Cerita Neglasari$st$,
  $mdesc$Empat band di Neglasari berbagi satu gudang untuk latihan karena tarif studio tidak masuk hitungan. Ini cara mereka mengaturnya.$mdesc$,
  $pk$band lokal tangerang$pk$,
  '{"komunitas musik tangerang","studio musik tangerang"}',
  2,
  true,
  4977, 812, 341, 267
where not exists (
  select 1 from public.articles a where a.slug = $s2$band-lokal-latihan-di-gudang-neglasari$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Harga Kopi Naik, Warung di Tangerang Punya Tiga Cara Menyiasatinya$t$,
  $s$harga-kopi-naik-warung-tangerang$s$,
  $d$Satu naikkan harga, satu kecilkan porsi, satu ganti komposisi. Kami tanya alasan ketiganya.$d$,
  $e$Kenaikan harga biji kopi sampai ke gelas yang kamu beli, tapi caranya tidak selalu kelihatan. Kami tanya tiga pemilik warung kopi di Tangerang tentang apa yang mereka ubah dalam e…$e$,
  $md$Kenaikan harga biji kopi sampai ke gelas yang kamu beli, tapi caranya tidak selalu kelihatan. Kami tanya tiga pemilik warung kopi di Tangerang tentang apa yang mereka ubah dalam enam bulan terakhir.

Jawabannya berbeda, dan masing-masing punya konsekuensi yang berbeda untuk pelanggan.

## Yang menaikkan harga

Pemilik pertama menaikkan harga seribu sampai dua ribu rupiah per gelas dan menempel tulisan kecil di kasir yang menjelaskan kenapa. Dia bilang penjualannya turun sekitar dua minggu, lalu kembali.

Alasan dia memilih ini: pelanggan tetapnya sudah tahu rasa yang dia jual, dan mengubah komposisi akan lebih terasa daripada mengubah harga.

## Yang mengecilkan porsi

Pemilik kedua menahan harga dan mengurangi volume gelas. Dia mengakui ini pilihan yang tidak dia sukai, tapi harganya adalah bagian dari identitas warungnya. Angka di daftar menu tidak berubah sejak lama, dan dia tidak mau jadi yang pertama menaikkannya di gang itu.

Konsekuensinya: pelanggan yang memperhatikan sadar, dan sebagian menyebutkannya. Dia bilang lebih memilih menjelaskan porsi daripada menjelaskan harga.

## Yang mengubah komposisi

Pemilik ketiga mengganti sebagian biji ke jenis yang lebih murah dan menyesuaikan takaran susu. Ini pilihan yang paling tidak kelihatan dari luar, dan juga yang paling berisiko: kalau rasanya jatuh, pelanggan pergi tanpa memberi tahu alasannya.

Dia melakukan uji rasa selama dua minggu dengan pelanggan tetap sebelum mengganti secara permanen. Menurutnya, empat dari sepuluh orang menyadari perbedaannya, dan tidak ada yang berhenti datang.

## Yang bisa kamu baca dari ini

Kalau kopi di warung langgananmu berubah, kemungkinan besar bukan karena pemiliknya berubah niat. Tiga pilihan di atas adalah tiga cara menanggung biaya yang sama, dan masing-masing memindahkan bebannya ke tempat yang berbeda: ke dompetmu, ke porsimu, atau ke rasa.

Kalau kamu penasaran mana yang paling jujur, tanyakan langsung. Ketiga pemilik yang kami ajak ngobrol tidak keberatan menjelaskan, dan dua di antaranya bilang tidak ada pelanggan yang pernah bertanya.$md$,
  $img$/images/articles/vibes/vibes-harga-kopi-naik-warung-tangerang.webp$img$,
  $alt$Cangkir kopi tradisional di atas meja kayu warung lokal$alt$,
  $crd$Foto: Kuliner Tradisional TNG Daily$crd$,
  'vibes'::tng_pillar,
  '{"kopi","harga","umkm","warung"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '17 days',
  $st$Harga Kopi Naik: Strategi Warung Kopi Tangerang$st$,
  $mdesc$Tiga warung kopi di Tangerang merespons kenaikan harga biji dengan cara berbeda. Kami tanya hitungan dan alasan di balik masing-masing pilihan.$mdesc$,
  $pk$harga kopi tangerang$pk$,
  '{"warung kopi tangerang","umkm kopi"}',
  1,
  true,
  6733, 445, 297, 128
where not exists (
  select 1 from public.articles a where a.slug = $s2$harga-kopi-naik-warung-tangerang$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Cara Baca Lowongan Kerja di Tangerang Tanpa Kena Jebakan$t$,
  $s$loker-tangerang-cara-baca-lowongan$s$,
  $d$Enam frasa yang muncul berulang di loker lokal, dan apa artinya dalam praktik.$d$,
  $e$Kami membaca ratusan posting lowongan kerja area Tangerang dari grup dan media sosial, lalu mencatat frasa yang paling sering muncul. Enam di antaranya cukup konsisten untuk dijel…$e$,
  $md$Kami membaca ratusan posting lowongan kerja area Tangerang dari grup dan media sosial, lalu mencatat frasa yang paling sering muncul. Enam di antaranya cukup konsisten untuk dijelaskan.

Ini bukan daftar tuduhan. Sebagian frasa ini dipakai perusahaan yang baik-baik saja. Yang berguna adalah tahu pertanyaan apa yang harus kamu ajukan ketika melihatnya.

## "Gaji menarik dan negotiable"

Tanpa rentang angka, frasa ini tidak memberi informasi apa pun. Pertanyaan yang layak diajukan lewat pesan sebelum kamu mengeluarkan biaya transportasi ke lokasi wawancara: berapa rentang untuk posisi ini, dan apakah sudah termasuk tunjangan.

Perusahaan yang serius biasanya menjawab. Yang menghindar berulang kali sudah memberi kamu informasi.

## "Diutamakan yang bisa bekerja di bawah tekanan"

Kadang ini berarti pekerjaannya memang punya tenggat ketat, misalnya operasional gudang atau layanan pelanggan. Kadang ini berarti tim sedang kekurangan orang dan belum ada rencana menambah.

Tanyakan berapa orang di tim itu sekarang dan berapa yang ideal. Jawaban yang jauh berbeda menjelaskan banyak hal.

## "Wajib punya kendaraan sendiri"

Ini wajar untuk pekerjaan lapangan. Yang perlu kamu pastikan: apakah bensin dan perawatan diganti, dan bagaimana skemanya. Kalau tidak diganti, hitung ulang gaji bersihnya sebelum menerima.

## "Fee pendaftaran" atau "biaya administrasi"

Untuk posisi kerja biasa, permintaan uang di tahap awal rekrutmen adalah tanda bahaya. Perekrutan yang sah tidak dibiayai oleh pelamar. Kalau ini muncul, berhenti di situ.

[BUTUH VERIFIKASI: kanal pelaporan resmi untuk dugaan penipuan lowongan kerja di wilayah Tangerang, agar bisa dicantumkan sebagai rujukan pembaca]

## "Sistem kerja fleksibel"

Bisa berarti jam kerja yang benar-benar longgar, bisa juga berarti kamu diharapkan merespons pesan di luar jam kerja. Tanyakan jam operasional resmi dan bagaimana lembur dihitung.

## "Kandidat akan diinformasikan lebih lanjut"

Ini frasa netral, tapi berguna untuk menetapkan ekspektasi. Tanyakan kapan tepatnya, lalu catat tanggalnya. Kalau tidak ada kabar setelah itu, kamu berhak menanyakan sekali dengan sopan, dan berhak berhenti menunggu.

## Satu kebiasaan yang paling berguna

Simpan tangkapan layar setiap posting lowongan yang kamu lamar, termasuk tanggal dan akun yang memposting. Ini murah, cepat, dan sangat berguna kalau ada perbedaan antara yang dijanjikan di posting dan yang dibicarakan di wawancara.$md$,
  $img$/images/articles/hustle/hustle-loker-tangerang-cara-baca-lowongan.webp$img$,
  $alt$Anak muda membaca informasi lowongan kerja di laptop$alt$,
  $crd$Foto: Karier & Pemuda TNG Daily$crd$,
  'hustle'::tng_pillar,
  '{"loker","karier","fresh graduate","hati-hati"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '21 days',
  $st$Cara Baca Loker Tangerang: 6 Frasa yang Harus Diwaspadai$st$,
  $mdesc$Enam frasa yang sering muncul di lowongan kerja area Tangerang dan artinya dalam praktik, plus pertanyaan yang layak diajukan sebelum wawancara.$mdesc$,
  $pk$loker tangerang$pk$,
  '{"lowongan kerja tangerang","tips wawancara kerja"}',
  2,
  true,
  15420, 1330, 2104, 487
where not exists (
  select 1 from public.articles a where a.slug = $s2$loker-tangerang-cara-baca-lowongan$s2$
);

insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  $t$Sore di Danau Cipondoh dan Orang-Orang yang Menolak Pulang Cepat$t$,
  $s$kolam-cipondoh-sore-terakhir$s$,
  $d$Empat kelompok, satu danau, dan alasan berbeda kenapa mereka ada di situ tiap sore.$d$,
  $e$Kami datang tiga sore berbeda ke Danau Cipondoh, duduk di titik yang sama, dan mencatat siapa yang muncul. Polanya konsisten sampai membuat kami penasaran. Antara jam empat dan se…$e$,
  $md$Kami datang tiga sore berbeda ke Danau Cipondoh, duduk di titik yang sama, dan mencatat siapa yang muncul. Polanya konsisten sampai membuat kami penasaran.

Antara jam empat dan setengah tujuh, ada empat kelompok yang selalu ada.

## Yang pertama: pekerja yang menunda pulang

Kelompok paling besar. Datang sendiri atau berdua, masih pakai seragam atau kemeja kerja, duduk 20 sampai 40 menit, lalu pergi. Salah satu yang kami ajak ngobrol bilang alasannya sederhana: kalau langsung pulang, dia sampai di kos dan langsung tidur, dan harinya terasa habis untuk kerja saja.

## Yang kedua: keluarga dengan anak kecil

Datang lebih awal, biasanya dengan bekal. Yang menarik dari kelompok ini: hampir semua yang kami tanya menyebut alasan yang sama, yaitu tidak ada biaya masuk. Mal punya AC, tapi punya juga pengeluaran yang sulit dihindari kalau bawa anak.

## Yang ketiga: pemancing

Kelompok yang paling lama tinggal dan paling sedikit bicara. Mereka punya titik favorit masing-masing dan datang hampir tiap hari. Satu di antaranya bilang dia sudah memancing di situ sejak sebelum area sekitarnya dibangun.

Kami tidak sempat memverifikasi soal kondisi air dan apakah ikannya layak dikonsumsi.

[BUTUH VERIFIKASI: hasil uji kualitas air Danau Cipondoh terbaru dari instansi berwenang, sebelum artikel menyinggung konsumsi ikan]

## Yang keempat: pasangan muda

Datang paling akhir, pergi paling akhir. Kelompok ini yang paling sering jadi bahan komentar orang, dan juga yang paling jelas menunjukkan kekurangan ruang publik di kota ini: tempat duduk gratis yang aman dan terang jumlahnya sedikit.

## Yang sebenarnya sedang dilakukan danau ini

Empat kelompok dengan kebutuhan berbeda, memakai satu ruang yang sama, tanpa konflik yang terlihat. Itu bukan hal kecil. Yang membuatnya bekerja bukan fasilitasnya, yang sebagian sudah aus, tapi kenyataan bahwa tempat ini tidak menuntut apa-apa untuk masuk.

Setiap kali ada rencana penataan ruang publik, pertanyaan yang paling jarang diajukan adalah apakah orang masih bisa duduk lama tanpa membeli apa pun. Danau Cipondoh sore hari adalah jawaban kenapa pertanyaan itu penting.$md$,
  $img$/images/articles/story/story-kolam-cipondoh-sore-terakhir.webp$img$,
  $alt$Suasana sore danau dengan pantulan cahaya matahari terbenam$alt$,
  $crd$Foto: Lansekap Senja TNG Daily / Danau Cipondoh$crd$,
  'story'::tng_pillar,
  '{"cipondoh","ruang publik","cerita","sore"}',
  'published'::tng_article_status,
  $a$Redaksi TNG Daily$a$,
  now() - interval '26 days',
  $st$Sore di Danau Cipondoh: Empat Kelompok, Empat Alasan$st$,
  $mdesc$Catatan dari tiga sore di Danau Cipondoh: siapa yang datang, apa yang mereka cari, dan kenapa ruang publik gratis masih penting di Tangerang.$mdesc$,
  $pk$danau cipondoh$pk$,
  '{"ruang publik tangerang","sore di tangerang"}',
  1,
  true,
  5344, 691, 232, 174
where not exists (
  select 1 from public.articles a where a.slug = $s2$kolam-cipondoh-sore-terakhir$s2$
);
