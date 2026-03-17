export interface Category {
  name: string;
  slug: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

export const CATEGORIES: Category[] = [
  { name: "정치", slug: "정치", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100", darkBgColor: "dark:bg-red-900" },
  { name: "경제", slug: "경제", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100", darkBgColor: "dark:bg-blue-900" },
  { name: "사회", slug: "사회", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100", darkBgColor: "dark:bg-green-900" },
  { name: "세계", slug: "세계", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100", darkBgColor: "dark:bg-purple-900" },
  { name: "IT·과학", slug: "IT·과학", color: "text-cyan-700 dark:text-cyan-400", bgColor: "bg-cyan-100", darkBgColor: "dark:bg-cyan-900" },
  { name: "문화·연예", slug: "문화·연예", color: "text-pink-700 dark:text-pink-400", bgColor: "bg-pink-100", darkBgColor: "dark:bg-pink-900" },
  { name: "스포츠", slug: "스포츠", color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-100", darkBgColor: "dark:bg-orange-900" },
  { name: "라이프", slug: "라이프", color: "text-teal-700 dark:text-teal-400", bgColor: "bg-teal-100", darkBgColor: "dark:bg-teal-900" },
];

export function getCategoryStyle(categoryName: string): Category {
  return (
    CATEGORIES.find((c) => c.slug === categoryName) ?? {
      name: categoryName,
      slug: categoryName,
      color: "text-gray-700 dark:text-gray-400",
      bgColor: "bg-gray-100",
      darkBgColor: "dark:bg-gray-800",
    }
  );
}
