import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel, Wall } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { PILLARS, PILLAR_META } from "@/types/domain";
import { PILLAR_INK } from "@/lib/pillar-ink";
import { staticPageJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PAGE_DESCRIPTION =
  "Siapa yang bikin TNG Daily, apa yang kami liput, cara kami memakai AI, dan bagaimana kami menangani koreksi.";

export const metadata: Metadata = {
  title: "Tentang TNG Daily",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/tentang" },
};

export default function TentangPage() {
  return (
    <Wall className="px-2 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            staticPageJsonLd({
              path: "/tentang",
              title: "Tentang TNG Daily",
              description: PAGE_DESCRIPTION,
              breadcrumbName: "Tentang",
            }),
          ),
        }}
      />

      <BannerPanel ink="bone" lift="lg" grommets className="p-5 sm:p-7">
        <TapePatch tone="wall" tilt="left">
          Tentang
        </TapePatch>
        <h1 className="tng-display mt-4 text-[2.5rem] leading-[0.9] text-ink sm:text-[3.5rem]">
          Media untuk yang
          <br />
          tinggal di sini
        </h1>
        <p className="tng-measure mt-4 text-[0.9375rem] leading-relaxed text-ink/80">
          TNG Daily menulis untuk anak muda Tangerang Raya: Kota Tangerang,
          Tangerang Selatan, dan Kabupaten Tangerang. Kami bukan papan
          pengumuman, bukan mesin clickbait, dan tidak menyalin berita orang
          lain lalu menempelkan judul baru.
        </p>
      </BannerPanel>

      <section className="mt-3 grid gap-2 sm:grid-cols-2">
        {PILLARS.map((pillar) => {
          const meta = PILLAR_META[pillar];
          const ink = PILLAR_INK[pillar];
          return (
            <BannerPanel key={pillar} ink="wall" lift="sm" className="p-4">
              <span className={cn("tng-label", ink.accentText)}>
                {meta.wordmark}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {meta.description}
              </p>
              <span
                aria-hidden="true"
                className={cn("mt-3 block h-1 w-14", ink.accentBar)}
              />
            </BannerPanel>
          );
        })}
      </section>

      <Section title="Cara kami kerja">
        <p>
          Ide bisa datang dari redaksi, dari kiriman pembaca, atau dari isu yang
          sedang ramai di lingkungan sekitar. Setiap draft lewat editor sebelum
          tayang. Kalau ada data yang belum bisa kami pastikan, kami tulis
          terbuka sebagai bagian yang masih perlu verifikasi, bukan kami tebak.
        </p>
        <p>
          Kalau kami memakai informasi dari media lain, nama medianya kami sebut
          di dalam tulisan dan sumbernya kami cantumkan di panel sumber pada
          artikel. Ini standar dasar, bukan formalitas.
        </p>
      </Section>

      <Section id="soal-ai" title="Soal AI">
        <p>
          Kami memakai AI untuk mempercepat riset, penyusunan, dan penyuntingan.
          AI tidak pernah menerbitkan apa pun sendiri. Semua output masuk sebagai
          draft, lewat quality gate, lalu ditinjau editor manusia yang bertanggung
          jawab atas isinya.
        </p>
        <p>
          Yang tidak kami lakukan: mengarang kutipan, mengarang angka, menyamarkan
          sumber, atau memproduksi artikel massal untuk mengejar peringkat
          pencarian.
        </p>
      </Section>

      <Section id="koreksi" title="Koreksi dan hak jawab">
        <p>
          Kalau ada yang salah di tulisan kami, kirim koreksinya lewat halaman
          kiriman dengan menyebut judul artikel dan bagian yang salah. Koreksi
          faktual kami perbaiki, dan perubahan yang substansial kami tandai
          sebagai pembaruan.
        </p>
        <p>
          Untuk hak jawab pihak yang disebut dalam artikel, kirim lewat jalur yang
          sama. Kami baca semuanya.
        </p>
      </Section>

      <Section title="Gambar dan kredit">
        <p>
          Foto redaksi kami ambil sendiri atau kami dapatkan dengan izin. Foto
          stok dari Unsplash, Pexels, atau Pixabay selalu kami sertai kredit
          fotografer sesuai lisensi masing-masing platform.
        </p>
      </Section>

      <section id="kanal" className="mt-3 scroll-mt-24">
        <BannerPanel ink="deep" lift="md" className="border-lime p-4 sm:p-5">
          <TapePatch tone="lime" tilt="left">
            Kanal
          </TapePatch>
          <h2 className="tng-display-tight mt-3 text-xl">
            Kanal distribusi TNG Daily
          </h2>
          <p className="tng-measure mt-2 text-sm leading-relaxed text-muted">
            Sebagian besar pembaca menemukan kami dari TikTok dan Instagram.
            Website ini adalah arsipnya. WhatsApp Channel dipakai untuk kiriman
            harian. Tautan kanal akan dipasang di sini begitu masing-masing kanal
            resmi aktif, jadi kamu tidak akan diarahkan ke akun yang bukan milik
            kami.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="primary" size="md">
              <Link href="/kontribusi">Kirim cerita</Link>
            </Button>
            <Button asChild variant="outline" size="md">
              <Link href="/">Baca feed</Link>
            </Button>
          </div>
        </BannerPanel>
      </section>
    </Wall>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section {...(id ? { id } : {})} className="mt-3 scroll-mt-24">
      <BannerPanel ink="wall" lift="sm" className="p-4 sm:p-5">
        <h2 className="tng-display-tight text-xl">{title}</h2>
        <div className="tng-measure mt-2 grid gap-3 text-sm leading-relaxed text-muted">
          {children}
        </div>
      </BannerPanel>
    </section>
  );
}
