import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";
import { newsMediaOrganizationJsonLd, redaksiTeamJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Redaksi TNG Daily | Santika Reja, Titis Yunita, Maulidiani Nurani",
  description:
    "Kenalan dengan redaksi TNG Daily. Santika Reja memimpin, Titis Yunita menjalankan meja berita, Maulidiani Nurani merawat kiriman warga.",
  alternates: { canonical: "/redaksi" },
  robots: { index: true, follow: true },
};

export default function RedaksiPage() {
  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [
      newsMediaOrganizationJsonLd(),
      ...(redaksiTeamJsonLd()["@graph"] as unknown[]),
    ],
  };

  return (
    <StaticPageShell
      breadcrumbTitle="Redaksi"
      badgeText="Susunan Meja"
      title="Redaksi TNG Daily"
      subtitle="Halaman ini ada supaya pembaca tahu siapa yang bertanggung jawab atas tulisan di TNG Daily. Bukan hiasan. Kalau ada yang kurang tepat, ada nama yang bisa dihubungi."
      headerInk="bone"
      showEditorialCta={true}
      jsonLd={combinedSchema}
      relatedLinks={[
        {
          label: "Tentang Kami",
          href: "/tentang-kami",
          description: "Misi, latar belakang, dan prinsip kerja TNG Daily.",
        },
        {
          label: "Pedoman Redaksi",
          href: "/pedoman-redaksi",
          description: "SOP verifikasi naskah, ralat, dan pelayanan hak jawab.",
        },
        {
          label: "Kontak",
          href: "/kontak",
          description: "Kanal resmi redaksi, kantor Karawaci, dan jam operasional.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
          Halaman ini ada supaya pembaca tahu siapa yang bertanggung jawab atas tulisan di
          TNG Daily. Bukan hiasan. Kalau ada yang kurang tepat, ada nama yang bisa
          dihubungi.
        </p>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Struktur
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <BannerPanel ink="wall" lift="sm" className="p-4 sm:p-5">
            <span className="font-display text-[0.6875rem] font-bold uppercase tracking-widest text-lime">
              Pemimpin Redaksi
            </span>
            <h3 className="tng-display mt-2 text-xl text-foreground">
              Santika Reja
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Menentukan arah pemberitaan, menjaga standar, dan memegang tanggung jawab atas
              isi TNG Daily. Keputusan tayang yang berat, ralat penting, dan kebijakan
              redaksi berakhir di meja ini.
            </p>
          </BannerPanel>

          <BannerPanel ink="wall" lift="sm" className="p-4 sm:p-5">
            <span className="font-display text-[0.6875rem] font-bold uppercase tracking-widest text-orange">
              Redaktur Pelaksana
            </span>
            <h3 className="tng-display mt-2 text-xl text-foreground">
              Titis Yunita
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Mengurus ritme harian: naskah masuk, suntingan, kelengkapan 5W+1H, konfirmasi,
              dan kelayakan sebelum terbit. Kalau sebuah berita terasa rapi dan tidak
              terburu-buru, itu kerja meja pelaksana.
            </p>
          </BannerPanel>

          <BannerPanel ink="wall" lift="sm" className="p-4 sm:p-5">
            <span className="font-display text-[0.6875rem] font-bold uppercase tracking-widest text-bone">
              Redaktur Komunitas
            </span>
            <h3 className="tng-display mt-2 text-xl text-foreground">
              Maulidiani Nurani
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Menjaga kanal warga. Membaca kiriman, memilah mana yang pantas diproses,
              mendampingi kontributor, dan memastikan cerita dari lapangan tidak hilang
              hanya karena pengirimnya bukan wartawan.
            </p>
          </BannerPanel>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Cara hubungi orang yang tepat
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              <strong className="text-foreground">Untuk keberatan isi, hak jawab, dan ralat:</strong>{" "}
              Santika Reja lewat{" "}
              <a href="mailto:redaksi@tngdaily.com?subject=Keberatan%20%2F%20Hak%20Jawab" className="font-bold text-lime underline">
                redaksi@tngdaily.com
              </a>
              , subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Keberatan / Hak Jawab</code>.
            </p>
            <p>
              <strong className="text-foreground">Untuk tip berita, jadwal, dan naskah yang sudah jalan:</strong>{" "}
              Titis Yunita, subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Meja Berita</code>.
            </p>
            <p>
              <strong className="text-foreground">Untuk kiriman warga dan kontributor:</strong>{" "}
              Maulidiani Nurani, subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Kiriman Warga</code>, atau lewat{" "}
              <Link href="/kirim-berita" className="font-bold text-lime underline">
                Kirim Berita
              </Link>
              .
            </p>
            <p className="text-muted">
              Semua kanal tetap masuk ke{" "}
              <a href="mailto:redaksi@tngdaily.com" className="font-bold text-foreground underline">
                redaksi@tngdaily.com
              </a>{" "}
              dan WhatsApp{" "}
              <a href="https://wa.me/6282114812842" className="font-bold text-foreground underline">
                0821-1481-2842
              </a>{" "}
              supaya tidak ada pesan yang nyasar di chat pribadi.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Tanggung jawab redaksi
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Redaksi TNG Daily memegang isi yang terbit di situs ini, termasuk naskah yang
              berasal dari masyarakat setelah lolos suntingan. Kami berpedoman pada
              Undang-Undang Nomor 40 Tahun 1999 tentang Pers, Kode Etik Jurnalistik, dan
              Pedoman Pemberitaan Media Siber.
            </p>
            <p>
              Kontributor bukan pegawai redaksi. Nama penulis tetap dicantumkan. Keputusan
              akhir tetap di redaksi.
            </p>
            <p>
              Baca juga{" "}
              <Link href="/pedoman-redaksi" className="font-bold text-lime underline">
                Pedoman Redaksi
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

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kantor
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-2 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p className="font-bold text-foreground">TNG Daily</p>
            <p>Jl. Flamboyan Raya No. 4</p>
            <p>Karawaci, Tangerang</p>
            <p className="mt-3 text-muted">
              Peta dan jam respons ada di{" "}
              <Link href="/kontak" className="font-bold text-lime underline">
                Kontak
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
