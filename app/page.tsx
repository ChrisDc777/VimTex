import type { Metadata } from "next";
import { AppRoot } from "@/components/shells/AppRoot";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const room = typeof params.room === "string" ? params.room.trim() : "";

  if (!room) {
    return {};
  }

  const title = "VimTex — shared room";
  const description =
    "Collaborative Vim + LaTeX scratchpad. This shared room is live — join to edit together in real time.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/?room=${encodeURIComponent(room)}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function HomePage() {
  return <AppRoot />;
}
