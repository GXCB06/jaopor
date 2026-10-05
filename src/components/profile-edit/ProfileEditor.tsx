"use client";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  LinkIcon,
  Loader2Icon,
  LockIcon,
  PinIcon,
  PlusIcon,
  SparklesIcon,
  TargetIcon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  saveContacts,
  savePins,
  savePositions,
  saveProfile,
  saveSkills,
  type PositionInput,
} from "@/app/actions/profile";
import { Card } from "@/components/core/Card";
import { StartupLogo } from "@/components/StartupBits";
import { Button } from "@/components/ui/button";
import {
  Field,
  Select,
  ToggleChips,
  inputClass,
} from "@/components/wizard/fields";
import { Link, useRouter } from "@/i18n/navigation";
import { CATEGORY_LIST } from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import {
  COMMITMENTS,
  DEALS,
  LOOKING_ROLES,
  PROFILE_STATUSES,
  SOCIAL_KEYS,
  WORK_LOCATIONS,
  type LookingFor,
  type VisibilityField,
} from "@/lib/profile";
import { cn } from "@/lib/utils";
import { AvatarField } from "./AvatarField";
import { HandleField, type HandleState } from "./HandleField";
import { ProvinceField } from "./ProvinceField";
import { SkillPicker, type PickedSkill } from "./SkillPicker";
import { VisibilityMenu, type Visibility } from "./VisibilityMenu";

export type EditorInitial = {
  handle: string;
  displayName: string;
  headline: string;
  bio: string;
  province: string;
  xHandle: string;
  status: string;
  lookingFor: LookingFor;
  socialLinks: Record<string, string>;
  /** field_visibility; a missing field is public. */
  visibility: Partial<Record<VisibilityField, Visibility>>;
  skills: PickedSkill[];
  positions: (PositionInput & { key: string })[];
  contacts: { lineId: string; email: string };
  works: {
    id: number;
    name: string;
    logo: string | null;
    pinned: number | null;
  }[];
};

const month = (d: string | null | undefined) => (d ? d.slice(0, 7) : "");
const toDate = (m: string) => (m ? `${m}-01` : "");

const SECTIONS = [
  { id: "basics", icon: UserIcon },
  { id: "status", icon: TargetIcon },
  { id: "skills", icon: SparklesIcon },
  { id: "experience", icon: BriefcaseIcon },
  { id: "pinned", icon: PinIcon },
  { id: "links", icon: LinkIcon },
] as const satisfies readonly { id: string; icon: LucideIcon }[];
type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * Design.md §5 Profile editor (/dashboard/profile): one section at a time behind a tab row, a
 * completeness bar, per-field visibility next to each controlled field, one sticky save bar.
 * Saves profile → skills → experience → pins → contacts (each its own server action).
 */
