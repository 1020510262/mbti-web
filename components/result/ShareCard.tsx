"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";

interface ShareCardProps {
  type: string;
  title: string;
  summary: string;
}

export function ShareCard({ type, title, summary }: ShareCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!ref.current) return;
    setDownloading(true);
    let captureNode: HTMLDivElement | null = null;
    try {
      // Clone to an offscreen node so screenshot size is stable and won't be clipped by viewport/layout state.
      captureNode = ref.current.cloneNode(true) as HTMLDivElement;
      captureNode.style.position = "fixed";
      captureNode.style.left = "-99999px";
      captureNode.style.top = "0";
      captureNode.style.width = "720px";
      captureNode.style.maxWidth = "720px";
      captureNode.style.overflow = "visible";
      captureNode.style.transform = "none";
      captureNode.style.opacity = "1";
      document.body.appendChild(captureNode);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      const canvas = await html2canvas(captureNode, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        width: captureNode.scrollWidth,
        height: captureNode.scrollHeight,
        windowWidth: captureNode.scrollWidth,
        windowHeight: captureNode.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `MBTI-${type}.png`;
      link.click();
    } finally {
      if (captureNode && captureNode.parentNode) {
        captureNode.parentNode.removeChild(captureNode);
      }
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-white/70 bg-[radial-gradient(circle_at_top_left,#f472b6_0%,#7dd3fc_42%,#fff8ed_100%)] p-6 shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
      >
        <div className="absolute -right-9 -top-9 h-24 w-24 rounded-full bg-white/45" />
        <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-sky-100/70" />
        <p className="text-sm text-slate-700">我的MBTI测试结果</p>
        <h3 className="mt-2 text-4xl font-black text-slate-900">{type}</h3>
        <p className="mt-1 text-lg font-semibold text-slate-700">{title}</p>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{summary}</p>
        <div className="mt-5 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
          MBTI FUN TEST 2026
        </div>
      </motion.div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {downloading ? "正在生成图片..." : "下载结果图"}
      </button>
    </div>
  );
}
