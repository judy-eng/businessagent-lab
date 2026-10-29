"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo } from "@/lib/queries";
import {
  addTodo,
  deleteTodo,
  renameTodo,
  reorderTodos,
  toggleTodo,
} from "./actions";

type Change =
  | { type: "add"; todo: Todo }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "rename"; id: string; title: string }
  | { type: "remove"; id: string }
  | { type: "reorder"; ids: string[] };

function applyChange(state: Todo[], change: Change): Todo[] {
  switch (change.type) {
    case "add":
      return [...state, change.todo];
    case "toggle":
      return state.map((t) => (t.id === change.id ? { ...t, done: change.done } : t));
    case "rename":
      return state.map((t) => (t.id === change.id ? { ...t, title: change.title } : t));
    case "remove":
      return state.filter((t) => t.id !== change.id);
    case "reorder": {
      const byId = new Map(state.map((t) => [t.id, t]));
      return change.ids.map((id) => byId.get(id)).filter((t): t is Todo => !!t);
    }
  }
}

function TodoRow({
  todo,
  onToggle,
  onRename,
  onRemove,
}: {
  todo: Todo;
  onToggle: (done: boolean) => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const [editing, setEditing] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl bg-violet-100/70 px-3 py-3 ${
        isDragging ? "relative z-10 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="끌어서 순서 바꾸기"
        className="cursor-grab touch-none px-1 text-lg leading-none text-zinc-400 active:cursor-grabbing"
      >
        ⋮⋮
      </button>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`${todo.title} 완료`}
        className="h-5 w-5 shrink-0 accent-violet-600"
      />
      {editing ? (
        <input
          autoFocus
          defaultValue={todo.title}
          maxLength={200}
          onBlur={(e) => {
            const next = e.target.value.trim();
            setEditing(false);
            if (next && next !== todo.title) onRename(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`min-w-0 flex-1 truncate text-left ${
            todo.done ? "text-zinc-400 line-through" : ""
          }`}
        >
          {todo.title}
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${todo.title} 삭제`}
        className="px-1 text-zinc-400 hover:text-red-500"
      >
        ✕
      </button>
    </li>
  );
}

export function TodoList({ date, todos }: { date: string; todos: Todo[] }) {
  const [items, applyOptimistic] = useOptimistic(todos, applyChange);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function run(change: Change, action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      try {
        await action();
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    const ids = arrayMove(items, oldIndex, newIndex).map((t) => t.id);
    run({ type: "reorder", ids }, () => reorderTodos(date, ids));
  }

  function onAdd(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    formRef.current?.reset();
    run(
      {
        type: "add",
        todo: {
          id: crypto.randomUUID(),
          date,
          title,
          done: false,
          sort_order: items.length,
        },
      },
      () => addTodo(date, title),
    );
  }

  const doneCount = items.filter((t) => t.done).length;

  return (
    <section className="mt-6">
      <p className="mb-3 text-sm text-zinc-500">
        {items.length === 0 ? "할 일이 없어요" : `${doneCount} / ${items.length} 완료`}
      </p>

      <DndContext
        id="todo-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {items.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={(done) =>
                  run({ type: "toggle", id: todo.id, done }, () =>
                    toggleTodo(todo.id, done),
                  )
                }
                onRename={(title) =>
                  run({ type: "rename", id: todo.id, title }, () =>
                    renameTodo(todo.id, title),
                  )
                }
                onRemove={() =>
                  run({ type: "remove", id: todo.id }, () => deleteTodo(todo.id))
                }
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <form ref={formRef} action={onAdd} className="mt-4 flex gap-2">
        <input
          name="title"
          maxLength={200}
          placeholder="할 일 추가"
          aria-label="할 일 추가"
          className="h-12 min-w-0 flex-1 rounded-2xl bg-zinc-100 px-4 outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button
          type="submit"
          className="h-12 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          추가
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
