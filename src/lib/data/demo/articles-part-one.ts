import type { Pillar } from "@/types/domain";

/**
 * Authored demo content.
 *
 * Two jobs:
 *   1. Fills the public site when Supabase is not configured, so the design can
 *      be reviewed with `npm run dev` and nothing else.
 *   2. Generates `supabase/seed_articles.sql` via `npm run seed:articles`, so
 *      the SQL seed and the local fixtures can never drift.
 *
 * Integrity rules for this file, enforced by `lib/content-environment`:
 *   - Every article is `isMock`, so production drops it and no machine-readable
 *     surface (sitemap, RSS, JSON-LD, Open Graph) ever emits it.
 *   - Every cover is `mock_visual`. None of them documents a real place, person,
 *     or event, and none may carry a credit implying that it does.
 *   - `coverImageAlt` describes what is visible in the frame, not what the
 *     article is about. A screen-reader user gets the picture, not the pitch.
 *
 * See docs/IMAGE_AUDIT.md for the per-asset verdict and docs/
 * EDITORIAL_VISUAL_POLICY.md for the rules these follow.
 */

export interface DemoArticleInput {
  slug: string;
  title: string;
  dek: string;
  pillar: Pillar;
  tags: string[];
  authorName: string;
  coverImageUrl?: string;
  /**
   * Literal description of the pixels. Must not name a location the frame does
   * not actually show.
   */
  coverImageAlt?: string;
  /** Days before "now" that this article was published. */
  publishedDaysAgo: number;
  seoTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  markdown: string;
  counts: { view: number; like: number; save: number; share: number };
  sources?: Array<{
    sourceName: string;
    sourceUrl: string;
    attributionText: string;
    sourceType: "reference" | "data";
  }>;
}

