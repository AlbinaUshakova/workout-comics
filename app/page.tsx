"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Workout = {
  id: string;
  title: string;
  shortTitle: string;
  image: string;
  accent: string;
};

type DragState = { id: string; x: number; y: number };
type Point = { x: number; y: number };

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
const READER_HINT_KEY = "workout-comic-reader-hint-v1";

export default function Home() {
  const [order, setOrder] = useState(() => {
    const fallback = WORKOUTS.map((workout) => workout.id);
    if (typeof window === "undefined") return fallback;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    try {
      const parsed = JSON.parse(saved) as string[];
      return parsed.length === WORKOUTS.length && WORKOUTS.every((workout) => parsed.includes(workout.id)) ? parsed : fallback;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return fallback;
    }
  });
  const [currentId, setCurrentId] = useState(WORKOUTS[0].id);
  const [view, setView] = useState<"library" | "reader">("library");
  const [editingOrder, setEditingOrder] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [showReaderHint, setShowReaderHint] = useState(false);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");
  const readerRef = useRef<HTMLElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const activePointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const gestureMoved = useRef(false);
  const wasPinching = useRef(false);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | null>(null);

  const orderedWorkouts = order
    .map((id) => WORKOUTS.find((workout) => workout.id === id))
    .filter((workout): workout is Workout => Boolean(workout));
  const currentIndex = Math.max(0, orderedWorkouts.findIndex((workout) => workout.id === currentId));
  const current = orderedWorkouts[currentIndex] ?? WORKOUTS[0];
  const draggedWorkout = drag ? WORKOUTS.find((workout) => workout.id === drag.id) : null;

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
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
    setChromeHidden(false);
    readerRef.current?.scrollTo({ left: 0, top: 0 });
  }, [orderedWorkouts]);

  const previous = () => turnTo(currentIndex - 1, "previous");
  const next = () => turnTo(currentIndex + 1, "next");

  const chooseWorkout = (id: string) => {
    const nextIndex = orderedWorkouts.findIndex((workout) => workout.id === id);
    turnTo(nextIndex, nextIndex >= currentIndex ? "next" : "previous");
    setView("reader");
    if (!window.localStorage.getItem(READER_HINT_KEY)) {
      setShowReaderHint(true);
      window.localStorage.setItem(READER_HINT_KEY, "seen");
      window.setTimeout(() => setShowReaderHint(false), 5200);
    }
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id, x: event.clientX, y: event.clientY });
    setDropTargetId(null);
  };

  const updateDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    setDrag({ ...drag, x: event.clientX, y: event.clientY });
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-workout-id]") as HTMLElement | null;
    const targetId = target?.dataset.workoutId;
    if (!targetId || targetId === drag.id) return;
    setDropTargetId(targetId);

    setOrder((currentOrder) => {
      const from = currentOrder.indexOf(drag.id);
      const to = currentOrder.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return currentOrder;
      const nextOrder = [...currentOrder];
      nextOrder.splice(from, 1);
      nextOrder.splice(to, 0, drag.id);
      return nextOrder;
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDrag(null);
    setDropTargetId(null);
  };

  const resetOrder = () => setOrder(WORKOUTS.map((workout) => workout.id));

  const distanceBetween = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

  const handleReaderPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureMoved.current = false;

    if (activePointers.current.size === 1) {
      pointerStart.current = { x: event.clientX, y: event.clientY };
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        left: event.currentTarget.scrollLeft,
        top: event.currentTarget.scrollTop,
      };
    } else if (activePointers.current.size === 2) {
      const points = [...activePointers.current.values()];
      pinchStart.current = { distance: distanceBetween(points), scale };
      pointerStart.current = null;
      wasPinching.current = true;
      setShowReaderHint(false);
    }
  };

  const handleReaderPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!activePointers.current.has(event.pointerId)) return;
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.current.size >= 2 && pinchStart.current) {
      const nextScale = Math.min(3.5, Math.max(1, pinchStart.current.scale * distanceBetween([...activePointers.current.values()]) / pinchStart.current.distance));
      setScale(nextScale);
      gestureMoved.current = true;
      return;
    }

    if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 7) {
      gestureMoved.current = true;
    }

    if (scale > 1 && panStart.current) {
      event.currentTarget.scrollLeft = panStart.current.left - (event.clientX - panStart.current.x);
      event.currentTarget.scrollTop = panStart.current.top - (event.clientY - panStart.current.y);
    }
  };

  const handleReaderPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    const pinched = wasPinching.current;
    activePointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size === 0) {
      panStart.current = null;
      wasPinching.current = false;
      pointerStart.current = null;
    }

    if (!start || scale > 1 || pinched) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) > 52 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0) next();
      else previous();
    }
  };

  const resetZoom = () => {
    setScale(1);
    readerRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  };

  const toggleZoom = () => scale > 1 ? resetZoom() : setScale(2.25);

  const handleReaderTap = () => {
    if (gestureMoved.current) {
      gestureMoved.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      toggleZoom();
      setShowReaderHint(false);
    } else {
      tapTimer.current = window.setTimeout(() => {
        setChromeHidden((value) => !value);
        setShowReaderHint(false);
      }, 320);
    }
    lastTap.current = now;
  };

  if (view === "library") {
    return (
      <main className="library-home">
        <header className="library-header">
          <div>
            <p>12–15 минут в день</p>
            <h1>Моя книга тренировок</h1>
            <span>{editingOrder ? "Зажмите ручку и перемещайте тренировку" : "Выберите, что хотите сделать сегодня"}</span>
          </div>
          <button type="button" onClick={() => { setEditingOrder((value) => !value); setDrag(null); setDropTargetId(null); }}>
            {editingOrder ? "Готово" : "Порядок"}
          </button>
        </header>

        {editingOrder ? (
          <section className="reorder-page" aria-label="Изменить порядок тренировок">
            <div className="drag-tip"><span aria-hidden="true">≡</span> Тяните карточку за ручку справа</div>
            <div className="reorder-list">
              {orderedWorkouts.map((workout, index) => (
                <article
                  className={`reorder-item ${drag?.id === workout.id ? "is-dragging" : ""} ${dropTargetId === workout.id ? "is-drop-target" : ""}`}
                  key={workout.id}
                  data-workout-id={workout.id}
                >
                  <span className="order-number" style={{ background: workout.accent }}>{index + 1}</span>
                  <img src={workout.image} alt="" />
                  <strong>{workout.shortTitle}</strong>
                  <button
                    className="drag-handle"
                    type="button"
                    aria-label={`Перетащить: ${workout.shortTitle}`}
                    onPointerDown={(event) => startDrag(event, workout.id)}
                    onPointerMove={updateDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <span aria-hidden="true">≡</span>
                  </button>
                </article>
              ))}
            </div>
            <button className="reset-order" type="button" onClick={resetOrder}>Вернуть исходный порядок</button>
          </section>
        ) : (
          <section className="library-grid" aria-label="Все тренировки">
            {orderedWorkouts.map((workout, index) => (
              <button type="button" key={workout.id} onClick={() => chooseWorkout(workout.id)}>
                <span className="thumbnail-wrap">
                  <img src={workout.image} alt="" />
                  <i style={{ background: workout.accent }}>{index + 1}</i>
                </span>
                <span className="card-copy">
                  <strong>{workout.shortTitle}</strong>
                  <small>7 упражнений</small>
                </span>
              </button>
            ))}
          </section>
        )}

        {drag && draggedWorkout && (
          <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
            <img src={draggedWorkout.image} alt="" />
            <strong>{draggedWorkout.shortTitle}</strong>
            <span>≡</span>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={`app-shell ${chromeHidden ? "chrome-hidden" : ""} ${scale > 1 ? "is-zoomed" : ""}`}>
      <header className="reader-header">
        <button className="library-button" type="button" onClick={() => setView("library")} aria-label="Все тренировки">
          <span aria-hidden="true">▦</span><span>Все</span>
        </button>
        <div className="title-block"><p>12–15 минут</p><h1>{current.shortTitle}</h1></div>
        <button className="zoom-button" type="button" onClick={toggleZoom} aria-label={scale === 1 ? "Увеличить комикс" : "Уменьшить комикс"}>
          {scale === 1 ? "+" : "−"}
        </button>
      </header>

      <div
        ref={readerRef}
        className="reader"
        role="button"
        tabIndex={0}
        aria-label={`${current.title}. Страница ${currentIndex + 1} из ${orderedWorkouts.length}`}
        onPointerDown={handleReaderPointerDown}
        onPointerMove={handleReaderPointerMove}
        onPointerUp={handleReaderPointerUp}
        onPointerCancel={handleReaderPointerUp}
        onClick={handleReaderTap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setChromeHidden((value) => !value);
          }
          if (event.key === "+" || event.key === "=") setScale((value) => Math.min(3.5, value + .5));
          if (event.key === "-") setScale((value) => Math.max(1, value - .5));
          if (event.key === "ArrowRight" && scale === 1) next();
          if (event.key === "ArrowLeft" && scale === 1) previous();
        }}
      >
        <div className={`page page-${turnDirection} ${scale > 1 ? "page-zoomed" : ""}`} key={current.id}>
          <img
            src={current.image}
            alt={`${current.title}: комикс с семью упражнениями`}
            draggable={false}
            style={{ width: `${scale * 100}%`, maxHeight: scale === 1 ? "calc(100dvh - 146px)" : "none" }}
          />
        </div>
        {showReaderHint && (
          <div className="reader-hint" role="status">
            <strong>Управление комиксом</strong>
            <span>Листайте в стороны · увеличивайте двумя пальцами</span>
            <span>Одно касание — во весь экран</span>
          </div>
        )}
      </div>

      <footer className="reader-footer">
        <button className="turn-button" type="button" onClick={previous} aria-label="Предыдущая тренировка">‹</button>
        <button className="page-status" type="button" onClick={() => setView("library")}>
          <span className="page-dots" aria-hidden="true">
            {orderedWorkouts.map((workout, index) => <i key={workout.id} className={index === currentIndex ? "active" : ""} />)}
          </span>
          <span>{currentIndex + 1} из {orderedWorkouts.length}</span>
        </button>
        <button className="turn-button" type="button" onClick={next} aria-label="Следующая тренировка">›</button>
      </footer>
    </main>
  );
}
