/** Draw a branded OneFit progress card to a canvas and return a PNG data URL (A29). */
export function renderShareGraphic(summary: { line1: string; line2: string }): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#F5F1EA"; ctx.fillRect(0, 0, 1080, 1080);          // cream
  ctx.fillStyle = "#E5573F"; ctx.fillRect(0, 0, 1080, 16);            // coral bar
  ctx.fillStyle = "#2B2B2B";                                          // charcoal
  ctx.font = "700 64px Inter, sans-serif";
  ctx.fillText("OneFit", 80, 160);
  ctx.font = "400 88px 'EB Garamond', serif";
  ctx.fillText(summary.line1, 80, 520);
  ctx.font = "400 48px Inter, sans-serif";
  ctx.fillStyle = "#6B6B6B";
  ctx.fillText(summary.line2, 80, 620);
  ctx.fillStyle = "#E5573F";
  ctx.fillText("My progress", 80, 980);
  return canvas.toDataURL("image/png");
}
