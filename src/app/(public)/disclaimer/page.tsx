import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";

export const metadata: Metadata = {
  title: "Disclaimer TNG Daily",
  description:
    "TNG Daily menyajikan informasi jurnalistik sebatas yang dapat diverifikasi. Kami memisahkan berita, opini, dan materi kerja sama.",
  alternates: { canonical: "/disclaimer" },
  robots: { index: true, follow: true },
};

export default function DisclaimerPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Disclaimer"
      badgeText="Legalitas"
      title="Disclaimer"
      subtitle="TNG Daily menyajikan informasi sebatas kerja jurnalistik yang wajar: dicek, disunting, dan dipertanggungjawabkan. Itu tidak membuat setiap naskah menjadi nasihat hukum, medis, finansial, atau keputusan resmi pemerintah."
      headerInk="bone"
      showEditorialCta={false}
      relatedLinks={[
        {
          label: "Kode Etik",
          href: "/kode-etik",
          description: "Prinsip akurasi, independensi, dan ralat terbuka redaksi.",
        },
        {
          label: "Syarat dan Ketentuan",
          href: "/syarat-ketentuan",
          description: "Ketentuan hak cipta, republication, dan aturan pakai situs.",
        },
        {
          label: "Kontak",
          href: "/kontak",
          description: "Saluran pelaporan keberatan materi atau klarifikasi berita.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
          TNG Daily menyajikan informasi sebatas kerja jurnalistik yang wajar: dicek,
          disunting, dan dipertanggungjawabkan. Itu tidak membuat setiap naskah menjadi
          nasihat hukum, medis, finansial, atau keputusan resmi pemerintah.
        </p>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Isi situs
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <ul className="tng-measure list-disc space-y-2.5 pl-5 text-[0.9375rem] text-muted">
            <li>Berita adalah laporan fakta menurut verifikasi redaksi pada saat terbit.</li>
            <li>Opini, bila ada, adalah pandangan penulis, bukan sikap badan hukum atau seluruh redaksi, kecuali dinyatakan demikian.</li>
            <li>Data, jadwal, tarif, dan kebijakan publik bisa berubah setelah artikel tayang. Cek institusi terkait sebelum bertindak.</li>
            <li>Tautan ke situs lain bukan berarti kami menyetujui seluruh isi situs itu.</li>
          </ul>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kiriman warga
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Naskah dari masyarakat yang tayang sudah melalui suntingan redaksi. Itu tidak
            menghapus tanggung jawab pengirim atas keaslian materi yang diserahkan. Lihat{" "}
            <Link href="/kirim-berita" className="font-bold text-lime underline">
              Kirim Berita
            </Link>{" "}
            dan{" "}
            <Link href="/syarat-ketentuan" className="font-bold text-lime underline">
              Syarat dan Ketentuan
            </Link>
            .
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Nama, merek, dan kutipan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Nama tempat, merek, acara, dan tokoh disebut sepanjang relevan jurnalistik.
            Penyebutan tidak otomatis berarti dukungan atau hubungan kerja sama.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kerja sama komersial
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Konten berbayar akan dilabeli. Jika suatu naskah tidak berlabel kerja sama, redaksi
            meniatkannya sebagai kerja jurnalistik. Temuan sebaliknya bisa dilaporkan ke{" "}
            <Link href="/kontak" className="font-bold text-lime underline">
              Kontak
            </Link>
            .
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Batasan tanggung jawab
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Sepanjang diizinkan hukum Indonesia, TNG Daily tidak bertanggung jawab atas
              kerugian yang timbul dari keputusan pembaca berdasarkan isi situs, termasuk
              kerugian karena informasi yang sudah usang setelah terbit dan kemudian diralat.
            </p>
            <p className="text-sm text-muted">
              Ini tidak mengurangi kewajiban kami meralat kesalahan dan melayani hak jawab
              sesuai{" "}
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
