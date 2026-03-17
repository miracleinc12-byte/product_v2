import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkGfm from "remark-gfm";

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(remarkGfm).use(remarkHtml).process(markdown);
  return result.toString();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
