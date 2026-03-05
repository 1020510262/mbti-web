"use client";

import { useState } from "react";

interface ShareCardProps {
  type: string;
  title: string;
  summary: string;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = text.replace(/\s+/g, " ").trim().split("");
  const lines: string[] = [];
  let line = "";

  for (const ch of chars) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth) {
      if (line) lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("canvas to blob failed");
  return blob;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("blob to data url failed"));
    reader.readAsDataURL(blob);
  });
}

function buildShareCanvas(type: string, title: string, summary: string): HTMLCanvasElement {
  const width = 1080;
  const height = 1440;
  const padding = 72;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context missing");

  // Fix: draw image directly on canvas to avoid html2canvas parsing lab/oklab color functions.
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f472b6");
  bg.addColorStop(0.45, "#7dd3fc");
  bg.addColorStop(1, "#fff8ed");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.beginPath();
  ctx.arc(width - 110, 120, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(110, height - 120, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = "500 36px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText("我的MBTI测试结果", padding, 118);

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 140px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(type, padding, 290);

  ctx.fillStyle = "#334155";
  ctx.font = "700 52px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(title, padding, 370);

  ctx.fillStyle = "#334155";
  ctx.font = "500 40px 'PingFang SC','Microsoft YaHei',sans-serif";
  const lines = wrapLines(ctx, summary, width - padding * 2);
  const maxLines = 13;
  const visible = lines.slice(0, maxLines);
  visible.forEach((line, i) => {
    ctx.fillText(line, padding, 480 + i * 58);
  });

  ctx.fillStyle = "rgba(255,255,255,0.84)";
  const tagX = padding;
  const tagY = height - 150;
  const tagW = 420;
  const tagH = 64;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 32);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = "700 28px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText("MBTI FUN TEST 2026", tagX + 26, tagY + 42);

  return canvas;
}

export function ShareCard({ type, title, summary }: ShareCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadHint, setDownloadHint] = useState("");
  const [previewDataUrl, setPreviewDataUrl] = useState("");

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    setDownloadHint("");
    let objectUrl = "";
    let popup: Window | null = null;

    try {
      const canvas = buildShareCanvas(type, title, summary);
      const blob = await canvasToBlob(canvas);
      const filename = `MBTI-${type}.png`;
      objectUrl = URL.createObjectURL(blob);
      popup = window.open("", "_blank", "noopener,noreferrer");

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
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
      if (popup && !popup.closed) popup.close();
    } catch (error) {
      console.error("[share-card] download failed", error);
      setDownloadError("生成图片失败，请稍后重试或直接截图保存。");
      if (popup && !popup.closed && objectUrl) {
        popup.location.href = objectUrl;
        setDownloadHint("浏览器拦截了直接下载，已打开图片页，请长按或右键保存。");
      } else if (typeof window !== "undefined") {
        window.alert("生成图片失败，请稍后重试或直接截图保存。");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenImagePage = async () => {
    setOpening(true);
    setDownloadError("");
    setDownloadHint("");
    setPreviewDataUrl("");

    try {
      // Fix mobile UX: render preview overlay in current page instead of opening a new tab/window.
      const canvas = buildShareCanvas(type, title, summary);
      const blob = await canvasToBlob(canvas);
      const dataUrl = await blobToDataUrl(blob);
      setPreviewDataUrl(dataUrl);
      setDownloadHint("请在下方预览图上长按（手机）或右键（电脑）保存图片。");
    } catch (error) {
      console.error("[share-card] open image page failed", error);
      setDownloadError("打开预览失败，请稍后重试。");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.7)] bg-[radial-gradient(circle_at_top_left,#f472b6_0%,#7dd3fc_42%,#fff8ed_100%)] p-6 shadow-[0_14px_36px_rgba(15,23,42,0.12)]">
        <div className="absolute -right-9 -top-9 h-24 w-24 rounded-full bg-[rgba(255,255,255,0.45)]" />
        <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[rgba(224,242,254,0.7)]" />
        <p className="text-sm text-slate-700">我的MBTI测试结果</p>
        <h3 className="mt-2 text-4xl font-black text-slate-900">{type}</h3>
        <p className="mt-1 text-lg font-semibold text-slate-700">{title}</p>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{summary}</p>
        <div className="mt-5 inline-flex rounded-full bg-[rgba(255,255,255,0.8)] px-3 py-1 text-xs font-semibold text-slate-700">
          MBTI FUN TEST 2026
        </div>
      </div>

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
        {opening ? "正在生成预览..." : "当前页预览保存"}
      </button>

      {downloadHint && <p className="text-xs text-slate-500">{downloadHint}</p>}
      {downloadError && <p className="text-xs text-rose-500">{downloadError}</p>}

      {previewDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          {/* Fix mobile UX: in-page overlay preview avoids tab switching on iPhone Safari. */}
          <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 p-3">
            <button
              type="button"
              onClick={() => setPreviewDataUrl("")}
              className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800"
            >
              关闭
            </button>
            <p className="mb-2 mt-1 pr-14 text-center text-xs text-slate-200">长按图片保存到相册</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewDataUrl} alt="MBTI share preview" className="h-auto w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
