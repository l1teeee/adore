"use client";

import { useEffect, useRef } from "react";
import { layoutWordMask } from "@/lib/glyph-field/font-5x7";
import { createGlyphPool } from "@/lib/glyph-field/glyphs";
import { ANTIQUE_PALETTES, paletteAt, toCssColor } from "@/lib/glyph-field/palettes";
import { createRandom } from "@/lib/glyph-field/random";
import { revealStateAt } from "@/lib/glyph-field/timeline";
import type { RevealPhase } from "@/lib/glyph-field/timeline";
import { computeLayout, createDotSprite, renderFrame, renderStripeMasks, tintMask } from "@/components/glyph-field/glyph-field-renderer";
import type { GlyphFieldLayout, GlyphFieldPalette } from "@/components/glyph-field/glyph-field-renderer";

const TICK_MS = 150;
const CHANGE_PROBABILITY = 0.3;
const VISIBLE_CELL_RATIO = 0.25;

export type GlyphFieldProps = {
  words?: readonly string[];
  cellWidth: number;
  cellHeight: number;
  minColumns?: number;
  className?: string;
};

function isMaskCellActive(phase: RevealPhase, progress: number, threshold: number): boolean {
  if (phase === "hold") {
    return true;
  }
  if (phase === "forming") {
    return progress >= threshold;
  }
  if (phase === "dissolve") {
    return progress < 1 - threshold;
  }
  return false;
}

export default function GlyphField({ words = [], cellWidth, cellHeight, minColumns = 1, className }: GlyphFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsKey = words.join("\u0000");

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    const wordList = wordsKey ? wordsKey.split("\u0000") : [];
    const pool = createGlyphPool(512, 20261120);
    const glyphIndices: number[] = [];
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].some((row) => row !== 0)) {
        glyphIndices.push(i);
      }
    }
    if (glyphIndices.length === 0) {
      throw new Error("Glyph pool has no visible glyphs");
    }
    const random = createRandom(42);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let layout: GlyphFieldLayout | null = null;
    let stripeMasks: { stripeA: HTMLCanvasElement; stripeB: HTMLCanvasElement };
    let stripeA: HTMLCanvasElement;
    let stripeB: HTMLCanvasElement;
    let sprite: HTMLCanvasElement;
    let colorKey = "";
    let glyphs = new Uint16Array(0);
    let cellVisible = new Uint8Array(0);
    let masks: { cells: readonly number[] | null; thresholds: number[] }[] = [];
    let elapsed = 0;
    let lastTick = 0;
    let lastFrame: number | null = null;
    let frame: number | null = null;
    let intersecting = true;
    let dirty = true;

    function draw() {
      if (!layout) {
        return;
      }
      const visibleCells = new Uint8Array(cellVisible);
      if (masks.length) {
        const state = revealStateAt(elapsed);
        const mask = masks[media.matches ? 0 : state.cycle % masks.length];
        mask.cells?.forEach((cell, index) => {
          const threshold = mask.thresholds[index];
          if (media.matches || isMaskCellActive(state.phase, state.progress, threshold)) {
            visibleCells[cell] = 1;
          }
        });
      }
      const colors = media.matches ? ANTIQUE_PALETTES[0] : paletteAt(elapsed, ANTIQUE_PALETTES);
      const palette: GlyphFieldPalette = {
        background: toCssColor(colors.background),
        stripeA: toCssColor(colors.stripeA),
        stripeB: toCssColor(colors.stripeB),
        dot: toCssColor(colors.dot),
      };
      const nextKey = [palette.background, palette.stripeA, palette.stripeB, palette.dot].join("|");
      if (nextKey !== colorKey) {
        tintMask(stripeMasks.stripeA, stripeA, palette.stripeA);
        tintMask(stripeMasks.stripeB, stripeB, palette.stripeB);
        sprite = createDotSprite(layout, palette.dot);
        colorKey = nextKey;
      }
      renderFrame(context, layout, palette.background, stripeA, stripeB, sprite, pool, glyphs, visibleCells);
      dirty = false;
    }
    function animate(time: number) {
      frame = null;
      if (lastFrame !== null) {
        elapsed += Math.min(time - lastFrame, 100);
      }
      lastFrame = time;
      while (elapsed - lastTick >= TICK_MS) {
        lastTick += TICK_MS;
        for (let i = 0; i < glyphs.length; i++) {
          if (random() < CHANGE_PROBABILITY) {
            glyphs[i] = glyphIndices[Math.floor(random() * glyphIndices.length)];
            cellVisible[i] = random() < VISIBLE_CELL_RATIO ? 1 : 0;
          }
        }
        dirty = true;
      }
      if (dirty) {
        draw();
      }
      frame = requestAnimationFrame(animate);
    }
    function updateLoop() {
      const running = !media.matches && intersecting && document.visibilityState !== "hidden" && layout !== null;
      if (running && frame === null) {
        frame = requestAnimationFrame(animate);
      }
      if (!running && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
        lastFrame = null;
      }
    }
    function setup(width: number, height: number) {
      if (!width || !height) {
        return;
      }
      const style = getComputedStyle(root);
      const padding = {
        top: parseFloat(style.paddingTop),
        right: parseFloat(style.paddingRight),
        bottom: parseFloat(style.paddingBottom),
        left: parseFloat(style.paddingLeft),
      };
      layout = computeLayout(width, height, padding, cellWidth, cellHeight, minColumns, window.devicePixelRatio);
      canvas.width = Math.round(width * layout.dpr);
      canvas.height = Math.round(height * layout.dpr);
      stripeMasks = renderStripeMasks(layout, 7);
      stripeA = document.createElement("canvas");
      stripeB = document.createElement("canvas");
      stripeA.width = stripeB.width = canvas.width;
      stripeA.height = stripeB.height = canvas.height;
      colorKey = "";
      glyphs = new Uint16Array(layout.columns * layout.rows);
      cellVisible = new Uint8Array(glyphs.length);
      for (let i = 0; i < glyphs.length; i++) {
        glyphs[i] = glyphIndices[Math.floor(random() * glyphIndices.length)];
        cellVisible[i] = random() < VISIBLE_CELL_RATIO ? 1 : 0;
      }
      masks = wordList.map((word, index) => {
        const cells = layoutWordMask(word, layout!.columns, layout!.rows);
        const thresholdRandom = createRandom(101 + index);
        return { cells, thresholds: cells?.map(() => thresholdRandom()) ?? [] };
      });
      dirty = true;
      draw();
      updateLoop();
    }
    function updateMode() {
      setup(root.clientWidth, root.clientHeight);
      updateLoop();
    }
    const resizeObserver = new ResizeObserver(() => {
      setup(root.clientWidth, root.clientHeight);
    });
    const intersectionObserver = new IntersectionObserver((entries) => {
      intersecting = entries[0].isIntersecting;
      updateLoop();
    });
    resizeObserver.observe(root);
    intersectionObserver.observe(root);
    document.addEventListener("visibilitychange", updateLoop);
    media.addEventListener("change", updateMode);
    updateMode();
    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", updateLoop);
      media.removeEventListener("change", updateMode);
    };
  }, [cellWidth, cellHeight, minColumns, wordsKey]);

  return (
    <div ref={rootRef} className={`relative overflow-hidden${className ? ` ${className}` : ""}`}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
