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
  const [opening, setOpening] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadHint, setDownloadHint] = useState("");

  const captureAsBlob = async (): Promise<Blob> => {
    if (!ref.current) throw new Error("share card not ready");
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

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        throw new Error("canvas blob generation failed");
      }
      return blob;
    } finally {
      if (captureNode && captureNode.parentNode) {
        captureNode.parentNode.removeChild(captureNode);
      }
    }
  };

  const handleDownload = async () => {
    if (!ref.current) return;
    setDownloading(true);
    setDownloadError("");
    setDownloadHint("");
    let objectUrl = "";
    let popup: Window | null = null;
    try {
      const blob = await captureAsBlob();
      objectUrl = URL.createObjectURL(blob);
      const filename = `MBTI-${type}.png`;
      // Keep a popup handle created by user interaction to avoid async popup blocking on some browsers.
      popup = window.open("", "_blank", "noopener,noreferrer");

      // Fix iOS Safari download issue: prefer native share sheet; fallback to opening image in new tab for long-press save.
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
          return;
        }
        if (popup) {
          popup.location.href = objectUrl;
        } else {
          window.open(objectUrl, "_blank", "noopener,noreferrer");
        }
        setDownloadHint("已在新页面打开图片，请长按图片后选择“存储到照片”。");
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Delay URL revoke to avoid race where some browsers cancel download if revoked too early.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
      if (popup && !popup.closed) {
        popup.close();
      }
    } catch (error) {
      // Fix Bug #2: explicit error handling with user-visible feedback.
      console.error("[share-card] download failed", error);
      setDownloadError("生成图片失败，请稍后重试或直接截图保存。");
      if (typeof window !== "undefined") {
        window.alert("生成图片失败，请稍后重试或直接截图保存。");
      }
      if (popup && !popup.closed && objectUrl) {
        popup.location.href = objectUrl;
        setDownloadHint("浏览器拦截了直接下载，已打开图片页，请长按或右键保存。");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenImagePage = async () => {
    if (!ref.current) return;
    setOpening(true);
    setDownloadError("");
    setDownloadHint("");
    let objectUrl = "";
    try {
      // Fix iOS save path: explicit open-image action for long-press save.
      const blob = await captureAsBlob();
      objectUrl = URL.createObjectURL(blob);
      const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        throw new Error("popup blocked");
      }
      setDownloadHint("新页面已打开，请长按图片后选择“存储到照片/图片另存为”。");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      objectUrl = "";
    } catch (error) {
      console.error("[share-card] open image page failed", error);
      setDownloadError("打开图片页失败，请检查浏览器弹窗权限后重试。");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setOpening(false);
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
        disabled={downloading || opening}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {downloading ? "正在生成图片..." : "下载结果图"}
      </button>
      <button
        type="button"
        onClick={handleOpenImagePage}
        disabled={downloading || opening}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {opening ? "正在打开图片..." : "打开图片页保存（iPhone推荐）"}
      </button>
      {downloadHint && <p className="text-xs text-slate-500">{downloadHint}</p>}
      {downloadError && <p className="text-xs text-rose-500">{downloadError}</p>}
    </div>
  );
}
