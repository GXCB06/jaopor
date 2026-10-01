"use client";

import {
  ChevronDownIcon,
  EyeOffIcon,
  GlobeIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VISIBILITIES, type VisibilityField } from "@/lib/profile";
import { cn } from "@/lib/utils";

export type Visibility = (typeof VISIBILITIES)[number];

const ICON = { public: GlobeIcon, members: UsersIcon, hidden: EyeOffIcon };

/** Design.md §5 VisibilityMenu: who can see one profile field, chosen where it is edited. */
export function VisibilityMenu({
  field,
  value,
  onChange,
}: {
  field: VisibilityField;
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const t = useTranslations("Me");
  const Icon = ICON[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("visLabel", {
          field: t(`fields.${field}`),
          value: t(`vis.${value}`),
        })}
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-2xs font-medium transition-colors hover:bg-accent",
          value === "public" ? "text-muted-foreground" : "text-warning",
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
        {t(`vis.${value}`)}
        <ChevronDownIcon className="size-3 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as Visibility)}
        >
          {VISIBILITIES.map((v) => {
            const ItemIcon = ICON[v];
            return (
              <DropdownMenuRadioItem key={v} value={v} className="items-start">
                <ItemIcon className="mt-0.5 size-3.5" aria-hidden="true" />
                <span>
                  <span className="block text-xs font-medium">
                    {t(`vis.${v}`)}
                  </span>
                  <span className="block text-2xs text-muted-foreground">
                    {t(`visDesc.${v}`)}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
