import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";
import { newsMediaOrganizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tentang TNG Daily, Media Lokal Anak Muda Tangerang",
  description:
    "TNG Daily adalah media digital dari Karawaci untuk anak muda Tangerang. Kami menulis kota ini dari dalam, bukan dari pinggir berita ibu kota.",
  alternates: { canonical: "/tentang-kami" },
  robots: { index: true, follow: true },
};

export default function TentangKamiPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Tentang Kami"
      badgeText="Tentang"
      title="Media untuk yang tinggal di sini"
      subtitle="TNG Daily menulis untuk anak muda Tangerang Raya: Kota Tangerang, Tangerang Selatan, dan Kabupaten Tangerang. Kami bukan papan pengumuman, bukan mesin clickbait, dan tidak menyalin berita orang lain lalu menempelkan judul baru."
      headerInk="bone"
      showEditorialCta={true}
      jsonLd={newsMediaOrganizationJsonLd()}
      relatedLinks={[
        {
          label: "Redaksi",
          href: "/redaksi",
          description: "Kenalan dengan orang di balik meja redaksi TNG Daily.",
        },
        {
          label: "Kode Etik",
          href: "/kode-etik",
          description: "Standar jurnalistik dan aturan main yang kami pegang setiap hari.",
        },
        {
          label: "Kirim Berita",
          href: "/kirim-berita",
          description: "Panduan dan formulir kontributor warga Tangerang.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
          <p>
            Tangerang sering muncul di berita nasional sebagai lalu lintas, banjir, atau
            hinterland Jakarta. Padahal di sini orang bangun pagi, nunggu KRL, ngejar
            deadline, nyari makan malam di ruko, dan bikin hidup dari gang yang tidak pernah
            masuk peta viral.
          </p>
          <p>
            TNG Daily lahir dari situ. Kami media digital lokal yang menulis Tangerang untuk
            orang yang tinggal, kerja, kuliah, dan tumbuh di sini. Bukan portal yang menempel
            nama kota di judul, lalu isinya copy-paste siaran pers.
          </p>
        </div>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Apa yang kami kejar
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Kami ingin jadi tempat pertama yang dicek anak muda Tangerang kalau ada yang
              terjadi di kota ini. Bukan karena paling ribut, tapi karena tulisannya masuk
              akal, dekat, dan tidak merendahkan pembacanya.
            </p>
            <p className="font-semibold text-foreground">
              Kami merawat tiga janji sederhana:
            </p>
            <ol className="list-decimal space-y-3 pl-5 text-muted">
              <li>
                <strong className="text-foreground">Lokal itu substansi, bukan dekorasi.</strong>{" "}
                Kalau ceritanya bisa terjadi di mana saja, itu belum cerita Tangerang.
              </li>
              <li>
                <strong className="text-foreground">Bahasa boleh santai, fakta tidak boleh longgar.</strong>{" "}
                Nada kami dekat dengan pembaca. Proses redaksinya tetap kaku: dicek, dikonfirmasi, baru tayang.
              </li>
              <li>
                <strong className="text-foreground">Kota ini punya banyak suara.</strong>{" "}
                Mall, kampung, kampus, kost, pasar, dan perumahan punya ritme sendiri. Kami tidak memaksa semuanya terdengar sama.
              </li>
            </ol>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Cara kami bekerja
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Setiap naskah lewat meja redaksi. Ada yang ditulis tim dalam, ada yang datang
              dari warga lewat halaman{" "}
              <Link href="/kirim-berita" className="font-bold text-lime underline">
                Kirim Berita
              </Link>
              . Yang dari luar tetap melalui suntingan, verifikasi, dan keputusan layak
              tayang. Kiriman masuk bukan jaminan terbit.
            </p>
            <p>
              Standar itu ditulis terang di{" "}
              <Link href="/kode-etik" className="font-bold text-lime underline">
                Kode Etik
              </Link>{" "}
              dan{" "}
              <Link href="/pedoman-redaksi" className="font-bold text-lime underline">
                Pedoman Redaksi
              </Link>
              . Kalau kami salah, kami ralat. Kalau ada pihak yang merasa dirugikan, kami buka
              kanal hak jawab.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Siapa yang memegang redaksi
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              TNG Daily dipegang tiga orang inti.{" "}
              <Link href="/redaksi" className="font-bold text-lime underline">
                Santika Reja
              </Link>{" "}
              sebagai Pemimpin Redaksi.{" "}
              <Link href="/redaksi" className="font-bold text-lime underline">
                Titis Yunita
              </Link>{" "}
              sebagai Redaktur Pelaksana.{" "}
              <Link href="/redaksi" className="font-bold text-lime underline">
                Maulidiani Nurani
              </Link>{" "}
              sebagai Redaktur Komunitas.
            </p>
            <p>
              Kantor redaksi ada di Jl. Flamboyan Raya No. 4, Karawaci, Tangerang. Surat,
              klarifikasi, dan tip berita bisa masuk lewat{" "}
              <Link href="/kontak" className="font-bold text-lime underline">
                Kontak
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Yang bukan kami
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Kami bukan corong pemerintah, bukan kanal partai, dan bukan tempat titip
              narasi merek yang menyamar jadi berita. Kerja sama komersial, kalau ada, akan
              ditandai. Opini dan berita tidak dicampur seolah-olah sama.
            </p>
            <p>
              TNG Daily juga bukan mesin viral. Kalau sebuah isu hanya panas di grup chat dan
              tidak tahan dicek, itu belum berita.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Ngobrol dengan redaksi
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Punya kabar, koreksi, atau pertanyaan? Tulis ke{" "}
              <a
                href="mailto:redaksi@tngdaily.com"
                className="font-bold text-lime underline"
              >
                redaksi@tngdaily.com
              </a>{" "}
              atau WhatsApp{" "}
              <a
                href="https://wa.me/6282114812842"
                className="font-bold text-lime underline"
              >
                0821-1481-2842
              </a>
              . Kalau siap kirim naskah, langsung ke{" "}
              <Link href="/kirim-berita" className="font-bold text-lime underline">
                Kirim Berita
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