export const DEMO_ARTICLES_PART_ONE: DemoArticleInput[] = [
  {
    slug: "spot-nongkrong-cipondoh-masih-sepi",
    title: "Enam Spot Nongkrong di Cipondoh yang Belum Diserbu Anak Jakarta",
    dek: "Bukan daftar tempat paling estetik. Ini daftar tempat yang masih bisa kamu duduki dua jam tanpa antre dan tanpa dilihatin barista.",
    pillar: "vibes",
    tags: ["nongkrong", "cipondoh", "kopi", "murah"],
    authorName: "Redaksi TNG Daily",
    coverImageUrl: "/images/articles/vibes/vibes-spot-nongkrong-cipondoh-masih-sepi.webp",
    // AUDIT: readable licence plates and identifiable faces. Replace before any
    // real launch; see docs/IMAGE_AUDIT.md.
    coverImageAlt:
      "Visual contoh: lima orang duduk mengelilingi meja kayu di tepi jalan, dengan sepeda motor terparkir dan deretan ruko di belakangnya.",
    publishedDaysAgo: 1,
    seoTitle: "6 Spot Nongkrong Cipondoh yang Masih Sepi dan Murah",
    metaDescription:
      "Enam tempat nongkrong di Cipondoh yang masih longgar, colokan lengkap, dan harga di bawah dua puluh ribu. Catatan dari yang beneran duduk di situ.",
    primaryKeyword: "nongkrong cipondoh",
    secondaryKeywords: ["kopi murah tangerang", "tempat kerja tangerang"],
    counts: { view: 4218, like: 312, save: 188, share: 74 },
    markdown: `Ada satu tanda yang paling jujur untuk menilai tempat nongkrong di Tangerang: berapa lama kamu bisa duduk sebelum merasa harus pesan lagi. Di kafe yang sudah viral, jawabannya sekitar 40 menit. Di enam tempat berikut, jawabannya masih dua jam lebih.

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

Kalau kamu punya tempat yang layak masuk daftar berikutnya, kirim ke kami. Yang kami butuh cuma nama tempat, harga menu termurah, dan satu alasan kenapa kamu masih balik ke situ.`,
  },
  {
    slug: "angkot-tangerang-hilang-pelan-pelan",
    title: "Angkot Tangerang Tidak Mati Mendadak, Dia Hilang Pelan-Pelan",
    dek: "Yang berubah bukan cuma jumlah armada. Yang berubah adalah siapa yang masih punya pilihan untuk tidak naik angkot.",
    pillar: "suara",
    tags: ["transportasi", "angkot", "kota", "commute"],
    authorName: "Redaksi TNG Daily",
    coverImageUrl: "/images/articles/suara/suara-angkot-tangerang-hilang-pelan-pelan.webp",
    coverImageAlt:
      "Visual contoh: satu angkot berwarna hijau muda terparkir dengan pintu terbuka, seorang penumpang duduk di dalam bersama beberapa tas belanja.",
    publishedDaysAgo: 2,
    seoTitle: "Angkot Tangerang Makin Sepi: Siapa yang Paling Kena?",
    metaDescription:
      "Penumpang angkot Tangerang menyusut tahun demi tahun. Kami telusuri siapa yang benar-benar terdampak dan kenapa ini bukan sekadar soal nostalgia.",
    primaryKeyword: "angkot tangerang",
    secondaryKeywords: ["transportasi tangerang", "commute tangerang"],
    counts: { view: 7841, like: 604, save: 421, share: 233 },
    markdown: `Kalau kamu naik angkot di Tangerang minggu ini, kemungkinan besar kamu duduk di kendaraan yang setengah kosong. Bukan karena jamnya salah. Sopir yang kami ajak ngobrol di Cimone bilang dia sekarang butuh 50 menit untuk menunggu penuh, padahal beberapa tahun lalu cukup 15 menit.

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

Kami sedang mengumpulkan catatan rute dari pembaca: nomor angkot, jam operasional yang sebenarnya, dan titik mana yang sudah tidak dilayani lagi meski masih tertulis di papan. Kalau kamu punya, kirim ke kami. Data kecil dari banyak orang biasanya lebih akurat daripada satu papan yang tidak diperbarui sejak lama.`,
    sources: [
      {
        sourceName: "Contoh Sumber Riset",
        sourceUrl: "https://example.org/riset-transportasi-lokal",
        attributionText: "Contoh entri sumber untuk demo panel atribusi.",
        sourceType: "reference",
      },
    ],
  },
  {
    slug: "gaji-pertama-tangerang-hitungan-jujur",
    title: "Gaji Pertama 4,2 Juta di Tangerang: Hitungan yang Tidak Ada di Loker",
    dek: "Kos, transportasi, makan, dan satu pos yang selalu lupa dihitung orang yang baru kerja.",
    pillar: "hustle",
    tags: ["gaji", "biaya hidup", "kos", "fresh graduate"],
    authorName: "Redaksi TNG Daily",
    coverImageUrl: "/images/articles/hustle/hustle-gaji-pertama-tangerang-hitungan-jujur.webp",
    // AUDIT: frame contains readable ledger text, a brand name, a lanyard, and a
    // key-fob logo, and its arithmetic contradicts the article. Replace.
    coverImageAlt:
      "Visual contoh: buku catatan terbuka berisi daftar pengeluaran tulisan tangan di meja kayu, di sebelahnya cangkir kopi, ponsel dengan aplikasi kalkulator, beberapa lembar uang rupiah, dan gantungan kunci.",
    publishedDaysAgo: 3,
    seoTitle: "Hitungan Biaya Hidup Gaji 4,2 Juta di Tangerang",
    metaDescription:
      "Rincian realistis biaya hidup bulanan di Tangerang untuk gaji pertama 4,2 juta, termasuk pos pengeluaran yang paling sering dilupakan.",
    primaryKeyword: "biaya hidup tangerang",
    secondaryKeywords: ["gaji fresh graduate tangerang", "harga kos tangerang"],
    counts: { view: 12903, like: 1104, save: 1502, share: 318 },
    markdown: `Angka 4,2 juta terdengar cukup sampai kamu membaginya. Kami susun hitungan ini dari kiriman pembaca yang bekerja di Kota Tangerang dan Tangerang Selatan, ditambah harga yang kami cek sendiri bulan ini.

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

Kalau kamu mau menyumbang data ke hitungan berikutnya, kirim rincian pengeluaran bulananmu tanpa nama. Semakin banyak catatan yang masuk, semakin sulit angkanya dikarang.`,
  },
  {
    slug: "penjaga-warnet-terakhir-karawaci",
    title: "Penjaga Warnet Terakhir di Karawaci Masih Buka Tiap Malam",
    dek: "Warnetnya tinggal tujuh komputer. Pelanggannya tinggal belasan. Dia masih buka karena satu alasan yang tidak ada di rencana bisnis.",
    pillar: "story",
    tags: ["cerita", "karawaci", "warnet", "komunitas"],
    authorName: "Redaksi TNG Daily",
    coverImageUrl: "/images/articles/story/story-penjaga-warnet-terakhir-karawaci.webp",
    // AUDIT: an esports arena with third-party game branding, which contradicts
    // an article about a seven-computer warnet. Replace.
    coverImageAlt:
      "Visual contoh: seseorang dilihat dari belakang memakai headset di depan monitor menyala, dengan lampu panggung dan panel besar di kejauhan.",
    publishedDaysAgo: 5,
    seoTitle: "Cerita Penjaga Warnet Terakhir di Karawaci",
    metaDescription:
      "Warnet di Karawaci yang tinggal tujuh komputer masih buka tiap malam. Ini cerita orang yang menjaganya dan alasan dia belum berhenti.",
    primaryKeyword: "warnet karawaci",
    secondaryKeywords: ["cerita tangerang", "komunitas lokal"],
    counts: { view: 9520, like: 1421, save: 604, share: 512 },
    markdown: `Pintu kacanya masih ditempeli stiker turnamen yang selesai bertahun-tahun lalu. Di dalam, tujuh komputer menyala, empat di antaranya terisi. Suara kipas prosesor lebih keras dari suara musik.

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

Kalau kamu tahu tempat lain di Tangerang yang mengambil peran serupa, kirim ke kami. Kami sedang mencatatnya.`,
  },
  {
    slug: "pasar-lama-jam-lima-pagi",
    title: "Pasar Lama Jam Lima Pagi Adalah Kota yang Berbeda",
    dek: "Kalau kamu cuma kenal Pasar Lama sebagai tempat makan malam, kamu melewatkan setengah dari tempat itu.",
    pillar: "vibes",
    tags: ["pasar lama", "kuliner", "pagi", "kota tangerang"],
    authorName: "Redaksi TNG Daily",
    coverImageUrl: "/images/articles/vibes/vibes-pasar-lama-jam-lima-pagi.webp",
    // AUDIT: a modern industrial café interior, not a pre-dawn wet market.
    // Replace.
    coverImageAlt:
      "Visual contoh: interior kedai luas berlangit-langit tinggi dengan lampu gantung industrial, meja kayu panjang, dan beberapa orang duduk di kejauhan.",
    publishedDaysAgo: 7,
    seoTitle: "Pasar Lama Tangerang Jam Lima Pagi: Panduan Singkat",
    metaDescription:
      "Pasar Lama Tangerang di pagi hari punya pedagang, harga, dan ritme yang beda dari versi malamnya. Ini catatan dari dua kunjungan subuh.",
    primaryKeyword: "pasar lama tangerang",
    secondaryKeywords: ["kuliner pagi tangerang", "sarapan tangerang"],
    counts: { view: 6188, like: 498, save: 356, share: 141 },
    markdown: `Jam lima pagi di Pasar Lama, lampu tenda yang malamnya menyilaukan sudah mati. Yang menyala tinggal lampu neon panjang di kios yang menjual bahan mentah. Suasananya lebih mirip pasar kerja daripada tujuan wisata kuliner.

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

Datang sekali, pesan satu porsi apa pun yang antreannya panjang, lalu duduk dan lihat. Setengah jam cukup untuk paham polanya.`,
  },
];
