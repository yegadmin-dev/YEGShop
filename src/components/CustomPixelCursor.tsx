import { useEffect, useRef, useState } from 'react';

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="file"]',
  'select',
  'label',
  '[data-cursor="pointer"]',
].join(',');

const TEXT_INPUT_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="color"])',
  'textarea',
  '[contenteditable="true"]',
].join(',');

export function CustomPixelCursor() {
  const [enabled, setEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cursorMode, setCursorMode] = useState<'arrow' | 'pointer' | 'text'>('arrow');
  const [isPressed, setIsPressed] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const coordsRef = useRef({ x: -120, y: -120 });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const finePointerMq = window.matchMedia('(pointer: fine) and (hover: hover)');
    const syncAvailability = () => {
      const active = finePointerMq.matches;
      setEnabled(active);
      if (!active) {
        visibleRef.current = false;
        setIsVisible(false);
        document.documentElement.classList.remove('yeg-custom-cursor-active');
      }
    };

    syncAvailability();
    finePointerMq.addEventListener('change', syncAvailability);

    return () => {
      finePointerMq.removeEventListener('change', syncAvailability);
      document.documentElement.classList.remove('yeg-custom-cursor-active');
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const applyPosition = (x: number, y: number) => {
      coordsRef.current.x = x;
      coordsRef.current.y = y;
      if (wrapperRef.current) {
        wrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const showCursor = (x: number, y: number, target: EventTarget | null) => {
      applyPosition(x, y);

      if (!visibleRef.current) {
        visibleRef.current = true;
        setIsVisible(true);
        document.documentElement.classList.add('yeg-custom-cursor-active');
      }

      const el = target instanceof Element ? target : null;
      const nextMode: 'arrow' | 'pointer' | 'text' = el?.closest(INTERACTIVE_SELECTOR)
        ? 'pointer'
        : el?.closest(TEXT_INPUT_SELECTOR)
        ? 'text'
        : 'arrow';

      setCursorMode((prev) => (prev === nextMode ? prev : nextMode));
    };

    const hideCursor = () => {
      if (visibleRef.current) {
        visibleRef.current = false;
        setIsVisible(false);
      }
      setIsPressed(false);
      document.documentElement.classList.remove('yeg-custom-cursor-active');
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      showCursor(e.clientX, e.clientY, e.target);
    };

    const handleMouseMove = (e: MouseEvent) => {
      showCursor(e.clientX, e.clientY, e.target);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      showCursor(e.clientX, e.clientY, e.target);
      setIsPressed(true);
    };

    const handlePointerUp = () => {
      setIsPressed(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) hideCursor();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
    window.addEventListener('blur', hideCursor);
    document.addEventListener('mouseleave', hideCursor);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', hideCursor);
      document.removeEventListener('mouseleave', hideCursor);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.documentElement.classList.remove('yeg-custom-cursor-active');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={`fixed top-0 left-0 z-[9999] pointer-events-none select-none no-print transition-opacity duration-75 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transform: `translate3d(${coordsRef.current.x}px, ${coordsRef.current.y}px, 0)`,
        willChange: 'transform',
      }}
    >
      <div
        className="transition-transform duration-100 ease-out origin-top-left"
        style={{
          transform: isPressed
            ? 'scale(0.86) translate3d(1px, 1px, 0)'
            : cursorMode === 'pointer'
            ? 'scale(1.06)'
            : 'scale(1)',
        }}
      >
        {cursorMode === 'arrow' && (
          /* 3D Isometric Extruded Pixel Arrow Pointer (YEG Brandmark Emerald + Blue) */
          <svg
            width="30"
            height="32"
            viewBox="0 0 32 34"
            fill="none"
            shapeRendering="crispEdges"
            className="drop-shadow-[0_4px_8px_rgba(6,21,14,0.28)]"
          >
            <defs>
              <linearGradient
                id="yegCursorDepth"
                x1="0"
                y1="0"
                x2="28"
                y2="30"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="52%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#065E46" />
              </linearGradient>
              <linearGradient
                id="yegCursorEdge"
                x1="0"
                y1="0"
                x2="26"
                y2="28"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>

            <path
              d="M4 5H6V7H8V9H10V11H12V13H14V15H16V17H18V19H20V21H14V25H16V29H18V32H14V30H12V26H10V23H8V27H6V29H4V5Z"
              fill="url(#yegCursorDepth)"
            />
            <path
              d="M1 1H3V3H5V5H7V7H9V9H11V11H13V13H15V15H17V17H19V19H12V23H14V27H16V30H12V28H10V24H8V21H5V24H3V26H1V1Z"
              fill="#06150E"
            />
            <path
              d="M1 1H3V3H5V5H7V7H9V9H11V11H13V13H15V15H17V17H19V18H16V16H14V14H12V12H10V10H8V8H6V6H4V4H2V25H1V1Z"
              fill="url(#yegCursorEdge)"
              fillOpacity="0.9"
            />
            <path
              d="M3 4L14 15L9 16L6 20L3 18V4Z"
              fill="#FFFFFF"
              fillOpacity="0.14"
            />
          </svg>
        )}

        {cursorMode === 'pointer' && (
          /* 3D Isometric Extruded Pixel Hand Pointer (Tip aligned near top-left) */
          <svg
            width="32"
            height="32"
            viewBox="0 0 34 34"
            fill="none"
            shapeRendering="crispEdges"
            className="drop-shadow-[0_6px_10px_rgba(2,132,199,0.3)] -translate-x-1 -translate-y-0.5"
          >
            <defs>
              <linearGradient
                id="yegHandDepth"
                x1="2"
                y1="2"
                x2="32"
                y2="32"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#065E46" />
              </linearGradient>
              <linearGradient
                id="yegHandRim"
                x1="2"
                y1="2"
                x2="28"
                y2="28"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#A7F3D0" />
                <stop offset="100%" stopColor="#7DD3FC" />
              </linearGradient>
            </defs>

            <path
              d="M6 4H10V6H12V8H14V10H16V8H20V10H24V12H28V14H30V24H28V28H24V31H14V29H10V27H6V23H4V19H8V17H10V15H8V13H6V11H4V6H6V4Z"
              fill="url(#yegHandDepth)"
            />
            <path
              d="M4 1H8V3H10V5H12V7H14V5H18V7H22V9H26V11H28V21H26V25H22V28H12V26H8V24H4V20H2V16H6V14H8V12H6V10H4V8H2V3H4V1Z"
              fill="#06150E"
            />
            <path
              d="M4 1H8V3H10V5H12V7H14V5H18V7H22V9H26V11H27V12H24V10H20V8H16V6H14V9H12V7H10V5H8V3H4V7H2V3H4V1Z"
              fill="url(#yegHandRim)"
              fillOpacity="0.92"
            />
            <rect x="13" y="8" width="2" height="5" fill="#10B981" fillOpacity="0.7" />
            <rect x="17" y="9" width="2" height="5" fill="#38BDF8" fillOpacity="0.7" />
            <rect x="21" y="10" width="2" height="5" fill="#10B981" fillOpacity="0.7" />
            <path
              d="M12 14H24V22L18 25H11L12 14Z"
              fill="#FFFFFF"
              fillOpacity="0.12"
            />
          </svg>
        )}

        {cursorMode === 'text' && (
          /* Crisp 3D Pixel I-Beam Caret for Inputs & Textarea */
          <svg
            width="20"
            height="26"
            viewBox="0 0 20 26"
            fill="none"
            shapeRendering="crispEdges"
            className="drop-shadow-[0_2px_6px_rgba(6,21,14,0.22)] -translate-x-2.5 -translate-y-3"
          >
            <path
              d="M5 3H15V6H12V20H15V23H5V20H8V6H5V3Z"
              fill="#10B981"
              transform="translate(2 2)"
            />
            <path
              d="M4 2H14V5H11V19H14V22H4V19H7V5H4V2Z"
              fill="#06150E"
            />
            <rect x="4" y="2" width="10" height="2" fill="#0284C7" />
          </svg>
        )}
      </div>
    </div>
  );
}
