import type { Metadata } from "next";

import { ContributionForm } from "@/components/public/contribution-form";
import { BannerPanel, Wall } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { isSupabaseAdminConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Kirim cerita ke TNG Daily",
  description:
    "Kirim cerita, rekomendasi tempat, atau keluhan soal Tangerang. Semua kiriman lewat moderasi editor sebelum tayang.",
  alternates: { canonical: "/kontribusi" },
  robots: { index: true, follow: true },
};

export default function KontribusiPage() {
  const canSubmit = isSupabaseAdminConfigured();

  return (
    <Wall className="px-2 py-4">
      <BannerPanel ink="orange" lift="lg" grommets className="p-5 sm:p-7">
        <TapePatch tone="wall" tilt="left">
          Kirim cerita
        </TapePatch>
        <h1 className="tng-display mt-4 text-[2.4rem] leading-[0.9] text-ink sm:text-[3.25rem]">
          Ceritakan
          <br />
          Tangerang versimu
        </h1>
        <p className="tng-measure mt-4 text-[0.9375rem] leading-relaxed text-ink/85">
          Tempat makan yang belum ketahuan orang, jalan rusak yang tidak pernah
          diberesin, loker yang beneran ada, atau cerita yang cuma kamu yang
          tahu. Tidak perlu rapi. Kami yang bantu rapikan.
        </p>
      </BannerPanel>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_18rem]">
        <ContributionForm canSubmit={canSubmit} />

        <aside className="grid content-start gap-2">
          <BannerPanel ink="deep" lift="sm" className="p-4">
            <h2 className="tng-label text-muted">Yang terjadi setelah kirim</h2>
            <ol className="mt-3 grid gap-3">
              {[
                {
                  step: "01",
                  text: "Kiriman masuk ke antrean moderasi. Tidak langsung tayang.",
                },
                {
                  step: "02",
                  text: "Editor membaca, mengecek yang bisa dicek, dan menghubungi kamu kalau perlu detail.",
                },
                {
                  step: "03",
                  text: "Kalau layak tayang, kami tulis atau sunting dengan atribusi ke kamu, sesuai izin yang kamu berikan.",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-2.5">
                  <span className="font-display text-sm font-extrabold text-lime tabular-nums">
                    {item.step}
                  </span>
                  <span className="text-[0.8125rem] leading-snug text-muted">
                    {item.text}
                  </span>
                </li>
              ))}
            </ol>
          </BannerPanel>

          <BannerPanel ink="deep" lift="sm" className="p-4">
            <h2 className="tng-label text-muted">Yang perlu kamu tahu</h2>
            <ul className="mt-3 grid gap-2 text-[0.8125rem] leading-snug text-muted">
              <li className="border-l-2 border-line pl-2.5">
                Kamu boleh pakai nama pena atau anonim.
              </li>
              <li className="border-l-2 border-line pl-2.5">
                Kontak opsional, tapi tanpa kontak kami tidak bisa verifikasi
                detail penting.
              </li>
              <li className="border-l-2 border-line pl-2.5">
                Jangan kirim data pribadi orang lain, tuduhan tanpa bukti, atau
                foto yang bukan milikmu.
              </li>
              <li className="border-l-2 border-line pl-2.5">
                Kami tidak menjanjikan semua kiriman tayang.
              </li>
            </ul>
          </BannerPanel>
        </aside>
      </div>
    </Wall>
  );
}
