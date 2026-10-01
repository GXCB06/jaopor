"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { answerRequest } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** Accept / skip (decline) a contact request; block lives on the requests page. */
export function RequestActions({
  id,
  withBlock = false,
}: {
  id: number;
  withBlock?: boolean;
}) {
  const t = useTranslations("Me");
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (answer: "accepted" | "declined" | "blocked") =>
    start(async () => {
      const res = await answerRequest(id, answer);
      if (res.ok) {
        toast.success(t(`answered.${answer}`));
        router.refresh();
      } else toast.error(t("saveFailed"));
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => act("accepted")}
        className="flex-1"
      >
        {t("accept")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => act("declined")}
        className="flex-1"
      >
        {t("skip")}
      </Button>
      {withBlock && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => act("blocked")}
          className="text-negative"
        >
          {t("block")}
        </Button>
      )}
    </div>
  );
}
