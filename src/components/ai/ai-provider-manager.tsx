"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  KeyRound,
  ListChecks,
  Loader2,
  Plug,
  Plus,
  Power,
  RefreshCw,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/controls";
import { TapePatch } from "@/components/shared/tape-patch";
import { EmptyState } from "@/components/shared/empty-state";
import {
  addApiKeyAction,
  createProviderAction,
  deleteApiKeyAction,
  deleteProviderAction,
  detectProviderModelsAction,
  reorderKeysAction,
  setDefaultProviderAction,
  setKeyStatusAction,
  saveTaskModelSettingsAction,
  setProviderDefaultModelAction,
  setModelStatusAction,
  testApiKeyAction,
  toggleProviderAction,
} from "@/app/(admin)/admin/(dashboard)/ai/actions";
import { formatFeedTime } from "@/lib/dates";
import type {
  AiApiKeyView,
  AiModelView,
  AiProviderView,
  AiTaskModelSettingView,
  DataSource,
} from "@/lib/data/types";
import type { AiKeyStatus, AiTaskType } from "@/types/domain";

/**
 * Provider and key manager.
 *
 * Fallback order is expressed with explicit up and down controls rather than
 * drag and drop: the order is keyboard-operable, works on a phone, and the whole
 * order is submitted as one array so no intermediate state is half-saved.
 */
export function AiProviderManager({
  providers,
  taskModelSettings,
  source,
  canWrite,
}: {
  providers: AiProviderView[];
  taskModelSettings: AiTaskModelSettingView[];
  source: DataSource;
  canWrite: boolean;
}) {
  const allKeys = React.useMemo(
    () =>
      providers
        .flatMap((provider) =>
          provider.keys.map((key) => ({ key, providerName: provider.name })),
        )
        .sort((a, b) => a.key.priority - b.key.priority),
    [providers],
  );
  const enabledModels = React.useMemo(
    () =>
      providers
        .flatMap((provider) => provider.models)
        .filter((model) => model.isEnabled)
        .sort((a, b) =>
          `${a.providerName}:${a.modelKey}`.localeCompare(
            `${b.providerName}:${b.modelKey}`,
          ),
        ),
    [providers],
  );
  const defaultProviderId = React.useMemo(() => {
    const first = providers
      .flatMap((provider) =>
        provider.keys
          .filter((key) => isUsableKey(key))
          .map((key) => ({
            providerId: provider.id,
            priority: key.priority,
            status: key.status,
            isActive: provider.isActive,
            hasModel: Boolean(provider.defaultModel),
          })),
      )
      .filter((entry) => entry.isActive && entry.hasModel)
      .sort(
        (a, b) =>
          keyStatusRank(a.status) - keyStatusRank(b.status) ||
          a.priority - b.priority,
      )[0];

    return first?.providerId ?? null;
  }, [providers]);

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="tng-display text-xl">Provider</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            Endpoint OpenAI-compatible. Provider default dipakai semua task,
            kecuali task itu punya model manual sendiri.
          </p>
        </div>
        <ProviderDialog disabled={!canWrite} />
      </div>

      {providers.length === 0 ? (
        <EmptyState
          patch={source === "unconfigured" ? "Belum tersambung" : "Belum ada"}
          title="Belum ada provider AI"
          description={
            source === "unconfigured"
              ? "Database belum tersambung, jadi provider belum bisa disimpan."
              : "Tambahkan provider OpenAI-compatible, lalu masukkan API key-nya. Tanpa provider, seluruh fitur AI menampilkan error yang jelas, bukan gagal diam-diam."
          }
        />
      ) : (
        <ul className="grid gap-3">
          {providers.map((provider) => (
            <li key={provider.id}>
              <ProviderCard
                provider={provider}
                canWrite={canWrite}
                isDefaultProvider={provider.id === defaultProviderId}
              />
            </li>
          ))}
        </ul>
      )}

      {allKeys.length > 1 ? (
        <FallbackOrder
          // Remounting on a changed chain resets the local order without an
          // effect that writes state during render.
          key={allKeys.map((entry) => entry.key.id).join("|")}
          entries={allKeys}
          canWrite={canWrite}
        />
      ) : null}

      <TaskModelSettings
        availableModels={enabledModels}
        settings={taskModelSettings}
        canWrite={canWrite}
      />
    </section>
  );
}

