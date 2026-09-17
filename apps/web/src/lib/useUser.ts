"use client";

import { useEffect, useState } from "react";
import { api, type User } from "./api";

/** Who is signed in, if anyone. A 401 is an answer, not an error. */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}
