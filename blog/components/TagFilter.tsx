import Link from "next/link";

interface Props {
  tags: string[];
}

export default function TagFilter({ tags }: Props) {
  if (!tags.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">태그</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            #{tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
