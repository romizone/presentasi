"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { LayoutIR } from "../../archetypes/layout-types";
import { LayoutNodeView } from "./LayoutNodeView";

export function SlideCanvas({ layout }: { layout: LayoutIR }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const nodes = [...layout.nodes].sort((a, b) => a.zIndex - b.zIndex);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setBox({
        w: Math.max(0, rect.width),
        h: Math.max(0, rect.height),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale =
    box.w > 0 && box.h > 0
      ? Math.min(box.w / layout.slideWidth, box.h / layout.slideHeight)
      : 0;

  return (
    <div className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div ref={measureRef} className="pointer-events-none absolute inset-0" />
      {scale > 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative overflow-hidden font-sans antialiased"
            style={{
              width: layout.slideWidth * scale,
              height: layout.slideHeight * scale,
              background: layout.backgroundGradient
                ? `linear-gradient(${layout.backgroundGradient.angle}deg, ${layout.backgroundGradient.stops
                    .map((stop) => `${stop.color} ${stop.at * 100}%`)
                    .join(", ")})`
                : layout.background,
              flex: "0 0 auto",
              fontFamily:
                'var(--font-source-sans), "Source Sans 3", Arial, sans-serif',
            }}
          >
            {nodes.map((node) => (
              <LayoutNodeView key={node.id} node={node} pxPerInch={scale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
