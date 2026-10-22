import { Suspense } from "react";
import { Scanner } from "@/components/admin/scanner";
import { requireRole } from "@/lib/admin/session";
import { AdminNav } from "../nav";

export default function ScanPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Suspense fallback={<p className="py-20 text-center text-warm-ivory/70">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const role = await requireRole("staff");
  return (
    <>
      <AdminNav role={role} active="scan" />
      <h1 className="mt-6 mb-4 font-title text-4xl">Scan des billets</h1>
      <Scanner />
    </>
  );
}