function isUsableKey(key: AiApiKeyView): boolean {
  return key.status === "active" || key.status === "rate_limited";
}

function keyStatusRank(status: AiKeyStatus): number {
  if (status === "active") return 0;
  if (status === "rate_limited") return 1;
  if (status === "error") return 2;
  return 3;
}

function ProviderCard({
  provider,
  canWrite,
  isDefaultProvider,
}: {
  provider: AiProviderView;
  canWrite: boolean;
  isDefaultProvider: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [detecting, setDetecting] = React.useState(false);
  const [defaultPending, setDefaultPending] = React.useState(false);

  const toggle = async (isActive: boolean) => {
    setPending(true);
    const result = await toggleProviderAction(provider.id, isActive);
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Status diubah.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal mengubah status.");
    }
  };

  const detectModels = async () => {
    setDetecting(true);
    const result = await detectProviderModelsAction(provider.id);
    setDetecting(false);
    if (result.ok) {
      toast.success(result.message ?? "Model terdeteksi.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Deteksi model gagal.");
    }
  };

  const setAsDefaultProvider = async () => {
    setDefaultPending(true);
    const result = await setDefaultProviderAction({ providerId: provider.id });
    setDefaultPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Provider default disimpan.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Provider default gagal disimpan.");
    }
  };

  return (
    <BannerPanel ink="wall" lift="sm" className="grid gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="tng-display-tight text-lg">{provider.name}</h3>
            {provider.isActive ? (
              <TapePatch tone="lime" size="sm">
                Aktif
              </TapePatch>
            ) : (
              <TapePatch tone="outline" size="sm" className="line-through decoration-2">
                Nonaktif
              </TapePatch>
            )}
            {isDefaultProvider ? (
              <TapePatch tone="orange" size="sm">
                Default
              </TapePatch>
            ) : null}
          </div>
          <p className="mt-1 truncate font-mono text-[0.75rem] text-muted">
            {provider.baseUrl}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-muted">
            Model utama: {provider.defaultModel ?? "Belum dipilih"}
          </p>
          {provider.notes ? (
            <p className="mt-1.5 text-[0.8125rem] text-muted">{provider.notes}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isDefaultProvider ? (
            <Button
              variant="outline"
              size="sm"
              disabled={
                !canWrite ||
                defaultPending ||
                provider.keys.every((key) => !isUsableKey(key)) ||
                !provider.defaultModel
              }
              onClick={() => void setAsDefaultProvider()}
            >
              {defaultPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Star aria-hidden="true" />
              )}
              Jadikan default
            </Button>
          ) : null}
          <label className="flex items-center gap-2">
            <span className="tng-label text-muted">Aktif</span>
            <Switch
              checked={provider.isActive}
              disabled={!canWrite || pending}
              onCheckedChange={(next) => void toggle(next)}
              aria-label={`Aktifkan provider ${provider.name}`}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-2 border-t-2 border-line pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="tng-label text-muted">Model AI</h4>
          <Button
            variant="outline"
            size="sm"
            disabled={!canWrite || detecting || provider.keys.length === 0}
            onClick={() => void detectModels()}
          >
            {detecting ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            Deteksi model
          </Button>
        </div>

        {provider.models.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Belum ada model terdeteksi. Tambahkan key, lalu jalankan deteksi
            model dari provider ini.
          </p>
        ) : (
          <>
            <p className="text-[0.8125rem] text-muted">
              Model hasil deteksi tetap nonaktif sampai diaktifkan manual. Model
              pertama yang aktif menjadi model utama provider.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {provider.models.map((model) => (
                <li key={model.id}>
                  <ModelRow
                    model={model}
                    providerId={provider.id}
                    isDefault={model.modelKey === provider.defaultModel}
                    canWrite={canWrite}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="grid gap-2 border-t-2 border-line pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="tng-label text-muted">API key</h4>
          <ApiKeyDialog providerId={provider.id} disabled={!canWrite} />
        </div>

        {provider.keys.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Belum ada key. Provider ini akan dilewati sampai ada key aktif.
          </p>
        ) : (
          <ul className="grid gap-2">
            {provider.keys.map((key) => (
              <li key={key.id}>
                <KeyRow apiKey={key} canWrite={canWrite} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t-2 border-line pt-3">
        <ConfirmButton
          trigger={
            <Button variant="ghost" size="sm" className="text-danger" disabled={!canWrite}>
              <Trash2 aria-hidden="true" />
              Hapus provider
            </Button>
          }
          title={`Hapus provider ${provider.name}?`}
          description="Semua key milik provider ini dihapus, termasuk secret-nya di secret store. Tindakan ini tidak bisa dibatalkan."
          actionLabel="Hapus provider"
          onConfirm={async () => {
            const result = await deleteProviderAction(provider.id);
            if (result.ok) {
              toast.success(result.message ?? "Provider dihapus.");
              router.refresh();
            } else {
              toast.error(result.message ?? "Gagal menghapus.");
            }
          }}
        />
      </div>
    </BannerPanel>
  );
}

function ModelRow({
  model,
  providerId,
  isDefault,
  canWrite,
}: {
  model: AiModelView;
  providerId: string;
  isDefault: boolean;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [defaultPending, setDefaultPending] = React.useState(false);

  const setEnabled = async (isEnabled: boolean) => {
    setPending(true);
    const result = await setModelStatusAction({
      modelId: model.id,
      isEnabled,
    });
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Status model disimpan.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Status model gagal disimpan.");
    }
  };

  const setDefault = async () => {
    setDefaultPending(true);
    const result = await setProviderDefaultModelAction({
      providerId,
      modelId: model.id,
    });
    setDefaultPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Model utama disimpan.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Model utama gagal disimpan.");
    }
  };

  return (
    <div className="flex min-h-16 items-center gap-2 border-2 border-line bg-wall-deep p-2.5">
      <Bot aria-hidden="true" className="size-4 shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[0.8125rem] text-foreground">
          {model.displayName ?? model.modelKey}
        </span>
        <span className="block truncate text-[0.75rem] text-muted">
          {model.source === "detected" ? "Terdeteksi" : "Manual"}
          {model.lastSeenAt ? ` - ${formatFeedTime(model.lastSeenAt)}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {isDefault ? (
          <TapePatch tone="lime" size="sm">
            Utama
          </TapePatch>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={!canWrite || pending || defaultPending}
            onClick={() => void setDefault()}
          >
            {defaultPending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Star aria-hidden="true" />
            )}
            Utama
          </Button>
        )}
        <Switch
          checked={model.isEnabled}
          disabled={!canWrite || pending || (isDefault && model.isEnabled)}
          onCheckedChange={(next) => void setEnabled(next)}
          aria-label={`${model.isEnabled ? "Nonaktifkan" : "Aktifkan"} model ${model.modelKey}`}
        />
      </span>
    </div>
  );
}

const TASK_OPTIONS: Array<{ taskType: AiTaskType; label: string }> = [
  { taskType: "ideation", label: "Ideasi artikel" },
  { taskType: "headline", label: "Judul/headline" },
  { taskType: "outline", label: "Outline artikel" },
  { taskType: "draft", label: "Draft artikel" },
  { taskType: "rewrite", label: "Rewrite artikel" },
  { taskType: "seo", label: "SEO metadata" },
  { taskType: "image", label: "Prompt gambar" },
  { taskType: "quality", label: "Quality gate" },
  { taskType: "social", label: "Social package" },
  { taskType: "copilot", label: "Copilot editor" },
];

function TaskModelSettings({
  availableModels,
  settings,
  canWrite,
}: {
  availableModels: AiModelView[];
  settings: AiTaskModelSettingView[];
  canWrite: boolean;
}) {
  return (
    <BannerPanel ink="wall" lift="sm" className="grid gap-3 p-3 sm:p-4">
      <div>
        <h2 className="tng-display text-xl">Model per tugas</h2>
        <p className="tng-measure mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Urutan pertama menjadi model utama untuk task tersebut. Urutan
          berikutnya dipakai sebagai fallback. Jika task dibiarkan kosong,
          gateway memakai provider dan model default global.
        </p>
      </div>

      {availableModels.length === 0 ? (
        <p className="text-[0.8125rem] text-muted">
          Belum ada model aktif. Deteksi model dari provider, lalu aktifkan model
          yang ingin dipakai.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {TASK_OPTIONS.map((task) => {
            const setting = settings.find(
              (entry) => entry.taskType === task.taskType,
            );
            return (
              <TaskModelRow
                key={task.taskType}
                taskType={task.taskType}
                label={task.label}
                availableModels={availableModels}
                selectedModelIds={
                  setting?.models.map((model) => model.modelId) ?? []
                }
                canWrite={canWrite}
              />
            );
          })}
        </div>
      )}
    </BannerPanel>
  );
}

function TaskModelRow({
  taskType,
  label,
  availableModels,
  selectedModelIds,
  canWrite,
}: {
  taskType: AiTaskType;
  label: string;
  availableModels: AiModelView[];
  selectedModelIds: string[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = React.useState(
    selectedModelIds.filter((id) =>
      availableModels.some((model) => model.id === id),
    ),
  );
  const [pending, setPending] = React.useState(false);
  const initial = selectedModelIds.join(",");
  const changed = order.join(",") !== initial;

  const selected = order
    .map((id) => availableModels.find((model) => model.id === id))
    .filter((model): model is AiModelView => Boolean(model));

  const toggle = (modelId: string, checked: boolean) => {
    setOrder((prev) => {
      if (checked) {
        if (prev.includes(modelId)) return prev;
        return [...prev, modelId];
      }
      return prev.filter((id) => id !== modelId);
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const current = next[index];
      const swapped = next[target];
      if (!current || !swapped) return prev;
      next[index] = swapped;
      next[target] = current;
      return next;
    });
  };

  const save = async () => {
    setPending(true);
    const result = await saveTaskModelSettingsAction({
      taskType,
      modelIds: order,
    });
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Pengaturan disimpan.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Pengaturan gagal disimpan.");
    }
  };

  return (
    <div className="grid gap-2 border-2 border-line bg-wall-deep p-2.5">
      <div className="flex items-center gap-2">
        <ListChecks aria-hidden="true" className="size-4 text-muted" />
        <h3 className="font-display text-[0.9375rem] font-extrabold text-foreground">
          {label}
        </h3>
      </div>

      <div className="grid gap-1.5">
        {availableModels.map((model) => (
          <label
            key={model.id}
            className="flex min-h-8 items-center gap-2 text-[0.8125rem] text-muted"
          >
            <input
              type="checkbox"
              checked={order.includes(model.id)}
              disabled={!canWrite || pending}
              onChange={(event) => toggle(model.id, event.target.checked)}
              className="size-4 accent-lime"
            />
            <span className="min-w-0 flex-1 truncate">
              {model.providerName} - {model.modelKey}
            </span>
          </label>
        ))}
      </div>

      {selected.length > 0 ? (
        <ol className="grid gap-1.5 border-t-2 border-line pt-2">
          {selected.map((model, index) => (
            <li key={model.id} className="flex items-center gap-2">
              <span className="font-display text-[0.75rem] font-extrabold tabular-nums text-lime">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-foreground">
                {model.providerName} - {model.modelKey}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Naikkan ${model.modelKey}`}
                disabled={!canWrite || pending || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Turunkan ${model.modelKey}`}
                disabled={!canWrite || pending || index === selected.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t-2 border-line pt-2 text-[0.75rem] text-muted">
          Jika kosong, task ini memakai provider default global dan model
          fallback aktif di provider tersebut.
        </p>
      )}

      {changed ? (
        <Button
          variant="primary"
          size="sm"
          disabled={!canWrite || pending}
          onClick={() => void save()}
        >
          {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          Simpan
        </Button>
      ) : null}
    </div>
  );
}

function KeyRow({
  apiKey,
  canWrite,
}: {
  apiKey: AiApiKeyView;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [testing, setTesting] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const test = async () => {
    setTesting(true);
    const result = await testApiKeyAction(apiKey.id);
    setTesting(false);
    if (result.ok) toast.success(result.message ?? "Koneksi berhasil.");
    else toast.error(result.message ?? "Koneksi gagal.");
    router.refresh();
  };

  const setStatus = async (status: "active" | "disabled") => {
    setPending(true);
    const result = await setKeyStatusAction({ keyId: apiKey.id, status });
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Status diubah.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal mengubah status.");
    }
  };

  return (
    <div className="grid gap-2 border-2 border-line bg-wall-deep p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <span className="font-mono text-[0.8125rem] text-foreground">
          {apiKey.keyPreview}
        </span>
        {apiKey.keyLabel ? (
          <span className="text-[0.75rem] text-muted">{apiKey.keyLabel}</span>
        ) : null}
        <KeyStatusPatch status={apiKey.status} />
        <span className="tng-label ml-auto text-muted tabular-nums">
          prioritas {apiKey.priority}
        </span>
      </div>

      {apiKey.lastError ? (
        <p className="flex items-start gap-1.5 border-l-2 border-danger pl-2 text-[0.75rem] leading-snug text-danger">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={2.6}
          />
          {apiKey.lastError}
        </p>
      ) : null}

      {apiKey.lastUsedAt ? (
        <p className="text-[0.75rem] text-muted">
          Terakhir dipakai {formatFeedTime(apiKey.lastUsedAt)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canWrite || testing}
          onClick={() => void test()}
        >
          {testing ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Plug aria-hidden="true" />
          )}
          Test connection
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={!canWrite || pending}
          onClick={() =>
            void setStatus(apiKey.status === "disabled" ? "active" : "disabled")
          }
        >
          <Power aria-hidden="true" />
          {apiKey.status === "disabled" ? "Aktifkan" : "Nonaktifkan"}
        </Button>

        <ConfirmButton
          trigger={
            <Button variant="ghost" size="sm" className="text-danger" disabled={!canWrite}>
              <Trash2 aria-hidden="true" />
              Hapus
            </Button>
          }
          title="Hapus API key ini?"
          description="Key dan secret-nya dihapus permanen. Kamu perlu memasukkan ulang nilainya kalau ingin memakainya lagi."
          actionLabel="Hapus key"
          onConfirm={async () => {
            const result = await deleteApiKeyAction(apiKey.id);
            if (result.ok) {
              toast.success(result.message ?? "Key dihapus.");
              router.refresh();
            } else {
              toast.error(result.message ?? "Gagal menghapus.");
            }
          }}
        />
      </div>
    </div>
  );
}

function KeyStatusPatch({ status }: { status: AiKeyStatus }) {
  switch (status) {
    case "active":
      return (
        <TapePatch tone="lime" size="sm">
          Aktif
        </TapePatch>
      );
    case "rate_limited":
      return (
        <TapePatch tone="orange" size="sm">
          Rate limited
        </TapePatch>
      );
    case "error":
      return (
        <TapePatch tone="danger" size="sm">
          Error
        </TapePatch>
      );
    case "disabled":
      return (
        <TapePatch tone="outline" size="sm" className="line-through decoration-2">
          Nonaktif
        </TapePatch>
      );
  }
}

function FallbackOrder({
  entries,
  canWrite,
}: {
  entries: Array<{ key: AiApiKeyView; providerName: string }>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = React.useState(entries.map((entry) => entry.key.id));
  const [pending, setPending] = React.useState(false);

  const byId = React.useMemo(
    () => new Map(entries.map((entry) => [entry.key.id, entry])),
    [entries],
  );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const current = next[index];
    const swapped = next[target];
    if (!current || !swapped) return;
    next[index] = swapped;
    next[target] = current;
    setOrder(next);
  };

  const save = async () => {
    setPending(true);
    const result = await reorderKeysAction({ order });
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Urutan disimpan.");
      router.refresh();
    } else {
      toast.error(result.message ?? "Urutan gagal disimpan.");
    }
  };

  const changed =
    order.join(",") !== entries.map((entry) => entry.key.id).join(",");

  return (
    <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3 sm:p-4">
      <div>
        <h2 className="tng-display text-xl">Urutan fallback</h2>
        <p className="tng-measure mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Urutan key menentukan provider default global. Gateway mencoba maksimal
          empat kandidat per permintaan. Timeout dan error model langsung pindah
          kandidat berikutnya; 429 dan 5xx dicoba ulang singkat jika masih ada
          waktu.
        </p>
      </div>

      <ol className="grid gap-2">
        {order.map((keyId, index) => {
          const entry = byId.get(keyId);
          if (!entry) return null;
          return (
            <li
              key={keyId}
              className="flex items-center gap-2 border-2 border-line bg-wall-deep p-2.5"
            >
              <span className="font-display text-sm font-extrabold tabular-nums text-lime">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[0.875rem] font-extrabold text-foreground">
                  {entry.providerName}
                </span>
                <span className="block truncate font-mono text-[0.75rem] text-muted">
                  {entry.key.keyPreview}
                  {entry.key.keyLabel ? ` · ${entry.key.keyLabel}` : ""}
                </span>
              </span>
              <KeyStatusPatch status={entry.key.status} />
              <span className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Naikkan ${entry.providerName} ${entry.key.keyPreview}`}
                  disabled={!canWrite || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Turunkan ${entry.providerName} ${entry.key.keyPreview}`}
                  disabled={!canWrite || index === order.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
              </span>
            </li>
          );
        })}
      </ol>

      {changed ? (
        <Button
          variant="primary"
          size="md"
          disabled={pending}
          onClick={() => void save()}
        >
          {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          Simpan urutan
        </Button>
      ) : null}
    </BannerPanel>
  );
}

function ProviderDialog({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [values, setValues] = React.useState({
    name: "",
    baseUrl: "",
    apiKey: "",
    keyLabel: "",
    defaultModel: "",
    notes: "",
    detectModels: true,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const submit = async () => {
    setPending(true);
    setErrors({});

    try {
      const result = await createProviderAction({
        name: values.name,
        baseUrl: values.baseUrl,
        apiKey: values.apiKey,
        keyLabel: values.keyLabel,
        defaultModel: values.defaultModel,
        notes: values.notes,
        isActive: true,
      });

      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(result.message ?? "Provider gagal disimpan.");
        return;
      }

      if (values.detectModels && result.providerId) {
        const detected = await detectProviderModelsAction(result.providerId);
        if (detected.ok) {
          toast.success(detected.message ?? "Provider ditambahkan dan model terdeteksi.");
        } else {
          toast.success(result.message ?? "Provider dan API key ditambahkan.");
          toast.warning(
            detected.message ?? "Provider tersimpan, tetapi deteksi model belum berhasil.",
          );
        }
      } else {
        toast.success(result.message ?? "Provider ditambahkan.");
      }

      setValues({
        name: "",
        baseUrl: "",
        apiKey: "",
        keyLabel: "",
        defaultModel: "",
        notes: "",
        detectModels: true,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("[ai:provider-dialog] Provider save status uncertain", error);
      toast.warning(
        "Status simpan provider belum bisa dikonfirmasi. Daftar provider dimuat ulang.",
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="md" disabled={disabled}>
          <Plus aria-hidden="true" />
          Tambah provider
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="provider-desc">
        <DialogHeader>
          <DialogTitle>Tambah provider AI</DialogTitle>
          <DialogDescription id="provider-desc">
            Isi endpoint OpenAI-compatible dan API key. Setelah tersimpan,
            dashboard bisa mendeteksi model dari endpoint /models.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3">
            <Field
              label="Nama"
              htmlFor="provider-name"
              required
              error={errors.name}
              hint="Label bebas, misalnya OpenAI Utama."
            >
              <Input
                id="provider-name"
                value={values.name}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, name: event.target.value }))
                }
                maxLength={80}
              />
            </Field>

            <Field
              label="Base URL"
              htmlFor="provider-url"
              required
              error={errors.baseUrl}
              hint="Contoh: https://api.openai.com/v1"
            >
              <Input
                id="provider-url"
                type="url"
                value={values.baseUrl}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, baseUrl: event.target.value }))
                }
              />
            </Field>

            <Field
              label="API key"
              htmlFor="provider-api-key"
              required
              error={errors.apiKey}
              hint="Diinput sekali, langsung disimpan ke secret store server."
            >
              <Input
                id="provider-api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={values.apiKey}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, apiKey: event.target.value }))
                }
              />
            </Field>

            <Field
              label="Label key"
              htmlFor="provider-key-label"
              error={errors.keyLabel}
              hint="Opsional, misalnya Key utama atau Key billing kantor."
            >
              <Input
                id="provider-key-label"
                value={values.keyLabel}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, keyLabel: event.target.value }))
                }
                maxLength={80}
              />
            </Field>

            <Field
              label="Model utama manual"
              htmlFor="provider-model"
              error={errors.defaultModel}
              hint="Opsional. Kosongkan jika ingin memilih dari hasil deteksi."
            >
              <Input
                id="provider-model"
                value={values.defaultModel}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    defaultModel: event.target.value,
                  }))
                }
                maxLength={120}
              />
            </Field>

            <label className="flex items-center gap-2 border-2 border-line bg-wall-deep p-2.5">
              <Switch
                checked={values.detectModels}
                onCheckedChange={(detectModels) =>
                  setValues((prev) => ({ ...prev, detectModels }))
                }
                aria-label="Deteksi model setelah provider disimpan"
              />
              <span className="min-w-0">
                <span className="block font-display text-[0.8125rem] font-extrabold text-foreground">
                  Deteksi model setelah simpan
                </span>
                <span className="block text-[0.75rem] text-muted">
                  Jika berhasil, semua model tetap nonaktif sampai dipilih manual.
                </span>
              </span>
            </label>

            <Field label="Catatan" htmlFor="provider-notes" error={errors.notes}>
              <Textarea
                id="provider-notes"
                rows={2}
                value={values.notes}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, notes: event.target.value }))
                }
                maxLength={400}
              />
            </Field>

            <Button
              variant="primary"
              size="md"
              block
              disabled={pending || values.apiKey.trim().length < 12}
              onClick={() => void submit()}
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : null}
              {pending ? "Menyimpan" : "Simpan provider"}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyDialog({
  providerId,
  disabled,
}: {
  providerId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const submit = async () => {
    setPending(true);
    setErrors({});

    try {
      const result = await addApiKeyAction({
        providerId,
        apiKey,
        keyLabel: label,
        priority: 100,
      });

      if (result.ok) {
        toast.success(result.message ?? "Key tersimpan.");
        setApiKey("");
        setLabel("");
        setOpen(false);
        router.refresh();
      } else {
        setErrors(result.fields ?? {});
        toast.error(result.message ?? "Key gagal disimpan.");
      }
    } catch (error) {
      console.error("[ai:key-dialog] API key save status uncertain", error);
      toast.warning(
        "Status simpan key belum bisa dikonfirmasi. Daftar key dimuat ulang.",
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus aria-hidden="true" />
          Tambah key
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="key-desc">
        <DialogHeader>
          <DialogTitle>Tambah API key</DialogTitle>
          <DialogDescription id="key-desc">
            Key hanya diinput sekali. Setelah disimpan, kamu hanya melihat
            preview ter-mask, dan nilainya tidak bisa dibaca lagi dari dashboard.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3">
            <Field
              label="API key"
              htmlFor="api-key"
              required
              error={errors.apiKey}
              hint="Ditempel sekali, langsung dienkripsi di server."
            >
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </Field>

            <Field
              label="Label"
              htmlFor="key-label"
              error={errors.keyLabel}
              hint="Untuk membedakan beberapa key, misalnya Key backup."
            >
              <Input
                id="key-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={80}
              />
            </Field>

            <Button
              variant="primary"
              size="md"
              block
              disabled={pending || apiKey.trim().length < 12}
              onClick={() => void submit()}
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : null}
              Simpan key
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmButton({
  trigger,
  title,
  description,
  actionLabel,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void | Promise<void>;
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
          <AlertDialogAction
            variant="danger"
            onClick={() => {
              void onConfirm();
            }}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
