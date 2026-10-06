"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Workout = {
  id: string;
  title: string;
  shortTitle: string;
  image: string;
  accent: string;
};

const WORKOUTS: Workout[] = [
  { id: "posture", title: "Тренировка для осанки", shortTitle: "Осанка", image: "/posture-workout.png", accent: "#ff4f9a" },
  { id: "mobility", title: "Мобильность всего тела", shortTitle: "Мобильность", image: "/workout-mobility.png", accent: "#ffbb36" },
  { id: "hips", title: "Тазобедренные и таз", shortTitle: "Таз и бёдра", image: "/workout-hips.png", accent: "#49aef2" },
  { id: "abs", title: "Тренировка для пресса", shortTitle: "Пресс", image: "/workout-abs.png", accent: "#ff4f9a" },
  { id: "core", title: "Кор, поясница и ягодицы", shortTitle: "Кор и ягодицы", image: "/workout-core.png", accent: "#7666e8" },
  { id: "feet", title: "Стопы и голеностоп", shortTitle: "Стопы", image: "/workout-feet.png", accent: "#40b95f" },
  { id: "legs", title: "Ноги и колени", shortTitle: "Ноги и колени", image: "/workout-legs.png", accent: "#ffbb36" },
  { id: "shoulders", title: "Плечи и лопатки", shortTitle: "Плечи", image: "/workout-shoulders.png", accent: "#49aef2" },
  { id: "balance", title: "Баланс и координация", shortTitle: "Баланс", image: "/workout-balance.png", accent: "#40b95f" },
  { id: "arms", title: "Тренировка для рук", shortTitle: "Руки", image: "/workout-arms.png", accent: "#ff4f9a" },
];

const STORAGE_KEY = "workout-comic-order-v2";

