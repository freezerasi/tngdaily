import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";

export const metadata: Metadata = {
  title: "Kode Etik TNG Daily | Standar Jurnalistik Redaksi",
  description:
    "TNG Daily berpegang pada Kode Etik Jurnalistik dan Pedoman Pemberitaan Media Siber. Independen, akurat, berimbang, dan siap ralat.",
  alternates: { canonical: "/kode-etik" },
  robots: { index: true, follow: true },
};

export default function KodeEtikPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Kode Etik"
      badgeText="Standar Jurnalistik"
      title="Kode Etik TNG Daily"
      subtitle="Halaman ini bukan pajangan. Ini aturan main redaksi, kontributor, dan siapa pun yang namanya muncul di TNG Daily."
      headerInk="bone"
      showEditorialCta={false}
      relatedLinks={[
        {
          label: "Pedoman Redaksi",
          href: "/pedoman-redaksi",
          description: "Alur verifikasi, ralat terang, dan mekanisme hak jawab.",
        },
        {
          label: "Redaksi",
          href: "/redaksi",
          description: "Susunan newsroom dan penanggung jawab redaksi TNG Daily.",
        },
        {
          label: "Disclaimer",
          href: "/disclaimer",
          description: "Batasan tanggung jawab, kiriman warga, dan pemisahan konten komersial.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
          <p>
            Halaman ini bukan pajangan. Ini aturan main redaksi, kontributor, dan siapa pun
            yang namanya muncul di TNG Daily.
          </p>
          <p>
            Kami berpedoman pada Undang-Undang Nomor 40 Tahun 1999 tentang Pers, Kode Etik
            Jurnalistik yang ditetapkan Dewan Pers, dan Pedoman Pemberitaan Media Siber.
          </p>
        </div>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Yang kami pegang setiap hari
        </h2>
        <div className="grid gap-3">
          {[
            {
              term: "Independen",
              desc: "Tidak jadi corong kekuasaan, partai, atau pengiklan. Tekanan dari luar, termasuk yang datang halus lewat “tolong dilunakkan”, ditolak.",
            },
            {
              term: "Akurat",
              desc: "Informasi dicek sebelum tayang. Satu sumber yang bersemangat tidak cukup kalau klaimnya merugikan pihak lain.",
            },
            {
              term: "Berimbang",
              desc: "Pihak yang disebut secara negatif diberi ruang merespons. Kalau mereka tidak merespons setelah dihubungi dengan itikad baik, itu dicatat di naskah.",
            },
            {
              term: "Fakta dan opini dipisah",
              desc: "Berita tidak menghakimi. Opini, kalau ada, ditandai sebagai opini.",
            },
            {
              term: "Tidak ada berita bohong, fitnah, sadis, atau cabul",
              desc: "Headline tidak boleh lebih liar dari isi.",
            },
            {
              term: "Lindungi yang rentan",
              desc: "Identitas korban kesusilaan dan anak yang berhadapan dengan hukum tidak disiarkan. Foto korban, duka, dan orang yang tidak berdaya tidak dipakai sebagai umpan klik.",
            },
            {
              term: "Tidak menyalahgunakan profesi",
              desc: "Tidak ada suap, tidak ada ancaman “nanti kami beritakan”, tidak ada jual-beli naskah.",
            },
            {
              term: "Tidak diskriminatif",
              desc: "Suku, agama, ras, gender, disabilitas, dan status sosial tidak dijadikan bahan ejekan atau stereotip.",
            },
            {
              term: "Ralat cepat",
              desc: "Salah fakta dikoreksi terang, bukan disembunyikan dengan sunting diam-diam tanpa keterangan.",
            },
            {
              term: "Hak jawab dan hak koreksi dilayani",
              desc: "Proporsional, tidak diulur tanpa alasan.",
            },
          ].map((item) => (
            <BannerPanel key={item.term} ink="wall" lift="sm" className="p-4 sm:p-5">
              <h3 className="font-display text-base font-bold text-foreground">
                {item.term}.
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {item.desc}
              </p>
            </BannerPanel>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Untuk kontributor warga
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Kiriman dari masyarakat tetap masuk ke standar yang sama. Semangat lapangan
              tidak menghapus kewajiban verifikasi. Redaksi boleh menolak naskah yang bagus
              secara emosi tapi rapuh secara fakta.
            </p>
            <p>
              Baca{" "}
              <Link href="/kirim-berita" className="font-bold text-lime underline">
                Kirim Berita
              </Link>{" "}
              sebelum mengirim. Cara kerja suntingan dan ralat ada di{" "}
              <Link href="/pedoman-redaksi" className="font-bold text-lime underline">
                Pedoman Redaksi
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kalau kami melanggar
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Tulis ke{" "}
              <a
                href="mailto:redaksi@tngdaily.com?subject=Etika"
                className="font-bold text-lime underline"
              >
                redaksi@tngdaily.com
              </a>{" "}
              dengan subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Etika</code>, atau WhatsApp{" "}
              <a
                href="https://wa.me/6282114812842"
                className="font-bold text-lime underline"
              >
                0821-1481-2842
              </a>
              . Sertakan URL dan penjelasan singkat. Keberatan isi juga bisa masuk lewat{" "}
              <Link href="/kontak" className="font-bold text-lime underline">
                Kontak
              </Link>
              .
            </p>
            <p className="text-sm text-muted">
              <Link href="/redaksi" className="font-bold text-lime underline">
                Pemimpin Redaksi
              </Link>{" "}
              memegang tanggung jawab akhir atas penerapan kode etik ini.
            </p>
          </div>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
