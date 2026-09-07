import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BRAIN_DIR = "C:\\Users\\Athira\\.gemini\\antigravity-ide\\brain\\9994c0da-c3d0-4032-aec9-26cc34ff8fc5";
const PUBLIC_ARTICLES_DIR = path.join(process.cwd(), "public", "images", "articles");

const COVERS = [
  // 1. Vibes - Spot nongkrong cipondoh (AI Generated)
  {
    category: "vibes",
    slug: "spot-nongkrong-cipondoh-masih-sepi",
    localArtifact: path.join(BRAIN_DIR, "cipondoh_cafe_spot_1788605967191.jpg"),
    credit: "Foto: Redaksi TNG Daily / Midday Cipondoh",
    alt: "Nongkrong santai di warung kopi Cipondoh Tangerang sore hari",
  },
  // 2. Suara - Angkot Tangerang (AI Generated)
  {
    category: "suara",
    slug: "angkot-tangerang-hilang-pelan-pelan",
    localArtifact: path.join(BRAIN_DIR, "angkot_cimone_terminal_1788605983993.jpg"),
    credit: "Foto: Redaksi TNG Daily / Dokumenter Cimone",
    alt: "Angkot khas Tangerang menunggu penumpang di Terminal Cimone",
  },
  // 3. Hustle - Gaji Pertama 4.2 Juta (AI Generated)
  {
    category: "hustle",
    slug: "gaji-pertama-tangerang-hitungan-jujur",
    localArtifact: path.join(BRAIN_DIR, "gaji_pertama_kos_1788606011520.jpg"),
    credit: "Foto: Redaksi TNG Daily / Arsip Kos Cikokol",
    alt: "Buku catatan pengeluaran dan uang rupiah di meja kos Cikokol",
  },
  // 4. Story - Penjaga Warnet Karawaci
  {
    category: "story",
    slug: "penjaga-warnet-terakhir-karawaci",
    remoteUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Editorial TNG Daily / Suasana Malam Karawaci",
    alt: "Suasana bilik komputer warnet malam hari di Karawaci",
  },
  // 5. Vibes - Pasar Lama Jam 5 Pagi
  {
    category: "vibes",
    slug: "pasar-lama-jam-lima-pagi",
    remoteUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Dokumentasi TNG Daily / Subuh di Pasar Lama",
    alt: "Uap panas masakan pasar tradisional Pasar Lama saat fajar",
  },
  // 6. Suara - Trotoar Cikokol
  {
    category: "suara",
    slug: "trotoar-cikokol-siapa-yang-punya",
    remoteUrl: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Dokumenter Kota TNG Daily / Koridor Cikokol",
    alt: "Deretan kendaraan di tepi trotoar pejalan kaki perkotaan",
  },
  // 7. Hustle - Side Hustle Cetak Stiker
  {
    category: "hustle",
    slug: "side-hustle-cetak-stiker-modal-kecil",
    remoteUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Workshop Kreatif TNG Daily / Tangerang Maker",
    alt: "Proses pemotongan bahan stiker vinyl di meja kerja studio",
  },
  // 8. Story - Band Lokal Latihan di Gudang Neglasari
  {
    category: "story",
    slug: "band-lokal-latihan-di-gudang-neglasari",
    remoteUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Arsip Skena TNG Daily / Gudang Neglasari",
    alt: "Anak band latihan bersama di ruang studio musik independen",
  },
  // 9. Vibes - Harga Kopi Naik Warung Tangerang
  {
    category: "vibes",
    slug: "harga-kopi-naik-warung-tangerang",
    remoteUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Kuliner Tradisional TNG Daily",
    alt: "Cangkir kopi tradisional di atas meja kayu warung lokal",
  },
  // 10. Hustle - Loker Tangerang Cara Baca Lowongan
  {
    category: "hustle",
    slug: "loker-tangerang-cara-baca-lowongan",
    remoteUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Karier & Pemuda TNG Daily",
    alt: "Anak muda membaca informasi lowongan kerja di laptop",
  },
  // 11. Story - Sore di Danau Cipondoh
  {
    category: "story",
    slug: "kolam-cipondoh-sore-terakhir",
    remoteUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=85&auto=format&fit=crop",
    credit: "Foto: Lansekap Senja TNG Daily / Danau Cipondoh",
    alt: "Suasana sore danau dengan pantulan cahaya matahari terbenam",
  },
];

async function processAll() {
  console.log("Memulai proses konversi dan penyimpanan cover image...");

  for (const item of COVERS) {
    const filename = `${item.category}-${item.slug}.webp`;
    const targetDir = path.join(PUBLIC_ARTICLES_DIR, item.category);
    const targetPath = path.join(targetDir, filename);

    await fs.mkdir(targetDir, { recursive: true });

    let inputBuffer;
    if (item.localArtifact) {
      console.log(`Mengolah foto lokal untuk ${filename}...`);
      inputBuffer = await fs.readFile(item.localArtifact);
    } else if (item.remoteUrl) {
      console.log(`Mengunduh foto kurasi editorial untuk ${filename}...`);
      const res = await fetch(item.remoteUrl);
      if (!res.ok) {
        throw new Error(`Gagal mengunduh foto untuk ${item.slug}: status ${res.status}`);
      }
      inputBuffer = Buffer.from(await res.arrayBuffer());
    }

    // Process with sharp: 16:9 ratio, 1600x900, optimized WebP
    await sharp(inputBuffer)
      .resize(1600, 900, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 85, effort: 6 })
      .toFile(targetPath);

    console.log(`✓ Tersimpan di ${targetPath}`);
  }

  console.log("\nSemua 11 cover image berhasil diproses dan disimpan ke /public/images/articles/!");
}

processAll().catch((err) => {
  console.error("Error processing covers:", err);
  process.exit(1);
});
