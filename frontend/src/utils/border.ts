// border.ts
/**
 * Samples the backdrop behind an element to compute
 * a border alpha based on luminance, and a complementary
 * hue border for colored backdrops.
 */

export async function computeBorderAlpha(el: HTMLElement): Promise<number> {
  // create offscreen canvas matching element size
  const { width, height } = el.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // draw the backdrop
  // Note: requires `html, body { background-attachment: fixed; }`
  ctx.drawWindow(window, el.offsetLeft, el.offsetTop, width, height, 'rgba(0,0,0,0)');
  
  const data = ctx.getImageData(0, 0, width, height).data;
  let totalL = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    // convert RGB to luminance
    const r = data[i] / 255;
    const g = data[i+1] / 255;
    const b = data[i+2] / 255;
    const L = 0.2126*r + 0.7152*g + 0.0722*b;
    totalL += L;
    count++;
  }
  const avgL = totalL / count;
  // map [0,1] luminance to [0.2,0.6] alpha
  return Math.min(0.6, Math.max(0.2, (1 - avgL) * 0.4 + 0.2));
}

export function complementaryBorderColor(h: number, s: number, l: number): string {
  // shift hue by 180°
  const compHue = (h + 180) % 360;
  return `hsl(${compHue}, ${s}%, ${l}%)`;
}
