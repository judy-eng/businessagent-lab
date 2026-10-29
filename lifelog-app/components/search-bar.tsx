// 검색창: 입력하면 검색 화면(/search)으로 이동한다. 자바스크립트 없이도 동작하는 일반 폼이다.
export function SearchBar({
  defaultValue = "",
  autoFocus = false,
  maxLength = 50,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  return (
    <form action="/search" method="get" role="search" className="flex gap-2">
      <label htmlFor="q" className="sr-only">
        과거 기록 검색
      </label>
      <div className="relative flex-1">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="5" />
          <path d="m11 11 3.5 3.5" />
        </svg>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          maxLength={maxLength}
          placeholder="감정, 일기, Todo, 일정, 루틴, 한 줄 검색"
          className="h-11 w-full rounded-full bg-zinc-100 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>
      <button
        type="submit"
        className="h-11 shrink-0 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white"
      >
        검색
      </button>
    </form>
  );
}
