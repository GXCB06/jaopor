"use client";

import { useEffect } from "react";
import { markLocalMission, type LOCAL_MISSIONS } from "@/lib/missions";

/** Marks a browser-only dashboard mission done when this page is visited (renders nothing). */
export function MissionMark({
  mission,
}: {
  mission: keyof typeof LOCAL_MISSIONS;
}) {
  useEffect(() => {
    markLocalMission(mission);
  }, [mission]);
  return null;
}
