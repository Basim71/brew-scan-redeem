export type Announcement = {
  id: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  created_at: string;
  audience: "all" | "companies" | "platform";
};

// Read-only stub until a persistent announcements table is approved.
const SEED: Announcement[] = [];

export async function listAnnouncements(): Promise<Announcement[]> {
  return SEED;
}