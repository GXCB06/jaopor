"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/app/actions/profile";

/** Opening the requests page counts as reading the notifications. */
export function MarkNotificationsRead({ unread }: { unread: number }) {
  useEffect(() => {
    if (unread > 0) markNotificationsRead();
  }, [unread]);
  return null;
}
