"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TapestryIndexRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  useEffect(() => {
    if (id) router.replace(`/tapestries/${id}/general`);
  }, [id, router]);
  return null;
}



