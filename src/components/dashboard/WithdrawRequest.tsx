"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { withdrawRequest } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

export function WithdrawRequest({ id }: { id: number }) {
  const t = useTranslations("Me");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await withdrawRequest(id);
          if (res.ok) router.refresh();
          else toast.error(t("saveFailed"));
        })
      }
    >
      {t("withdraw")}
    </Button>
  );
}
