import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";

export const metadata: Metadata = {
  title: "Pedoman Redaksi TNG Daily | Verifikasi, Ralat, dan Hak Jawab",
  description:
    "Cara TNG Daily memverifikasi berita, menyunting kiriman warga, meralat kesalahan, dan melayani hak jawab.",
  alternates: { canonical: "/pedoman-redaksi" },
  robots: { index: true, follow: true },
};

export default function PedomanRedaksiPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Pedoman Redaksi"
      badgeText="Standar Operasional"
      title="Pedoman Redaksi"
      subtitle="Kode etik menjawab “jangan sampai rusak.” Pedoman ini menjawab “bagaimana kerja sehari-hari.”"
      headerInk="bone"
      showEditorialCta={true}
      relatedLinks={[
        {
          label: "Kode Etik",
          href: "/kode-etik",
          description: "Nilai independensi dan batasan jurnalistik redaksi.",
        },
        {
          label: "Kirim Berita",
          href: "/kirim-berita",
          description: "Ketentuan dan formulir kontributor warga.",
        },
        {
          label: "Redaksi",
          href: "/redaksi",
          description: "Penanggung jawab meja berita dan kanal warga.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
          Kode etik menjawab “jangan sampai rusak.” Pedoman ini menjawab “bagaimana kerja
          sehari-hari.”
        </p>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          1. Verifikasi
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <ul className="tng-measure list-disc space-y-2.5 pl-5 text-[0.9375rem] text-muted">
            <li>Klaim faktual butuh bukti: dokumen, rekaman yang sah, atau konfirmasi pihak terkait.</li>
            <li>Berita yang menuding orang atau lembaga tertentu tidak tayang tanpa upaya konfirmasi.</li>
            <li>Screenshot dan viral di media sosial adalah petunjuk, bukan bukti selesai.</li>
            <li>Sumber anonim hanya dipakai kalau ada kepentingan publik yang kuat, risikonya nyata, dan Pemimpin Redaksi menyetujui. Identitas sumber tetap dipegang redaksi.</li>
          </ul>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          2. Produksi naskah
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <ul className="tng-measure list-disc space-y-2.5 pl-5 text-[0.9375rem] text-muted">
            <li>Judul mencerminkan isi. Tidak ada jebakan “ternyata” yang tidak ada di berita.</li>
            <li>Narasumber disebutkan sejauh tidak membahayakan keselamatan mereka.</li>
            <li>Foto dikredit. AI tidak dipakai untuk mengarang kutipan, peristiwa, atau gambar yang seolah-olah dokumentasi lapangan.</li>
            <li>Suntingan boleh merapikan bahasa. Suntingan tidak boleh memelintir makna.</li>
          </ul>
          <p className="mt-4 text-sm text-foreground/90">
            Alur harian dipegang{" "}
            <Link href="/redaksi" className="font-bold text-lime underline">
              Redaktur Pelaksana
            </Link>
            . Arah dan keputusan berat dipegang{" "}
            <Link href="/redaksi" className="font-bold text-lime underline">
              Pemimpin Redaksi
            </Link>
            .
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          3. Kiriman masyarakat
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Naskah warga diperlakukan sebagai bahan mentah, bukan berita jadi.
            </p>
            <p>
              <Link href="/redaksi" className="font-bold text-lime underline">
                Redaktur Komunitas
              </Link>{" "}
              melakukan telaah awal: kelengkapan, originalitas, risiko hukum, dan
              kepentingan publik. Jika lolos, naskah masuk meja suntingan dan verifikasi yang
              sama dengan naskah internal.
            </p>
            <p className="font-semibold text-foreground">Redaksi berhak:</p>
            <ul className="list-disc space-y-1.5 pl-5 text-muted">
              <li>menolak</li>
              <li>menunda</li>
              <li>meminta data tambahan</li>
              <li>mengubah judul dan struktur</li>
              <li>tidak menayangkan sebagian materi</li>
            </ul>
            <p className="pt-2 text-sm text-muted">
              Pengirim tidak berhak menuntut terbit. Rincian kanal ada di{" "}
              <Link href="/kirim-berita" className="font-bold text-lime underline">
                Kirim Berita
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          4. Koreksi dan ralat
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p className="font-semibold text-foreground">Jika ditemukan kesalahan faktual:</p>
            <ol className="list-decimal space-y-2 pl-5 text-muted">
              <li>Naskah diperbaiki.</li>
              <li>Keterangan ralat ditambahkan di bagian atas atau bawah artikel, tergantung beratnya kesalahan.</li>
              <li>Kesalahan yang merugikan pihak tertentu dikabari ke pihak itu jika kontak tersedia.</li>
            </ol>
            <p className="pt-2 text-sm text-muted">
              Kesalahan ketik minor yang tidak mengubah fakta boleh dibetulkan tanpa kotak
              ralat. Kesalahan nama, angka, lokasi, dan tuduhan selalu pakai ralat terang.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          5. Hak jawab dan hak koreksi
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              <strong className="text-foreground">Hak jawab:</strong> tanggapan resmi pihak yang
              merasa dirugikan oleh pemberitaan.
              <br />
              <strong className="text-foreground">Hak koreksi:</strong> permintaan membetulkan
              fakta yang keliru.
            </p>
            <p className="font-semibold text-foreground">Cara mengajukan:</p>
            <ul className="list-disc space-y-1.5 pl-5 text-muted">
              <li>
                Email{" "}
                <a href="mailto:redaksi@tngdaily.com?subject=Hak%20Jawab%20%2F%20Hak%20Koreksi" className="font-bold text-lime underline">
                  redaksi@tngdaily.com
                </a>
                , subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Hak Jawab</code> atau{" "}
                <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Hak Koreksi</code>
              </li>
              <li>Isi: nama, institusi, URL artikel, bagian yang dipersoalkan, versi yang dianggap benar, dan kontak</li>
              <li>Kami merespons dalam 2x24 jam kerja dan menuntaskan secara proporsional dalam 7 hari kerja, kecuali kasusnya membutuhkan verifikasi lebih panjang</li>
            </ul>
            <p className="pt-2 text-sm text-muted">
              Hak jawab yang masuk tidak otomatis dihapuskan oleh opini redaksi. Yang tidak kami
              tampung: tanggapan yang memfitnah pihak lain, berisi data pribadi orang ketiga yang
              tidak relevan, atau sama sekali tidak berhubungan dengan artikel.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          6. Iklan dan kerja sama
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Materi berbayar, advertorial, dan kerja sama ditandai. Tim bisnis tidak boleh
              menekan redaksi untuk mengubah fakta. Kalau ada keraguan, yang dimenangkan adalah
              pembaca.
            </p>
            <p className="text-sm text-muted">
              Baca juga{" "}
              <Link href="/disclaimer" className="font-bold text-lime underline">
                Disclaimer
              </Link>{" "}
              dan{" "}
              <Link href="/kode-etik" className="font-bold text-lime underline">
                Kode Etik
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
