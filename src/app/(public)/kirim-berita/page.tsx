import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";
import { KirimBeritaFormLazy } from "@/components/public/kirim-berita-form-lazy";

export const metadata: Metadata = {
  title: "Kirim Berita ke TNG Daily | Panduan Kontributor Warga Tangerang",
  description:
    "Punya kabar dari Tangerang? Kirim ke TNG Daily. Redaksi akan cek, sunting, dan putuskan layak tayang. Bukan jaminan terbit.",
  alternates: { canonical: "/kirim-berita" },
  robots: { index: true, follow: true },
};

export default function KirimBeritaPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Kirim Berita"
      badgeText="Warga Bersuara"
      title="Kirim Berita ke TNG Daily"
      subtitle="Punya kabar dari Tangerang? Kirim ke TNG Daily. Redaksi akan cek, sunting, dan putuskan layak tayang. Bukan jaminan terbit."
      headerInk="bone"
      showEditorialCta={false}
      relatedLinks={[
        {
          label: "Pedoman Redaksi",
          href: "/pedoman-redaksi",
          description: "Standar verifikasi, ralat, dan hak jawab di TNG Daily.",
        },
        {
          label: "Kode Etik",
          href: "/kode-etik",
          description: "Nilai independensi dan batasan liputan yang kami patuhi.",
        },
        {
          label: "Kontak",
          href: "/kontak",
          description: "Alur pengiriman langsung via email redaksi dan WhatsApp.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
          <p>
            TNG Daily menerima kiriman dari warga. Bukan karena kami kekurangan bahan. Karena
            banyak hal di Tangerang terjadi di luar radius media besar: rapat RT yang berabe,
            warung yang digusur diam-diam, acara kampus yang sebenarnya penting, atau
            kebijakan kelurahan yang hanya kebaca di grup WhatsApp.
          </p>
          <p>
            Kirimanmu akan dibaca{" "}
            <Link href="/redaksi" className="font-bold text-lime underline">
              Redaktur Komunitas
            </Link>
            , lalu diproses bersama meja{" "}
            <Link href="/redaksi" className="font-bold text-lime underline">
              Redaktur Pelaksana
            </Link>{" "}
            kalau layak naik. Keputusan tayang ada di redaksi, bukan di pengirim.
          </p>
        </div>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Yang kami cari
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <ul className="tng-measure list-disc space-y-2.5 pl-5 text-[0.9375rem] text-muted">
            <li>
              Kejadian di Kota Tangerang, Kabupaten Tangerang, atau Tangerang Selatan yang berdampak ke warga.
            </li>
            <li>
              Cerita manusia: kerja, kost, transportasi, kuliner, sekolah, ruang publik, budaya anak muda.
            </li>
            <li>
              Masalah kota yang bisa dicek: banjir, angkutan, sampah, tarif, fasilitas, kebijakan lokal.
            </li>
            <li>
              Catatan lapangan yang kamu saksikan sendiri, lengkap dengan waktu dan tempat.
            </li>
          </ul>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Yang tidak kami terima
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <ul className="tng-measure list-disc space-y-2.5 pl-5 text-[0.9375rem] text-muted">
            <li>Fitnah, gosip seleb, atau “katanya” tanpa sumber.</li>
            <li>Konten SARA, ujaran kebencian, pornografi, dan kekerasan grafis.</li>
            <li>Naskah yang meniru berita media lain.</li>
            <li>Iklan terselubung, review berbayar tanpa pengakuan, atau naskah titipan.</li>
            <li>Identitas korban kesusilaan, anak yang berhadapan dengan hukum, atau data pribadi orang lain tanpa dasar kepentingan publik.</li>
            <li>Screenshot chat pribadi yang disebarkan untuk mempermalukan seseorang.</li>
          </ul>
          <p className="mt-4 text-sm text-foreground/80">
            Kalau ragu, baca{" "}
            <Link href="/kode-etik" className="font-bold text-lime underline">
              Kode Etik
            </Link>{" "}
            dulu. Lebih baik naskah tertahan di redaksi daripada terbit lalu merugikan orang.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Format kiriman
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Kirim lewat formulir di halaman ini atau email{" "}
              <a href="mailto:redaksi@tngdaily.com?subject=Kiriman%20Warga" className="font-bold text-lime underline">
                redaksi@tngdaily.com
              </a>{" "}
              dengan subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Kiriman Warga</code>.
            </p>
            <p className="font-semibold text-foreground">Lengkapi:</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-muted">
              <li>Nama lengkap dan nama pena (kalau ingin nama pena, tetap wajib ada nama asli untuk redaksi).</li>
              <li>Nomor WhatsApp yang aktif.</li>
              <li>Judul usulan.</li>
              <li>Lokasi spesifik (kelurahan, kecamatan, patokan).</li>
              <li>Waktu kejadian.</li>
              <li>Isi 300–800 kata, susun dengan 5W+1H.</li>
              <li>Foto atau video, kalau ada, plus keterangan siapa yang memotret.</li>
              <li>Pernyataan singkat: ini kejadian yang kamu alami/saksikan, atau informasi dari sumber yang bisa dikonfirmasi.</li>
            </ol>
            <p className="pt-2 text-sm text-muted">
              Foto dari HP boleh. Yang penting tidak hasil curi dari akun orang, tidak menampilkan anak tanpa persetujuan, dan tidak diedit sampai menyesatkan.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Formulir kirim berita
        </h2>
        <KirimBeritaFormLazy />
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Apa yang terjadi setelah kamu kirim
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <ol className="list-decimal space-y-2 pl-5 text-muted">
              <li>Konfirmasi terima dalam 1x24 jam kerja.</li>
              <li>Telaah awal oleh Redaktur Komunitas.</li>
              <li>Verifikasi dan suntingan. Redaksi boleh menghubungi pengirim dan pihak terkait.</li>
              <li>Keputusan: tayang, ditunda, atau ditolak.</li>
              <li>Jika tayang, nama penulis dicantumkan sesuai kesepakatan.</li>
            </ol>
            <p className="pt-2 text-sm text-muted">
              Waktu proses biasanya 2–5 hari kerja. Isu yang lebih pelik bisa lebih lama. Tidak
              ada jaminan terbit. Tidak ada kewajiban redaksi menjelaskan seluruh alasan
              penolakan jika menyangkut verifikasi internal, tapi kami tidak menghilang tanpa kabar.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Hak cipta dan nama penulis
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Dengan mengirim naskah, kamu menyatakan materi itu asli dan tidak menyerahkan hak
              orang lain. Kamu memberi TNG Daily hak non-eksklusif untuk menyunting,
              menerbitkan, dan menyebarluaskan naskah itu di situs serta kanal resmi TNG Daily.
            </p>
            <p>
              Hak cipta substansi tetap di penulis. Kamu boleh menerbitkan ulang di tempat lain
              setelah tayang di TNG Daily, dengan menyebut versi pertama terbit di TNG Daily.
            </p>
            <p>
              Redaksi berhak menyunting judul, alinea, dan struktur tanpa mengubah makna pokok.
              Jika perubahan menyentuh fakta, kami konfirmasi dulu ke pengirim.
            </p>
            <p className="text-sm text-muted">
              Syarat lengkap ada di{" "}
              <Link href="/syarat-ketentuan" className="font-bold text-lime underline">
                Syarat dan Ketentuan
              </Link>
              . Cara kami menyimpan datamu ada di{" "}
              <Link href="/kebijakan-privasi" className="font-bold text-lime underline">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Honor
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Untuk tahap ini, kiriman warga bersifat kontribusi. Jika suatu saat ada skema
            honor atau desk kontributor tetap, ketentuannya akan ditulis di halaman ini, bukan
            di chat pribadi.
          </p>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
