"use client";

import { useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function Home() {
  const [scale, setScale] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const lastTap = useRef(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const hintTimer = window.setTimeout(() => setShowHint(false), 4200);
    return () => window.clearTimeout(hintTimer);
  }, []);

  const changeScale = (nextScale: number) => {
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
    setControlsVisible(true);
  };

  const handleComicTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      changeScale(scale === 1 ? 2 : 1);
    } else {
      window.setTimeout(() => {
        if (Date.now() - lastTap.current >= 300) {
          setControlsVisible((visible) => !visible);
        }
      }, 310);
    }
    lastTap.current = now;
  };

  const enterFullscreen = async () => {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen().catch(() => undefined);
    } else if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
  };

  return (
    <main className="viewer" aria-label="Ежедневная тренировка для осанки">
      <button
        className="comic-stage"
        type="button"
        onClick={handleComicTap}
        aria-label="Показать или скрыть управление. Двойное нажатие увеличивает изображение"
      >
        <img
          className="comic"
          src="/posture-workout.png"
          alt="Комикс с ежедневной тренировкой для осанки: семь упражнений на 12–15 минут"
          draggable={false}
          style={{ transform: `scale(${scale})` }}
        />
      </button>

      <header className={`topbar ${controlsVisible ? "is-visible" : ""}`}>
        <div>
          <p className="eyebrow">12–15 минут</p>
          <h1>Тренировка для осанки</h1>
        </div>
        <button className="round-button" type="button" onClick={enterFullscreen} aria-label="На весь экран">
          <span aria-hidden="true">⛶</span>
        </button>
      </header>

      <nav className={`controls ${controlsVisible ? "is-visible" : ""}`} aria-label="Масштаб изображения">
        <button type="button" onClick={() => changeScale(scale - 0.5)} disabled={scale <= MIN_SCALE} aria-label="Уменьшить">
          −
        </button>
        <button className="scale-label" type="button" onClick={() => changeScale(1)} aria-label="Вернуть исходный масштаб">
          {Math.round(scale * 100)}%
        </button>
        <button type="button" onClick={() => changeScale(scale + 0.5)} disabled={scale >= MAX_SCALE} aria-label="Увеличить">
          +
        </button>
      </nav>

      <div className={`hint ${showHint ? "is-visible" : ""}`} role="status">
        Двойное нажатие — увеличить · одно — скрыть кнопки
      </div>
    </main>
  );
}
