import { Suspense } from "react";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";
import { notFound } from "next/navigation";
import TitleDetailClient from "./TitleDetailClient";

interface TitlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TitlePageProps) {
  const { slug } = await params;
  return {
    title: `${slug} — MangaVault`,
    description: `Read ${slug} - chapters, info, and more on MangaVault`,
  };
}

export default async function TitlePage({ params }: TitlePageProps) {
  const { slug } = await params;

  let initialResult: ReturnType<typeof toSafeResult> | null = null;

  try {
    const db = await getMongoDb();
    if (db) {
      const doc = await db.collection("titles").findOne({
        $or: [
          { titleKey: slug.toLowerCase().replace(/[^a-z0-9]/g, "") },
          { url: { $regex: slug, $options: "i" } },
        ],
      });
      if (doc) {
        initialResult = toSafeResult(doc as Record<string, unknown>);
      }
    }
  } catch {
    // Ignore
  }

  if (!initialResult) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="empty wrap" style={{ marginTop: 140 }}>LOADING TITLE…</div>}>
      <TitleDetailClient initialResult={initialResult} slug={slug} />
    </Suspense>
  );
}