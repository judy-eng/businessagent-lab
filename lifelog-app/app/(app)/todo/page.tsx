import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import { getTodos, resolveDate } from "@/lib/queries";
import { TodoList } from "./todo-list";

async function TodoContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date, today } = await resolveDate((await searchParams).date);
  const todos = await getTodos(date);
  return (
    <>
      <DateNav basePath="/todo" date={date} today={today} />
      <TodoList key={date} date={date} todos={todos} />
    </>
  );
}

export default function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <TodoContent searchParams={searchParams} />
    </Suspense>
  );
}
