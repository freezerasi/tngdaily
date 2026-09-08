import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi TNG Daily",
  description:
    "Bagaimana TNG Daily mengumpulkan, memakai, dan melindungi data pembaca, kontributor, dan pengunjung situs.",
  alternates: { canonical: "/kebijakan-privasi" },
  robots: { index: true, follow: true },
};

export default function KebijakanPrivasiPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Kebijakan Privasi"
      badgeText="Privasi & Data"
      title="Kebijakan Privasi"
      subtitle="Terakhir diperbarui: 8 September 2026. Bagaimana TNG Daily mengumpulkan, memakai, dan melindungi data pembaca, kontributor, dan pengunjung situs."
      headerInk="bone"
      showEditorialCta={false}
      relatedLinks={[
        {
          label: "Syarat dan Ketentuan",
          href: "/syarat-ketentuan",
          description: "Ketentuan penggunaan situs, hak cipta, dan kiriman warga.",
        },
        {
          label: "Kontak",
          href: "/kontak",
          description: "Kanal permohonan data dan kontak resmi redaksi.",
        },
        {
          label: "Kirim Berita",
          href: "/kirim-berita",
          description: "Ketentuan privasi dan keamanan identitas kontributor warga.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
          <p className="text-xs font-bold uppercase tracking-wider text-lime">
            Terakhir diperbarui: 8 September 2026
          </p>
          <p>
            TNG Daily menghormati data orang yang baca, kirim naskah, atau cuma mampir.
            Kebijakan ini menjelaskan data apa yang kami sentuh, untuk apa, dan bagaimana
            memintanya dihapus. Landasan yang kami pakai termasuk Undang-Undang Nomor 27 Tahun
            2022 tentang Pelindungan Data Pribadi.
          </p>
        </div>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Data yang kami kumpulkan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <div>
              <h3 className="font-bold text-foreground">Yang kamu berikan sendiri</h3>
              <p className="text-sm text-muted">
                Nama, email, nomor WhatsApp, isi pesan, naskah, foto, dan data lain yang kamu
                kirim lewat formulir, email, atau WhatsApp.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Yang terkumpul otomatis</h3>
              <p className="text-sm text-muted">
                Alamat IP, jenis peramban, halaman yang dibuka, waktu kunjungan, dan data cookie
                atau piksel sejenis, sepanjang alat analitik aktif.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Yang muncul dari akun, jika suatu saat login dipakai</h3>
              <p className="text-sm text-muted">
                Email akun dan log aktivitas yang diperlukan untuk keamanan.
              </p>
            </div>
            <p className="pt-2 font-semibold text-foreground">
              Kami tidak meminta KTP, NPWP, atau data biometrik untuk baca berita.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Untuk apa datanya
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <ul className="tng-measure list-disc space-y-2 pl-5 text-[0.9375rem] text-muted">
            <li>Menjalankan situs dan memperbaiki kinerja.</li>
            <li>Membaca dan memproses tip berita serta kiriman kontributor.</li>
            <li>Membalas pertanyaan, hak jawab, dan permintaan ralat.</li>
            <li>Menjaga keamanan dari spam, penyalahgunaan, dan serangan.</li>
            <li>Memenuhi kewajiban hukum jika ada permintaan sah.</li>
          </ul>
          <p className="mt-3 font-semibold text-foreground">
            Kami tidak menjual daftar pembaca.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Siapa yang bisa melihat
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Akses internal terbatas pada redaksi dan pengelola teknis yang perlu data itu
              untuk kerja. Pemroses pihak ketiga yang mungkin menyentuh data, sesuai
              konfigurasi situs, meliputi:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>infrastruktur hosting dan basis data</li>
              <li>penyimpanan gambar</li>
              <li>analitik situs</li>
              <li>layanan email atau formulir</li>
            </ul>
            <p className="text-sm text-muted">
              Mereka hanya boleh mengolah data sesuai keperluan layanan, bukan untuk
              kepentingan sendiri di luar kontrak.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Cookie
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Cookie dipakai untuk sesi, preferensi, dan pengukuran kunjungan. Kamu bisa
            memblokir cookie lewat pengaturan peramban. Beberapa fitur situs mungkin tidak
            berjalan mulus jika cookie dimatikan semua.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kiriman berita dan data orang lain
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Kalau naskahmu memuat nama, foto, atau data orang lain, kamu wajib punya dasar yang
            sah untuk menyerahkannya. Redaksi bisa menolak atau menyamarkan identitas demi
            pelindungan pihak ketiga, terutama anak dan korban.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Berapa lama disimpan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Pesan biasa disimpan selama masih dibutuhkan untuk tindak lanjut, paling lama 24
            bulan, kecuali hukum meminta lebih lama. Naskah yang tayang dan arsip redaksi
            disimpan sepanjang artikel relevan secara jurnalistik dan legal. Log teknis
            disimpan dalam jangka yang wajar untuk keamanan.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Hak kamu
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p className="font-semibold text-foreground">Kamu bisa meminta:</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>salinan data yang kami pegang tentang kamu</li>
              <li>perbaikan data yang keliru</li>
              <li>penghapusan data yang tidak lagi kami butuhkan</li>
              <li>penarikan persetujuan untuk pemrosesan yang berbasis persetujuan</li>
            </ul>
            <p className="text-sm text-muted">
              Kirim permintaan ke{" "}
              <a href="mailto:redaksi@tngdaily.com?subject=Privasi" className="font-bold text-lime underline">
                redaksi@tngdaily.com
              </a>{" "}
              dengan subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Privasi</code>. Kami merespons dalam 14 hari kalender. Permintaan penghapusan tidak otomatis menarik artikel yang sudah sah terbit; itu dibahas terpisah lewat mekanisme ralat, hak jawab, atau pertimbangan hukum.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Anak
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Situs ini ditujukan untuk pembaca umum. Kami tidak sengaja mengumpulkan data anak di
            bawah 17 tahun untuk keperluan pemasaran. Kiriman yang melibatkan anak akan
            disunting ketat sesuai{" "}
            <Link href="/kode-etik" className="font-bold text-lime underline">
              Kode Etik
            </Link>
            .
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Perubahan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Kalau kebijakan ini berubah secara material, tanggal di atas akan diperbarui.
            Perubahan berat akan diumumkan di halaman ini.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kontak pelindungan data
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-2 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p className="font-bold text-foreground">TNG Daily</p>
            <p>Jl. Flamboyan Raya No. 4, Karawaci, Tangerang</p>
            <p>
              Email:{" "}
              <a href="mailto:redaksi@tngdaily.com" className="font-bold text-lime underline">
                redaksi@tngdaily.com
              </a>
            </p>
            <p>
              WhatsApp:{" "}
              <a href="https://wa.me/6282114812842" className="font-bold text-lime underline">
                0821-1481-2842
              </a>
            </p>
          </div>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
