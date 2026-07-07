"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { cn } from "@repo/ui/lib/utils";
import { useFocusMode } from "@/hooks/useFocusMode";

/* ─────────────────────────────── Data ─────────────────────────────── */

import {
  POS_STORAGE_KEY,
  DRAG_THRESHOLD,
  OUTER_ITEMS,
  INNER_ITEMS,
  clampDockPosition,
  DockPosition,
} from "./constants";
import { WheelItem, getAngle } from "./sub-components";
export function BottomWidgetBar({
  isMerged = false,
  dockPosition = isMerged ? "top-center" : "bottom",
}: {
  isMerged?: boolean;
  dockPosition?: "bottom" | "top-right" | "top-center" | "left-center";
}) {
  const { enabled: isFocusMode } = useFocusMode();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isTopMerged =
    dockPosition === "top-center" || dockPosition === "top-right";
  const isLeftDocked = dockPosition === "left-center";
  const isFloating = dockPosition === "bottom";

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  /* Close when route changes */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  /* Click outside to close */
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dock-root]")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  /* Keyboard shortcut */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ── Drag state ── */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<DockPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const suppressNextClick = useRef(false);

  /* Load saved position */
  useEffect(() => {
    if (!isFloating) return;
    try {
      const raw = window.localStorage.getItem(POS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as DockPosition;
        setPos(clampDockPosition(saved));
      }
    } catch {
      /* ignore */
    }
  }, [isFloating]);

  /* Clamp on resize */
  useEffect(() => {
    if (!isFloating) return;
    const onResize = () => {
      setPos((prev) => (prev ? clampDockPosition(prev) : null));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isFloating]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      suppressNextClick.current = false;

      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const grabX = e.clientX - (rect.left + rect.width / 2);
      const grabY = e.clientY - (rect.top + rect.height / 2);
      let hasMoved = false;

      setIsDragging(true);

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - e.clientX;
        const dy = ev.clientY - e.clientY;
        if (
          !hasMoved &&
          (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
        ) {
          hasMoved = true;
          setIsOpen(false); // close wheel when drag starts
        }
        if (hasMoved) {
          setPos(
            clampDockPosition({
              x: ev.clientX - grabX,
              y: ev.clientY - grabY,
            }),
          );
        }
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setIsDragging(false);
        if (hasMoved) {
          suppressNextClick.current = true;
          setPos((prev) => {
            if (prev) {
              window.localStorage.setItem(
                POS_STORAGE_KEY,
                JSON.stringify(prev),
              );
            }
            return prev;
          });
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [setIsOpen],
  );

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (suppressNextClick.current) {
      e.stopPropagation();
      suppressNextClick.current = false;
    }
  }, []);

  const outerRadius = 150;
  const innerRadius = 82;

  const wrapperStyle =
    isFloating && pos
      ? ({
          left: pos.x,
          top: pos.y,
          transform: "translate(-50%, -50%)",
        } as React.CSSProperties)
      : undefined;

  return (
    <div
      ref={wrapperRef}
      data-dock-root
      onPointerDown={isFloating ? handlePointerDown : undefined}
      onClickCapture={handleClickCapture}
      className={cn(
        isLeftDocked
          ? "fixed left-4 top-1/2 -translate-y-1/2 z-50 flex items-center"
          : isTopMerged
            ? "relative flex items-center z-50"
            : "fixed z-50 hidden md:flex items-end gap-3",
        isFloating &&
          (pos
            ? "touch-none select-none"
            : "bottom-0 left-1/2 -translate-x-1/2"),
        isFloating && isDragging && "cursor-grabbing scale-105",
        isFloating && pos && !isDragging && "cursor-grab",
      )}
      style={isFloating ? wrapperStyle : undefined}
    >
      {/* ── Arch bubble + radial wheel ── */}
      <div className="relative flex flex-col items-center">
        {/* Trigger strip when closed */}
        {isFloating && (
          <div
            className={cn(
              "mb-3 h-1 w-20 rounded-full bg-black/15 transition-opacity duration-300",
              isOpen ? "opacity-0" : "opacity-100",
            )}
          />
        )}

        {/* Bubble button */}
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          aria-label={isOpen ? "Close dock" : "Open dock"}
          aria-expanded={isOpen}
          className={cn(
            isTopMerged
              ? "relative flex items-center justify-center w-8 h-8 rounded-full bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.05] transition-all duration-200"
              : isLeftDocked
                ? "relative flex items-center justify-center w-12 h-12 rounded-full liquid-glass-light border border-white/40 shadow-window hover:bg-white/90 active:scale-[0.97] transition-all duration-200"
                : "relative flex items-center justify-center w-14 h-14 rounded-full liquid-glass-light border border-white/40 shadow-window hover:bg-white/90 active:scale-[0.97] transition-all duration-200 translate-y-7",
            isOpen &&
              (isTopMerged
                ? "ring-2 ring-[var(--accent-blue)]/30 bg-black/[0.06]"
                : "ring-2 ring-[var(--accent-blue)]/30 bg-white/90"),
          )}
        >
          <Image
            src={isFocusMode ? "/assets/logo-focused.jpeg" : "/assets/logo.png"}
            alt="Arch"
            width={isTopMerged ? 18 : 28}
            height={isTopMerged ? 18 : 28}
            className={cn(
              isTopMerged ? "w-4.5 h-4.5" : "w-7 h-7",
              "object-contain pointer-events-none select-none",
            )}
            draggable={false}
          />

          {/* ── Radial wheel items ── */}
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Outer ring: Hub + departments + Admin */}
                {OUTER_ITEMS.map((item, i) => {
                  const angle = getAngle(i, OUTER_ITEMS.length, dockPosition);
                  const isActive = pathname
                    ? item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)
                    : false;
                  const radius = isLeftDocked
                    ? i % 2 === 0
                      ? 145
                      : 180
                    : outerRadius;
                  return (
                    <WheelItem
                      key={item.href}
                      item={item}
                      angle={angle}
                      radius={radius}
                      index={i}
                      isActive={isActive}
                      onNavigate={close}
                      side={isLeftDocked ? "right" : "top"}
                    />
                  );
                })}

                {/* Inner ring: Operations, Tools, n8n */}
                {INNER_ITEMS.map((item, i) => {
                  const angle = getAngle(i, INNER_ITEMS.length, dockPosition);
                  const radius = isLeftDocked
                    ? i % 2 === 0
                      ? 82
                      : 108
                    : innerRadius;
                  return (
                    <WheelItem
                      key={item.label}
                      item={item}
                      angle={angle}
                      radius={radius}
                      index={OUTER_ITEMS.length + i}
                      isActive={false}
                      onNavigate={close}
                      side={isLeftDocked ? "right" : "top"}
                    />
                  );
                })}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
