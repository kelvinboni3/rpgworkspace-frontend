import { useEffect, useState } from "react";
import { apiClient } from "@/services/api-client";

export function useAuthenticatedMedia(url: string | null | undefined): string | undefined {
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let currentObjectUrl: string | undefined;

    // apiClient's baseURL already is "/api" — strip the leading segment so URLs returned
    // verbatim by the backend (e.g. "/api/characters/{id}/portrait") don't get doubled up.
    const relativeUrl = url.startsWith("/api/") ? url.slice("/api".length) : url;

    apiClient
      .get(relativeUrl, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        currentObjectUrl = URL.createObjectURL(response.data as Blob);
        setObjectUrl(currentObjectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    };
  }, [url]);

  return url ? objectUrl : undefined;
}
