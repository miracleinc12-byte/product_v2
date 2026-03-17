"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  categories: string[];
  current?: string;
}

export default function CategoryFilter({ categories, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (cat: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set("category", cat);
    else params.delete("category");
    params.delete("page");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => handleClick(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !current
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        전체
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            current === cat
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
