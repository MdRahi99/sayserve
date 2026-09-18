"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Wake the API up.
 *
 * The free tier sleeps after fifteen minutes, and the first request pays about
 * thirty seconds for the cold start. A visitor who presses "Try as staff" and
 * waits half a minute on a blank screen has already decided the project does
 * not work.
 *
 * So the landing page pings health while they are still reading the hero. By
 * the time anyone presses anything, the API is usually awake. It renders
 * nothing and a failure is ignored on purpose — this is a courtesy, not a
 * dependency.
 */
export function WakeApi() {
  useEffect(() => {
    api.health().catch(() => {});
  }, []);
  return null;
}