export function ProfileEditor({
  initial,
  avatar,
}: {
  initial: EditorInitial;
  /** Saved on its own by AvatarField, outside the form's unsaved changes. */
  avatar: {
    url: string | null;
    provider: { url: string; name: string } | null;
  };
}) {
  const t = useTranslations("Me");
  const locale = useLocale();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [handleState, setHandleState] = useState<HandleState>("ok");
  const [saving, start] = useTransition();
  const [active, setActive] = useState<SectionId>("basics");
  // Social inputs on screen: the filled ones plus any opened with "+ name".
  const [shownLinks, setShownLinks] = useState<string[]>(() =>
    SOCIAL_KEYS.filter((k) => initial.socialLinks[k]),
  );
  const topRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof EditorInitial>(k: K, v: EditorInitial[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  const lf = f.lookingFor;
  const setLf = (patch: Partial<LookingFor>) =>
    set("lookingFor", { ...lf, ...patch });
  // What was last loaded or saved. Compared with the form instead of `initial`: the server stores
  // some values differently (public visibility is omitted, links are normalised, new experience
  // rows get ids), so after a save + refresh the new `initial` would never equal the form.
  const [baseline, setBaseline] = useState(initial);
  const dirty = JSON.stringify(f) !== JSON.stringify(baseline);
  const pinned = f.works
    .filter((w) => w.pinned !== null)
    .sort((a, b) => a.pinned! - b.pinned!);
  const looking =
    f.status === "looking_cofounder" || f.status === "open_to_work";

  const visMenu = (field: VisibilityField) => (
    <VisibilityMenu
      field={field}
      value={f.visibility[field] ?? "public"}
      onChange={(v) => set("visibility", { ...f.visibility, [field]: v })}
    />
  );

  const go = (id: SectionId) => {
    setActive(id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Deep links (#province, #skills, #experience…): open the section holding that id, then
  // highlight it. Runs on load and on in-page hash changes.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      const target = el?.closest<HTMLElement>("[data-section]")?.dataset
        .section as SectionId | undefined;
      if (!el || !target) return;
      setActive(target);
      timers.push(
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-brand/60", "rounded-md");
          el.querySelector<HTMLElement>("input, textarea, select")?.focus({
            preventScroll: true,
          });
        }, 50),
        setTimeout(() => el.classList.remove("ring-2", "ring-brand/60"), 2600),
      );
    };
    open();
    window.addEventListener("hashchange", open);
    return () => {
      window.removeEventListener("hashchange", open);
      timers.forEach(clearTimeout);
    };
  }, []);

  // ---- completion (progress header + tab ticks) ----------------------------------------------
  const done: Record<SectionId, boolean[]> = {
    basics: [
      Boolean(f.displayName.trim()),
      Boolean(f.headline.trim()),
      Boolean(f.bio.trim()),
      Boolean(f.province),
    ],
    status: looking
      ? [Boolean(lf.roles?.length), Boolean(lf.offer?.trim())]
      : [true],
    skills: [f.skills.length > 0, f.skills.some((s) => s.superpower)],
    experience: [f.positions.length > 0],
    pinned: f.works.length ? [pinned.length > 0] : [true],
    links: [
      Boolean(f.xHandle.trim()) ||
        Object.values(f.socialLinks).some((v) => v?.trim()),
      Boolean(f.contacts.lineId.trim() || f.contacts.email.trim()),
    ],
  };
  const all = Object.values(done).flat();
  const pct = Math.round((all.filter(Boolean).length / all.length) * 100);
  // The next incomplete section other than the one on screen.
  const nextMissing = SECTIONS.find(
    (x) => x.id !== active && done[x.id].some((d) => !d),
  );
  const index = SECTIONS.findIndex((x) => x.id === active);
  const prev = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];

  const save = () =>
    start(async () => {
      const snapshot = f;
      if (handleState !== "ok" && f.handle !== baseline.handle) {
        toast.error(t(`handle.${handleState}`));
        return;
      }
      const steps = [
        () =>
          saveProfile({
            handle: f.handle !== baseline.handle ? f.handle : undefined,
            displayName: f.displayName,
            headline: f.headline,
            bio: f.bio,
            province: f.province || null,
            xHandle: f.xHandle,
            status: f.status,
            lookingFor: f.lookingFor,
            socialLinks: f.socialLinks,
            visibility: f.visibility,
          }),
        () => saveSkills(f.skills),
        () =>
          savePositions(
            f.positions.map((p) => ({
              title: p.title,
              company: p.company,
              startDate: toDate(month(p.startDate)),
              endDate: p.endDate ? toDate(month(p.endDate)) : null,
              description: p.description,
            })),
          ),
        () => savePins(pinned.map((w) => w.id)),
        () => saveContacts(f.contacts),
      ];
      for (const step of steps) {
        const res = await step();
        if (!res.ok) {
          toast.error(
            t.has(`errors.${res.error}`)
              ? t(`errors.${res.error}`)
              : t("saveFailed"),
          );
          return;
        }
      }
      setBaseline(snapshot);
      toast.success(t("saved"));
      router.refresh();
    });

  const section = (
    id: SectionId,
    hint: string,
    body: React.ReactNode,
    action?: React.ReactNode,
  ) => (
    <section
      data-section={id}
      hidden={active !== id}
      aria-labelledby={`sec-${id}`}
    >
      <Card id={id} className="scroll-mt-24 space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`sec-${id}`} className="text-sm font-bold">
              {t(`sec.${id}`)}
            </h2>
            <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
          </div>
          {action}
        </div>
        {body}
        <div className="flex justify-between gap-2 border-t pt-4">
          {prev ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => go(prev.id)}
            >
              <ArrowLeftIcon aria-hidden="true" />
              {t(`tab.${prev.id}`)}
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => go(next.id)}
            >
              {t(`tab.${next.id}`)}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </Card>
    </section>
  );

  const movePos = (i: number, d: -1 | 1) => {
    const list = [...f.positions];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set("positions", list);
  };
  const setPos = (
    i: number,
    patch: Partial<EditorInitial["positions"][number]>,
  ) =>
    set(
      "positions",
      f.positions.map((p, k) => (k === i ? { ...p, ...patch } : p)),
    );
  const applyPins = (order: number[]) =>
    set(
      "works",
      f.works.map((x) => ({
        ...x,
        pinned: order.includes(x.id) ? order.indexOf(x.id) : null,
      })),
    );
  const togglePin = (id: number) => {
    const order = pinned.map((w) => w.id);
    if (order.includes(id)) applyPins(order.filter((x) => x !== id));
    else if (order.length < 6) applyPins([...order, id]);
  };
  const movePin = (id: number, d: -1 | 1) => {
    const order = pinned.map((w) => w.id);
    const a = order.indexOf(id);
    const b = a + d;
    if (b < 0 || b >= order.length) return;
    [order[a], order[b]] = [order[b], order[a]];
    applyPins(order);
  };

  return (
    <div ref={topRef} className="scroll-mt-20 space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("editProfile")}
        </h1>
        <Link
          href={`/u/${initial.handle}`}
          className="inline-flex items-center gap-1 text-caption text-brand-text hover:underline"
        >
          {t("previewPublic")}
          <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </header>

      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-caption">
          <span className="font-semibold tabular-nums">
            {t("progress", { pct })}
          </span>
          {nextMissing && (
            <button
              type="button"
              onClick={() => go(nextMissing.id)}
              className="text-brand-text hover:underline"
            >
              {t("nextStep", { section: t(`tab.${nextMissing.id}`) })} →
            </button>
          )}
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("progress", { pct })}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Section tabs: wrap on wider screens, scroll sideways on phones */}
      <nav aria-label={t("sectionsLabel")}>
        <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {SECTIONS.map(({ id, icon: Icon }) => {
            const d = done[id];
            return (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active === id ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs whitespace-nowrap transition-colors",
                    active === id
                      ? "border-foreground/20 bg-secondary font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  {t(`tab.${id}`)}
                  {d.every(Boolean) ? (
                    <CheckCircle2Icon
                      className="size-3.5 shrink-0 text-positive"
                      aria-label={t("complete")}
                    />
                  ) : (
                    <span className="text-2xs text-faint tabular-nums">
                      {d.filter(Boolean).length}/{d.length}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {section(
        "basics",
        t("sec.basicsHint"),
        <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-2 sm:col-span-2">
            <p className="text-xs font-medium">{t("f.photo")}</p>
            <AvatarField
              name={f.displayName || f.handle}
              url={avatar.url}
              provider={avatar.provider}
            />
          </div>
          <Field label={t("f.displayName")} htmlFor="p-name">
            <input
              id="p-name"
              value={f.displayName}
              maxLength={80}
              onChange={(e) => set("displayName", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("f.handle")} htmlFor="p-handle">
            <HandleField
              id="p-handle"
              value={f.handle}
              onChange={(v) => set("handle", v)}
              onState={setHandleState}
            />
          </Field>
          <Field
            label={t("f.headline")}
            htmlFor="p-headline"
            hint={`${f.headline.length}/80`}
            className="sm:col-span-2"
          >
            <input
              id="p-headline"
              value={f.headline}
              maxLength={80}
              placeholder={t("f.headlinePh")}
              onChange={(e) => set("headline", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("f.bio")}
            htmlFor="p-bio"
            hint={`${f.bio.length}/280`}
            className="sm:col-span-2"
            action={visMenu("bio")}
          >
            <textarea
              id="p-bio"
              value={f.bio}
              maxLength={280}
              rows={3}
              onChange={(e) => set("bio", e.target.value)}
              className={cn(inputClass, "h-auto py-2")}
            />
          </Field>
          <Field
            id="province"
            label={t("f.province")}
            htmlFor="p-province"
            className="sm:col-span-2"
            action={visMenu("province")}
          >
            <ProvinceField
              id="p-province"
              value={f.province}
              onChange={(v) => set("province", v)}
            />
          </Field>
        </div>,
      )}

      {section(
        "status",
        t("sec.statusHint"),
        <div className="space-y-4">
          <div
            role="radiogroup"
            aria-label={t("f.status")}
            className="grid gap-2 sm:grid-cols-2"
          >
            {PROFILE_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={f.status === s}
                onClick={() => set("status", s)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-caption transition-colors",
                  f.status === s
                    ? "border-brand bg-brand/10 font-semibold"
                    : "hover:bg-accent",
                )}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
          {looking && (
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Field
                label={t("f.roles")}
                className="sm:col-span-2"
                action={visMenu("looking_for")}
              >
                <ToggleChips
                  options={LOOKING_ROLES.map((r) => ({
                    value: r,
                    label: t(`roles.${r}`),
                  }))}
                  value={(lf.roles ?? []) as (typeof LOOKING_ROLES)[number][]}
                  onChange={(v) => setLf({ roles: v })}
                />
              </Field>
              <Field
                label={t("f.offer")}
                htmlFor="p-offer"
                hint={`${(lf.offer ?? "").length}/200`}
                className="sm:col-span-2"
              >
                <textarea
                  id="p-offer"
                  value={lf.offer ?? ""}
                  maxLength={200}
                  rows={2}
                  placeholder={t("f.offerPh")}
                  onChange={(e) => setLf({ offer: e.target.value })}
                  className={cn(inputClass, "h-auto py-2")}
                />
              </Field>
              <Field label={t("f.commitment")} htmlFor="p-commit">
                <Select
                  id="p-commit"
                  value={lf.commitment ?? ""}
                  placeholder="—"
                  onChange={(v) => setLf({ commitment: v || undefined })}
                  options={COMMITMENTS.map((c) => ({
                    value: c,
                    label: t(`commitment.${c}`),
                  }))}
                />
              </Field>
              <Field label={t("f.deal")} htmlFor="p-deal">
                <Select
                  id="p-deal"
                  value={lf.deal ?? ""}
                  placeholder="—"
                  onChange={(v) => setLf({ deal: v || undefined })}
                  options={DEALS.map((c) => ({
                    value: c,
                    label: t(`deal.${c}`),
                  }))}
                />
              </Field>
              <Field label={t("f.location")} htmlFor="p-loc">
                <Select
                  id="p-loc"
                  value={lf.location ?? ""}
                  placeholder="—"
                  onChange={(v) => setLf({ location: v || undefined })}
                  options={WORK_LOCATIONS.map((c) => ({
                    value: c,
                    label: t(`location.${c}`),
                  }))}
                />
              </Field>
              <Field
                label={t("f.industries")}
                className="sm:col-span-2"
                hint={t("f.industriesHint")}
              >
                <ToggleChips
                  options={CATEGORY_LIST.map((c) => ({
                    value: c.slug as string,
                    label: localizedName(c, locale),
                  }))}
                  value={lf.industries ?? []}
                  onChange={(v) => setLf({ industries: v.slice(0, 5) })}
                />
              </Field>
            </div>
          )}
        </div>,
      )}

      {section(
        "skills",
        t("sec.skillsHint"),
        <SkillPicker value={f.skills} onChange={(v) => set("skills", v)} />,
        visMenu("skills"),
      )}

      {section(
        "experience",
        t("sec.experienceHint"),
        <div className="space-y-3">
          {f.positions.map((p, i) => (
            <div key={p.key} className="space-y-3 rounded-lg border p-3">
              <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                <Field label={t("f.title")} htmlFor={`pos-t-${p.key}`}>
                  <input
                    id={`pos-t-${p.key}`}
                    value={p.title}
                    maxLength={80}
                    onChange={(e) => setPos(i, { title: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("f.company")} htmlFor={`pos-c-${p.key}`}>
                  <input
                    id={`pos-c-${p.key}`}
                    value={p.company ?? ""}
                    maxLength={80}
                    onChange={(e) => setPos(i, { company: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("f.start")} htmlFor={`pos-s-${p.key}`}>
                  <input
                    id={`pos-s-${p.key}`}
                    type="month"
                    value={month(p.startDate)}
                    onChange={(e) => setPos(i, { startDate: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label={t("f.end")}
                  htmlFor={`pos-e-${p.key}`}
                  hint={t("f.endHint")}
                >
                  <input
                    id={`pos-e-${p.key}`}
                    type="month"
                    value={month(p.endDate)}
                    onChange={(e) =>
                      setPos(i, { endDate: e.target.value || null })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field
                  label={t("f.description")}
                  htmlFor={`pos-d-${p.key}`}
                  className="sm:col-span-2"
                >
                  <input
                    id={`pos-d-${p.key}`}
                    value={p.description ?? ""}
                    maxLength={200}
                    onChange={(e) => setPos(i, { description: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => movePos(i, -1)}
                  disabled={i === 0}
                  aria-label={t("moveUp")}
                >
                  <ArrowUpIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => movePos(i, 1)}
                  disabled={i === f.positions.length - 1}
                  aria-label={t("moveDown")}
                >
                  <ArrowDownIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() =>
                    set(
                      "positions",
                      f.positions.filter((_, k) => k !== i),
                    )
                  }
                  aria-label={t("remove")}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
          {f.positions.length < 20 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("positions", [
                  ...f.positions,
                  {
                    key: `new-${Date.now()}`,
                    title: "",
                    company: "",
                    startDate: "",
                    endDate: null,
                    description: "",
                  },
                ])
              }
            >
              <PlusIcon aria-hidden="true" />
              {t("addPosition")}
            </Button>
          )}
        </div>,
        visMenu("positions"),
      )}

      {section(
        "pinned",
        t("sec.pinnedHint"),
        f.works.length === 0 ? (
          <p className="text-caption text-muted-foreground">{t("noWorks")}</p>
        ) : (
          <ul className="space-y-1.5">
            {[...pinned, ...f.works.filter((w) => w.pinned === null)].map(
              (w) => {
                const isPinned = w.pinned !== null;
                return (
                  <li
                    key={w.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-caption",
                      isPinned && "border-brand/60 bg-brand/5",
                    )}
                  >
                    <StartupLogo name={w.name} src={w.logo} size={24} />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {w.name}
                    </span>
                    {isPinned && (
                      <>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => movePin(w.id, -1)}
                          disabled={w.pinned === 0}
                          aria-label={t("moveUp")}
                        >
                          <ArrowUpIcon aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => movePin(w.id, 1)}
                          disabled={w.pinned === pinned.length - 1}
                          aria-label={t("moveDown")}
                        >
                          <ArrowDownIcon aria-hidden="true" />
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={isPinned ? "secondary" : "outline"}
                      onClick={() => togglePin(w.id)}
                      disabled={!isPinned && pinned.length >= 6}
                      aria-pressed={isPinned}
                    >
                      <PinIcon aria-hidden="true" />
                      {isPinned ? t("unpin") : t("pin")}
                    </Button>
                  </li>
                );
              },
            )}
          </ul>
        ),
      )}

      {section(
        "links",
        t("sec.linksHint"),
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold">{t("socialTitle")}</h3>
              {visMenu("social_links")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Field label={t("f.x")} htmlFor="p-x">
                <input
                  id="p-x"
                  value={f.xHandle}
                  maxLength={16}
                  placeholder="@handle"
                  onChange={(e) => set("xHandle", e.target.value)}
                  className={inputClass}
                />
              </Field>
              {shownLinks.map((k) => (
                <Field key={k} label={t(`social.${k}`)} htmlFor={`s-${k}`}>
                  <input
                    id={`s-${k}`}
                    value={f.socialLinks[k] ?? ""}
                    inputMode="url"
                    placeholder="https://"
                    onChange={(e) =>
                      set("socialLinks", {
                        ...f.socialLinks,
                        [k]: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              ))}
            </div>
            {shownLinks.length < SOCIAL_KEYS.length && (
              <div className="flex flex-wrap gap-1.5">
                {SOCIAL_KEYS.filter((k) => !shownLinks.includes(k)).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setShownLinks([...shownLinks, k]);
                      setTimeout(() =>
                        document.getElementById(`s-${k}`)?.focus(),
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-2xs text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  >
                    <PlusIcon className="size-3" aria-hidden="true" />
                    {t(`social.${k}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            id="contacts"
            className="space-y-3 rounded-lg border border-dashed p-4"
          >
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                <LockIcon className="size-3.5" aria-hidden="true" />
                {t("sec.contacts")}
              </h3>
              <p className="mt-0.5 text-caption text-muted-foreground">
                {t("sec.contactsHint")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Field label={t("f.lineId")} htmlFor="c-line">
                <input
                  id="c-line"
                  value={f.contacts.lineId}
                  maxLength={50}
                  onChange={(e) =>
                    set("contacts", { ...f.contacts, lineId: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label={t("f.email")} htmlFor="c-email">
                <input
                  id="c-email"
                  type="email"
                  value={f.contacts.email}
                  maxLength={254}
                  onChange={(e) =>
                    set("contacts", { ...f.contacts, email: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>,
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <span
          className={cn("text-caption", dirty ? "text-warning" : "text-faint")}
        >
          {dirty ? t("unsaved") : t("allSaved")}
        </span>
        <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving && (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          )}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
