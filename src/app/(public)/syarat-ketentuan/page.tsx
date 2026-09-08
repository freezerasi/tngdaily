import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan TNG Daily",
  description:
    "Aturan memakai situs TNG Daily, termasuk membaca, mengirim naskah, dan memakai ulang konten.",
  alternates: { canonical: "/syarat-ketentuan" },
  robots: { index: true, follow: true },
};

export default function SyaratKetentuanPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Syarat dan Ketentuan"
      badgeText="Ketentuan Layanan"
      title="Syarat dan Ketentuan"
      subtitle="Terakhir diperbarui: 8 September 2026. Dengan mengakses tngdaily.com, kamu menyetujui syarat ini. Jika tidak setuju, hentikan pemakaian situs."
      headerInk="bone"
      showEditorialCta={false}
      relatedLinks={[
        {
          label: "Kebijakan Privasi",
          href: "/kebijakan-privasi",
          description: "Perlindungan data pribadi dan hak-hak pembaca TNG Daily.",
        },
        {
          label: "Kirim Berita",
          href: "/kirim-berita",
          description: "Panduan hak cipta naskah dan izin publikasi karya warga.",
        },
        {
          label: "Kode Etik",
          href: "/kode-etik",
          description: "Standar integritas jurnalistik yang mengikat redaksi.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
          <p className="text-xs font-bold uppercase tracking-wider text-lime">
            Terakhir diperbarui: 8 September 2026
          </p>
          <p>
            Dengan mengakses tngdaily.com, kamu menyetujui syarat ini. Jika tidak setuju,
            hentikan pemakaian situs.
          </p>
        </div>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          1. Sifat layanan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            TNG Daily adalah media digital. Isi situs disediakan apa adanya sesuai kerja
            redaksi. Ketersediaan situs bisa terhenti untuk pemeliharaan atau gangguan yang di
            luar kendali kami.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          2. Akun dan pesan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Kamu bertanggung jawab atas keakuratan data yang kamu kirim. Jangan memakai nama
            orang lain, jangan mengirim spam, dan jangan mencoba masuk ke sistem di luar fitur
            yang disediakan.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          3. Hak cipta isi TNG Daily
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Tulisan, foto, video, logo, dan desain TNG Daily dilindungi hak cipta, kecuali
              dinyatakan lain.
            </p>
            <p className="font-semibold text-foreground">Diperbolehkan:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>membagikan tautan artikel</li>
              <li>mengutip pendek dengan menyebut TNG Daily dan menautkan sumber</li>
            </ul>
            <p className="font-semibold text-foreground">Tidak diperbolehkan tanpa izin tertulis:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>menyalin utuh artikel untuk situs lain</li>
              <li>scraping massal</li>
              <li>memakai logo TNG Daily seolah-olah ada hubungan resmi</li>
            </ul>
            <p className="pt-2 text-sm text-muted">
              Permintaan izin:{" "}
              <a href="mailto:redaksi@tngdaily.com?subject=Izin%20Republish" className="font-bold text-lime underline">
                redaksi@tngdaily.com
              </a>
              , subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Izin Republish</code>.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          4. Kiriman pengguna
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Ketentuan kanal warga ada di{" "}
              <Link href="/kirim-berita" className="font-bold text-lime underline">
                Kirim Berita
              </Link>
              . Ringkasnya:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>materi harus asli atau kamu punya hak menyerahkannya</li>
              <li>redaksi boleh menyunting dan menolak</li>
              <li>TNG Daily mendapat hak non-eksklusif untuk menerbitkan di kanal resmi</li>
              <li>pengirim menanggung akibat hukum atas materi palsu, plagiat, atau yang melanggar hak orang lain</li>
            </ul>
            <p className="pt-2 text-sm text-muted">
              Isi buatan pengguna yang belum tayang bukan sikap redaksi. Isi yang sudah tayang
              menjadi tanggung jawab redaksi sebagai karya jurnalistik yang sudah disunting,
              tanpa menghapus tanggung jawab pengirim atas keaslian bahan.
            </p>
            <p className="text-sm text-muted">
              Ini sejalan dengan Pedoman Pemberitaan Media Siber soal isi buatan pengguna.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          5. Perilaku yang dilarang
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-2 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p className="font-semibold text-foreground">Dilarang memakai situs untuk:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>menyebarkan malware</li>
              <li>memancing data orang lain</li>
              <li>menekan, memeras, atau mengancam lewat nama TNG Daily</li>
              <li>memuat ulang konten kami seolah-olah karya sendiri</li>
            </ul>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          6. Perubahan isi dan layanan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Redaksi boleh memperbarui artikel, menurunkan naskah, atau mengubah struktur situs.
            Syarat ini bisa diperbarui. Tanggal di atas adalah acuan versi yang berlaku.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          7. Hukum yang berlaku
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
            Syarat ini tunduk pada hukum Republik Indonesia. Sengketa diupayakan selesai lewat
            musyawarah. Jika tidak selesai, tempuh jalur yang berwenang di Tangerang, sepanjang
            diizinkan undang-undang.
          </p>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          8. Kontak
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
            <p className="pt-2 text-sm text-muted">
              Baca juga{" "}
              <Link href="/kebijakan-privasi" className="font-bold text-lime underline">
                Kebijakan Privasi
              </Link>{" "}
              dan{" "}
              <Link href="/disclaimer" className="font-bold text-lime underline">
                Disclaimer
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
