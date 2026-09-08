import Link from "next/link";
import { Mail, MessageSquare, Sparkles, Megaphone, CheckCircle2, ArrowRight } from "lucide-react";

import {
  ScribbleBurst,
  ScribbleStar,
} from "@/components/branding/scribble";
import { TapePatch } from "@/components/shared/tape-patch";
import { cn } from "@/lib/utils";

interface PartnerAdvertisingCtaProps {
  className?: string;
}

export function PartnerAdvertisingCta({ className }: PartnerAdvertisingCtaProps) {
  return (
    <section
      aria-labelledby="partner-advertising-heading"
      className={cn(
        "relative overflow-hidden border-2 border-keyline bg-surface-strong p-6 text-foreground shadow-[var(--shadow-hard)] sm:p-8 md:p-10",
        className,
      )}
    >
      {/* Texture accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-lime, #d4ff00) 2px, transparent 2px)",
          backgroundSize: "12px 12px",
        }}
      />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header with badges */}
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <TapePatch tone="lime" tilt="left" size="sm">
              KEMITRAAN & ADVERTORIAL
            </TapePatch>
            <span className="inline-flex items-center border border-tape/70 px-2 py-0.5 font-display text-[0.625rem] font-extrabold uppercase tracking-[0.14em] text-tape">
              TNG DAILY AD NETWORK
            </span>
            <ScribbleStar className="h-4 w-4 text-lime" />
          </div>

          <h2
            id="partner-advertising-heading"
            className="tng-display mt-3 text-[1.85rem] leading-[0.95] text-foreground sm:text-[2.25rem] md:text-[2.75rem]"
          >
            PUNYA USAHA, EVENT, ATAU BRAND DI TANGERANG?
          </h2>

          <p className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-foreground/80 sm:text-base">
            Mari ceritakan langsung ke audiens lokal yang tepat. TNG Daily membuka ruang
            kerja sama advertorial, profil UMKM, liputan acara, dan sponsorship yang
            menghubungkan pesan Anda dengan anak muda, pegiat komunitas, serta pembaca aktif
            di Tangerang Raya lewat format narasi yang jujur dan kontekstual.
          </p>
        </header>

        {/* 4 Value Pillars Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between border-2 border-dashed border-line bg-surface p-4 transition-colors hover:border-lime/60">
            <div>
              <div className="flex items-center justify-between text-lime">
                <span className="font-display text-[0.6875rem] font-black uppercase tracking-widest text-muted">
                  01 / AUDIENS
                </span>
                <Sparkles className="size-4" />
              </div>
              <h3 className="mt-2 font-display text-[0.9375rem] font-bold uppercase tracking-tight text-foreground">
                Target Hyper-Lokal
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Fokus penuh pada pembaca Kota Tangerang, Tangerang Selatan, dan Kabupaten Tangerang.
                Tepat sasaran tanpa pemborosan impresi.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between border-2 border-dashed border-line bg-surface p-4 transition-colors hover:border-lime/60">
            <div>
              <div className="flex items-center justify-between text-lime">
                <span className="font-display text-[0.6875rem] font-black uppercase tracking-widest text-muted">
                  02 / FORMAT
                </span>
                <Megaphone className="size-4" />
              </div>
              <h3 className="mt-2 font-display text-[0.9375rem] font-bold uppercase tracking-tight text-foreground">
                Storytelling Relevan
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Bukan banner pop-up yang diabaikan. Kami menyusun cerita kontekstual yang
                menghormati rasa ingin tahu pembaca.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between border-2 border-dashed border-line bg-surface p-4 transition-colors hover:border-lime/60">
            <div>
              <div className="flex items-center justify-between text-lime">
                <span className="font-display text-[0.6875rem] font-black uppercase tracking-widest text-muted">
                  03 / ETIKA
                </span>
                <CheckCircle2 className="size-4" />
              </div>
              <h3 className="mt-2 font-display text-[0.9375rem] font-bold uppercase tracking-tight text-foreground">
                Transparan & Kredibel
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Diberi label kerja sama secara terbuka. Pembaca menghargai transparansi, dan brand
                Anda mendapatkan reputasi yang tepercaya.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between border-2 border-dashed border-line bg-surface p-4 transition-colors hover:border-lime/60">
            <div>
              <div className="flex items-center justify-between text-lime">
                <span className="font-display text-[0.6875rem] font-black uppercase tracking-widest text-muted">
                  04 / OPSI
                </span>
                <ScribbleBurst className="size-4" />
              </div>
              <h3 className="mt-2 font-display text-[0.9375rem] font-bold uppercase tracking-tight text-foreground">
                Paket Fleksibel
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Tersedia paket liputan UMKM lokal, profil founder, publikasi agenda & festival,
                hingga kerja sama kemitraan strategis berkala.
              </p>
            </div>
          </div>
        </div>

        {/* Action / Contact Card Bar */}
        <div className="flex flex-col items-stretch justify-between gap-4 border-t-2 border-line pt-6 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Konsultasikan Rencana Promosi atau Minta Rate Card
            </h4>
            <p className="text-xs text-muted">
              Tim bisnis & kemitraan kami siap merespons brief dan menyesuaikan paket sesuai kebutuhan Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://wa.me/6282114812842?text=Halo%20TNG%20Daily%2C%20saya%20tertarik%20konsultasi%20pasang%20iklan%20atau%20kerja%20sama%20advertorial"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-2 border-lime bg-lime px-4 py-2.5 font-display text-xs font-black uppercase tracking-wider text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <MessageSquare className="size-4" />
              <span>Chat WhatsApp: 0821-1481-2842</span>
            </a>

            <a
              href="mailto:redaksi@tngdaily.com?subject=Kerja%20Sama%20Iklan%20dan%20Advertorial"
              className="inline-flex items-center gap-2 border-2 border-keyline bg-surface px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:border-lime hover:text-lime"
            >
              <Mail className="size-4" />
              <span>Email: redaksi@tngdaily.com</span>
            </a>

            <Link
              href="/kontak"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              <span>Info Kantor & Kontak Lengkap</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Bottom Disclaimers */}
        <p className="border-t border-line/60 pt-3 text-[0.6875rem] leading-relaxed text-muted">
          * Seluruh materi iklan & advertorial wajib memenuhi standar redaksi dan etika publikasi TNG Daily.
          Kami tidak menerima promosi judi daring, pinjaman ilegal, produk kesehatan tanpa izin resmi, atau materi yang menyesatkan publik.
        </p>
      </div>
    </section>
  );
}
