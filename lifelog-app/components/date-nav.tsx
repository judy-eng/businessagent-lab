import Link from "next/link";
import { addDays, formatKorean } from "@/lib/dates";

// 보고 있는 날짜를 바꾸는 줄. 날짜는 ?date=YYYY-MM-DD 로 전달한다.
export function DateNav({
  basePath,
  date,
  today,
}: {
  basePath: string;
  date: string;
  today: string;
}) {
  const link = "rounded-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100";
  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={`${basePath}?date=${addDays(date, -1)}`}
        className={link}
        aria-label="전날"
      >
        ←
      </Link>
      <div className="text-center">
        <p className="text-xs text-zinc-400">{date === today ? "오늘" : " "}</p>
        <h1 className="text-xl font-bold">{formatKorean(date)}</h1>
      </div>
      <Link
        href={`${basePath}?date=${addDays(date, 1)}`}
        className={link}
        aria-label="다음날"
      >
        →
      </Link>
      {date !== today && (
        <Link
          href={basePath}
          className="absolute right-4 top-3 text-xs text-sky-600"
        >
          오늘로
        </Link>
      )}
    </div>
  );
}
