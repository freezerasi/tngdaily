import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageSquare } from "lucide-react";

import { BannerPanel } from "@/components/shared/banner-panel";
import { StaticPageShell } from "@/components/public/static-page-shell";

export const metadata: Metadata = {
  title: "Kontak TNG Daily | Redaksi Karawaci, Tangerang",
  description:
    "Hubungi redaksi TNG Daily di redaksi@tngdaily.com atau WhatsApp 0821-1481-2842. Kantor di Jl. Flamboyan Raya No. 4, Karawaci, Tangerang.",
  alternates: { canonical: "/kontak" },
  robots: { index: true, follow: true },
};

export default function KontakPage() {
  return (
    <StaticPageShell
      breadcrumbTitle="Kontak"
      badgeText="Hubungi Kami"
      title="Kontak Redaksi"
      subtitle="Hubungi redaksi TNG Daily di redaksi@tngdaily.com atau WhatsApp 0821-1481-2842. Kantor di Jl. Flamboyan Raya No. 4, Karawaci, Tangerang."
      headerInk="bone"
      showEditorialCta={true}
      relatedLinks={[
        {
          label: "Kirim Berita",
          href: "/kirim-berita",
          description: "Kirim tip atau naskah liputan langsung ke meja redaksi.",
        },
        {
          label: "Redaksi",
          href: "/redaksi",
          description: "Kenalan dengan orang yang bertanggung jawab atas isi TNG Daily.",
        },
        {
          label: "Kebijakan Privasi",
          href: "/kebijakan-privasi",
          description: "Bagaimana data dan identitas narasumber kami lindungi.",
        },
      ]}
    >
      <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
        <p className="tng-measure text-[0.9375rem] leading-relaxed text-foreground/90">
          Jangan ragu menulis ke kami. Tip, klarifikasi, komplain, kerja sama, semuanya
          dibaca. Yang tidak kami lakukan: membalas rumor di kolom komentar seolah-olah itu
          kanal resmi.
        </p>
      </BannerPanel>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kanal resmi
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <a
            href="mailto:redaksi@tngdaily.com"
            className="group block border-2 border-line bg-surface p-4 transition-all hover:border-lime hover:bg-surface-strong"
          >
            <div className="flex items-center gap-2 text-lime">
              <Mail className="size-4" />
              <span className="font-display text-[0.6875rem] font-bold uppercase tracking-wider">
                Email
              </span>
            </div>
            <p className="mt-2 font-display text-sm font-bold text-foreground group-hover:text-lime">
              redaksi@tngdaily.com
            </p>
          </a>

          <a
            href="https://wa.me/6282114812842"
            target="_blank"
            rel="noreferrer"
            className="group block border-2 border-line bg-surface p-4 transition-all hover:border-lime hover:bg-surface-strong"
          >
            <div className="flex items-center gap-2 text-lime">
              <MessageSquare className="size-4" />
              <span className="font-display text-[0.6875rem] font-bold uppercase tracking-wider">
                WhatsApp
              </span>
            </div>
            <p className="mt-2 font-display text-sm font-bold text-foreground group-hover:text-lime">
              0821-1481-2842
            </p>
          </a>

          <div className="border-2 border-line bg-surface p-4">
            <div className="flex items-center gap-2 text-muted">
              <MapPin className="size-4" />
              <span className="font-display text-[0.6875rem] font-bold uppercase tracking-wider">
                Alamat
              </span>
            </div>
            <p className="mt-2 text-xs leading-snug text-foreground/90">
              Jl. Flamboyan Raya No. 4, Karawaci, Tangerang
            </p>
          </div>
        </div>
        <p className="text-xs text-muted">
          Pakailah kanal di atas. Pesan ke akun pribadi tim tidak dianggap masuk redaksi.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kirim sesuai keperluan
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-4 text-[0.9375rem] leading-relaxed text-foreground/90">
            <div>
              <h3 className="font-bold text-foreground">Tip berita atau naskah warga</h3>
              <p className="mt-1 text-sm text-muted">
                Isi formulir di{" "}
                <Link href="/kirim-berita" className="font-bold text-lime underline">
                  Kirim Berita
                </Link>
                . Jangan tempel naskah panjang di WhatsApp tanpa nama, lokasi, dan kontak yang bisa dihubungi.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-foreground">Keberatan, ralat, hak jawab</h3>
              <p className="mt-1 text-sm text-muted">
                Email ke{" "}
                <a href="mailto:redaksi@tngdaily.com?subject=Hak%20Jawab" className="font-bold text-lime underline">
                  redaksi@tngdaily.com
                </a>{" "}
                dengan subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Hak Jawab</code> atau{" "}
                <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Permintaan Ralat</code>. Sertakan URL artikel, bagian yang dipersoalkan, dan bukti yang ingin dipertimbangkan. Kami merespons dalam 2x24 jam kerja.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-foreground">Data pribadi dan privasi</h3>
              <p className="mt-1 text-sm text-muted">
                Tulis subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Privasi</code>. Rincian pengolahan data ada di{" "}
                <Link href="/kebijakan-privasi" className="font-bold text-lime underline">
                  Kebijakan Privasi
                </Link>
                .
              </p>
            </div>

            <div>
              <h3 className="font-bold text-foreground">Iklan, kerja sama, dan pemberitahuan merek</h3>
              <p className="mt-1 text-sm text-muted">
                Email dengan subjek <code className="bg-surface px-1.5 py-0.5 text-xs text-lime">Kerja Sama</code>. Materi berbayar tidak akan disamarkan sebagai berita. Lihat juga{" "}
                <Link href="/disclaimer" className="font-bold text-lime underline">
                  Disclaimer
                </Link>
                .
              </p>
            </div>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Jam respons
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-2 text-[0.9375rem] leading-relaxed text-foreground/90">
            <p>
              Senin–Sabtu, 09.00–18.00 WIB. Pesan di luar jam itu tetap masuk. Balasan menyusul
              pada hari kerja berikutnya. Isu mendesak yang sudah terverifikasi bisa diproses di
              luar jam tersebut atas keputusan redaksi.
            </p>
          </div>
        </BannerPanel>
      </section>

      <section className="space-y-3">
        <h2 className="tng-display-tight text-2xl text-foreground">
          Kantor
        </h2>
        <BannerPanel ink="wall" lift="sm" className="p-5 sm:p-7">
          <div className="tng-measure space-y-3 text-[0.9375rem] leading-relaxed text-foreground/90">
            <div>
              <p className="font-bold text-foreground">Redaksi TNG Daily</p>
              <p>Jl. Flamboyan Raya No. 4</p>
              <p>Karawaci, Tangerang</p>
            </div>
            <p className="text-sm text-muted">
              Kunjungan tatap muka harap buat janji dulu lewat email atau WhatsApp. Kami newsroom
              kecil. Datang tanpa kabar bisa ketemu pintu yang masih terkunci.
            </p>
            <p className="text-sm text-muted">
              Lihat siapa yang memegang meja redaksi di{" "}
              <Link href="/redaksi" className="font-bold text-lime underline">
                Redaksi
              </Link>
              .
            </p>
          </div>
        </BannerPanel>
      </section>
    </StaticPageShell>
  );
}