export default function Home() {
  const [order, setOrder] = useState(() => WORKOUTS.map((workout) => workout.id));
  const [currentId, setCurrentId] = useState(WORKOUTS[0].id);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(false);
  const [scale, setScale] = useState(1);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  const orderedWorkouts = order
    .map((id) => WORKOUTS.find((workout) => workout.id === id))
    .filter((workout): workout is Workout => Boolean(workout));
  const currentIndex = Math.max(0, orderedWorkouts.findIndex((workout) => workout.id === currentId));
  const current = orderedWorkouts[currentIndex] ?? WORKOUTS[0];

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        if (parsed.length === WORKOUTS.length && WORKOUTS.every((workout) => parsed.includes(workout.id))) {
          setOrder(parsed);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  const turnTo = useCallback((index: number, direction: "next" | "previous") => {
    const total = orderedWorkouts.length;
    const wrappedIndex = (index + total) % total;
    setTurnDirection(direction);
    setCurrentId(orderedWorkouts[wrappedIndex].id);
    setScale(1);
  }, [orderedWorkouts]);

  const previous = () => turnTo(currentIndex - 1, "previous");
  const next = () => turnTo(currentIndex + 1, "next");

  const chooseWorkout = (id: string) => {
    const nextIndex = orderedWorkouts.findIndex((workout) => workout.id === id);
    turnTo(nextIndex, nextIndex >= currentIndex ? "next" : "previous");
    setLibraryOpen(false);
  };

  const moveWorkout = (id: string, offset: number) => {
    setOrder((currentOrder) => {
      const from = currentOrder.indexOf(id);
      const to = from + offset;
      if (to < 0 || to >= currentOrder.length) return currentOrder;
      const nextOrder = [...currentOrder];
      [nextOrder[from], nextOrder[to]] = [nextOrder[to], nextOrder[from]];
      return nextOrder;
    });
  };

  const resetOrder = () => setOrder(WORKOUTS.map((workout) => workout.id));

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!pointerStart.current || scale > 1) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(deltaX) > 52 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      deltaX < 0 ? next() : previous();
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) setScale((value) => value === 1 ? 2 : 1);
    lastTap.current = now;
  };

  return (
    <main className="app-shell">
      <header className="reader-header">
        <button className="library-button" type="button" onClick={() => setLibraryOpen(true)} aria-label="Выбрать тренировку">
          <span aria-hidden="true">▦</span>
          <span>Все</span>
        </button>
        <div className="title-block">
          <p>12–15 минут</p>
          <h1>{current.shortTitle}</h1>
        </div>
        <button
          className="zoom-button"
          type="button"
          onClick={() => setScale((value) => value === 1 ? 2 : 1)}
          aria-label={scale === 1 ? "Увеличить комикс" : "Уменьшить комикс"}
        >
          {scale === 1 ? "+" : "−"}
        </button>
      </header>

      <section
        className="reader"
        aria-label={`${current.title}. Страница ${currentIndex + 1} из ${orderedWorkouts.length}`}
        onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
        onClick={handleDoubleTap}
      >
        <div className={`page page-${turnDirection}`} key={current.id}>
          <img
            src={current.image}
            alt={`${current.title}: комикс с семью упражнениями`}
            draggable={false}
            style={{
              width: scale === 1 ? "100%" : `${scale * 100}%`,
              maxHeight: scale === 1 ? "calc(100dvh - 146px)" : "none",
            }}
          />
        </div>
      </section>

      <footer className="reader-footer">
        <button className="turn-button" type="button" onClick={previous} aria-label="Предыдущая тренировка">‹</button>
        <button className="page-status" type="button" onClick={() => setLibraryOpen(true)}>
          <span className="page-dots" aria-hidden="true">
            {orderedWorkouts.map((workout, index) => (
              <i key={workout.id} className={index === currentIndex ? "active" : ""} />
            ))}
          </span>
          <span>{currentIndex + 1} из {orderedWorkouts.length}</span>
        </button>
        <button className="turn-button" type="button" onClick={next} aria-label="Следующая тренировка">›</button>
      </footer>

      <div className={`library-backdrop ${libraryOpen ? "is-open" : ""}`} onClick={() => setLibraryOpen(false)} />
      <section className={`library-sheet ${libraryOpen ? "is-open" : ""}`} aria-hidden={!libraryOpen} aria-label="Все тренировки">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p>Моя книга</p>
            <h2>{editingOrder ? "Изменить порядок" : "Выбрать тренировку"}</h2>
          </div>
          <button type="button" onClick={() => setEditingOrder((value) => !value)}>
            {editingOrder ? "Готово" : "Порядок"}
          </button>
        </div>

        {editingOrder ? (
          <div className="reorder-list">
            {orderedWorkouts.map((workout, index) => (
              <article className="reorder-item" key={workout.id}>
                <span className="order-number" style={{ background: workout.accent }}>{index + 1}</span>
                <img src={workout.image} alt="" />
                <strong>{workout.shortTitle}</strong>
                <div className="reorder-actions">
                  <button type="button" onClick={() => moveWorkout(workout.id, -1)} disabled={index === 0} aria-label={`${workout.shortTitle}: выше`}>↑</button>
                  <button type="button" onClick={() => moveWorkout(workout.id, 1)} disabled={index === orderedWorkouts.length - 1} aria-label={`${workout.shortTitle}: ниже`}>↓</button>
                </div>
              </article>
            ))}
            <button className="reset-order" type="button" onClick={resetOrder}>Вернуть исходный порядок</button>
          </div>
        ) : (
          <div className="library-grid">
            {orderedWorkouts.map((workout, index) => (
              <button className={workout.id === current.id ? "selected" : ""} type="button" key={workout.id} onClick={() => chooseWorkout(workout.id)}>
                <span className="thumbnail-wrap">
                  <img src={workout.image} alt="" />
                  <i style={{ background: workout.accent }}>{index + 1}</i>
                </span>
                <strong>{workout.shortTitle}</strong>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
