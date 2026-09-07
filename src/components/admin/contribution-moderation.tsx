"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, FileText, MapPin, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { TapePatch } from "@/components/shared/tape-patch";
import {
  draftFromContributionAction,
  moderateContributionAction,
} from "@/app/(admin)/admin/(dashboard)/actions";
import { formatFeedTime } from "@/lib/dates";
import type { ContributionView } from "@/lib/data/types";
import { PILLAR_META } from "@/types/domain";
import type { ContributionStatus } from "@/types/domain";

/**
 * Contribution moderation.
 *
 * Approve, reject, and reset are confirmed actions. Approving explicitly does
 * not publish anything: a separate action turns the contribution into a
 * `needs_review` draft with the verification flag already in place.
 */
export function ContributionModerationList({
  contributions,
}: {
  contributions: ContributionView[];
}) {
  return (
    <ul className="grid gap-3">
      {contributions.map((contribution) => (
        <li key={contribution.id}>
          <ContributionCard contribution={contribution} />
        </li>
      ))}
    </ul>
  );
}

function ContributionCard({
  contribution,
}: {
  contribution: ContributionView;
}) {
  const router = useRouter();
  const [note, setNote] = React.useState(contribution.moderationNote ?? "");
  const [pending, setPending] = React.useState(false);

  const moderate = async (action: "approve" | "reject" | "reset") => {
    setPending(true);
    const result = await moderateContributionAction({
      contributionId: contribution.id,
      action,
      note: note.trim(),
    });
    setPending(false);

    if (result.ok) {
      toast.success(result.message ?? "Status diubah.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Status gagal diubah.");
    }
  };

  const createDraft = async () => {
    setPending(true);
    const result = await draftFromContributionAction(contribution.id);
    setPending(false);

    if (result.ok && result.articleId) {
      toast.success(result.message ?? "Draft dibuat.");
      router.push(`/admin/konten/${result.articleId}/edit`);
    } else {
      toast.error(result.message ?? "Draft gagal dibuat.");
    }
  };

  return (
    <BannerPanel ink="wall" lift="sm" className="grid gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPatch status={contribution.status} />
        <TapePatch tone="outline" size="sm">
          {PILLAR_META[contribution.pillar].label}
        </TapePatch>
        <span className="tng-label ml-auto text-muted">
          {formatFeedTime(contribution.createdAt)}
        </span>
      </div>

      <div>
        <h2 className="tng-display-tight text-lg">{contribution.title}</h2>
        <p className="mt-1 text-[0.8125rem] text-muted">
          {contribution.contributorName}
          {contribution.contributorContact
            ? ` · ${contribution.contributorContact}`
            : " · tanpa kontak"}
        </p>
        {contribution.location ? (
          <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-muted">
            <MapPin aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
            {contribution.location}
          </p>
        ) : null}
      </div>

      <p className="tng-measure whitespace-pre-line border-l-2 border-line pl-3 text-sm leading-relaxed text-foreground/90">
        {contribution.content}
      </p>

      {contribution.mediaUrls.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {contribution.mediaUrls.map((url) => (
            <li key={url} className="relative size-20 border-2 border-line">
              <Image
                src={url}
                alt={`Lampiran kiriman ${contribution.title}`}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t-2 border-line pt-3 text-[0.75rem] text-muted">
        <TapePatch tone="outline" size="sm">
          {contribution.consentPublish ? "Izin publikasi: ya" : "Izin publikasi: tidak"}
        </TapePatch>
        <TapePatch tone="outline" size="sm">
          {contribution.consentEdit ? "Izin sunting: ya" : "Izin sunting: tidak"}
        </TapePatch>
      </div>

      <Field
        label="Catatan moderasi"
        htmlFor={`note-${contribution.id}`}
        hint="Internal. Tidak dikirim ke pengirim."
      >
        <Textarea
          id={`note-${contribution.id}`}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={600}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        {contribution.status !== "approved" ? (
          <Confirm
            trigger={
              <Button variant="primary" size="sm" disabled={pending}>
                <Check aria-hidden="true" />
                Setujui
              </Button>
            }
            title="Setujui kiriman ini?"
            description="Menyetujui hanya menandai kiriman layak diproses. Tidak ada yang tayang sampai kamu membuat dan menerbitkan draftnya."
            actionLabel="Setujui"
            onConfirm={() => void moderate("approve")}
          />
        ) : null}

        {contribution.status === "approved" ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => void createDraft()}
          >
            <FileText aria-hidden="true" />
            Buat draft artikel
          </Button>
        ) : null}

        {contribution.status !== "rejected" ? (
          <Confirm
            trigger={
              <Button variant="outline" size="sm" disabled={pending}>
                <X aria-hidden="true" />
                Tolak
              </Button>
            }
            title="Tolak kiriman ini?"
            description="Kiriman akan ditandai ditolak dan keluar dari antrean. Catatan moderasi tersimpan untuk arsip internal."
            actionLabel="Tolak"
            variant="danger"
            onConfirm={() => void moderate("reject")}
          />
        ) : null}

        {contribution.status !== "pending" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => void moderate("reset")}
          >
            <RotateCcw aria-hidden="true" />
            Kembalikan ke antrean
          </Button>
        ) : null}
      </div>
    </BannerPanel>
  );
}

function StatusPatch({ status }: { status: ContributionStatus }) {
  switch (status) {
    case "approved":
      return (
        <TapePatch tone="lime" tilt="left" size="sm">
          Disetujui
        </TapePatch>
      );
    case "rejected":
      return (
        <TapePatch tone="outline" size="sm" className="line-through decoration-2">
          Ditolak
        </TapePatch>
      );
    case "pending":
      return (
        <TapePatch tone="tape" tilt="left" size="sm">
          Menunggu
        </TapePatch>
      );
  }
}

function Confirm({
  trigger,
  title,
  description,
  actionLabel,
  variant = "primary",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  variant?: "primary" | "secondary" | "danger";
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant={variant} onClick={onConfirm}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
