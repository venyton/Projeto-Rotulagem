function formatSvgNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(3)).toString();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseCssPixel(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isVisibleCssColor(value: string) {
  if (!value || value === "transparent") return false;
  return !/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/i.test(value);
}

function renderRect(x: number, y: number, width: number, height: number, fill: string, id?: string) {
  if (width <= 0 || height <= 0) return "";
  return `<rect${id ? ` id="${id}"` : ""} x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" fill="${escapeXml(fill)}" />`;
}

function renderLine(x1: number, y1: number, x2: number, y2: number, width: number, color: string, id?: string) {
  if (width <= 0 || !isVisibleCssColor(color)) return "";
  return `<line${id ? ` id="${id}"` : ""} x1="${formatSvgNumber(x1)}" y1="${formatSvgNumber(y1)}" x2="${formatSvgNumber(x2)}" y2="${formatSvgNumber(y2)}" stroke="${escapeXml(color)}" stroke-width="${formatSvgNumber(width)}" stroke-linecap="square" />`;
}

function parsePolygonPoint(value: string, size: number) {
  const normalized = value.trim();
  if (normalized.endsWith("%")) return (Number.parseFloat(normalized) / 100) * size;
  return parseCssPixel(normalized);
}

function renderClipPathPolygon(rect: DOMRect, clipPath: string, fill: string) {
  const match = clipPath.match(/^polygon\((.*)\)$/i);
  if (!match || !isVisibleCssColor(fill)) return "";

  const points = match[1]
    .split(",")
    .map((point) => point.trim().split(/\s+/))
    .filter((point) => point.length >= 2)
    .map(([x, y]) => `${formatSvgNumber(parsePolygonPoint(x, rect.width))},${formatSvgNumber(parsePolygonPoint(y, rect.height))}`)
    .join(" ");

  if (!points) return "";
  return `<polygon points="${points}" transform="translate(${formatSvgNumber(rect.left)},${formatSvgNumber(rect.top)})" fill="${escapeXml(fill)}" />`;
}

function collectDecorations(root: HTMLElement, rootRect: DOMRect) {
  const fills: string[] = [];
  const borders: string[] = [];
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  let fillIndex = 0;
  let borderIndex = 0;

  for (const element of elements) {
    if (["STYLE", "SCRIPT"].includes(element.tagName)) continue;

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const localRect = new DOMRect(rect.left - rootRect.left, rect.top - rootRect.top, rect.width, rect.height);
    const background = style.backgroundColor;
    const clipPolygon = style.clipPath.startsWith("polygon(")
      ? renderClipPathPolygon(localRect, style.clipPath, background)
      : "";

    if (clipPolygon) {
      fills.push(clipPolygon);
    } else if (isVisibleCssColor(background)) {
      fills.push(renderRect(localRect.left, localRect.top, localRect.width, localRect.height, background, `shape-fill-${fillIndex++}`));
    }

    const topWidth = parseCssPixel(style.borderTopWidth);
    const rightWidth = parseCssPixel(style.borderRightWidth);
    const bottomWidth = parseCssPixel(style.borderBottomWidth);
    const leftWidth = parseCssPixel(style.borderLeftWidth);

    if (style.borderTopStyle !== "none") {
      borders.push(renderLine(localRect.left, localRect.top + topWidth / 2, localRect.left + localRect.width, localRect.top + topWidth / 2, topWidth, style.borderTopColor, `shape-line-${borderIndex++}`));
    }
    if (style.borderRightStyle !== "none") {
      borders.push(renderLine(localRect.left + localRect.width - rightWidth / 2, localRect.top, localRect.left + localRect.width - rightWidth / 2, localRect.top + localRect.height, rightWidth, style.borderRightColor, `shape-line-${borderIndex++}`));
    }
    if (style.borderBottomStyle !== "none") {
      borders.push(renderLine(localRect.left, localRect.top + localRect.height - bottomWidth / 2, localRect.left + localRect.width, localRect.top + localRect.height - bottomWidth / 2, bottomWidth, style.borderBottomColor, `shape-line-${borderIndex++}`));
    }
    if (style.borderLeftStyle !== "none") {
      borders.push(renderLine(localRect.left + leftWidth / 2, localRect.top, localRect.left + leftWidth / 2, localRect.top + localRect.height, leftWidth, style.borderLeftColor, `shape-line-${borderIndex++}`));
    }
  }

  return { fills, borders };
}

function collectText(root: HTMLElement, rootRect: DOMRect) {
  const textElements: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textIndex = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    const raw = node.nodeValue || "";
    if (!parent || !raw.replace(/\s/g, "") || parent.closest("style, script")) continue;

    const style = window.getComputedStyle(parent);
    if (style.display === "none" || style.visibility === "hidden" || !isVisibleCssColor(style.color)) continue;

    const range = document.createRange();
    const lines: Array<{ left: number; top: number; height: number; text: string }> = [];
    let currentLine: (typeof lines)[number] | null = null;
    let pendingSpace = "";

    for (let index = 0; index < raw.length; index += 1) {
      const character = raw[index];
      if (/\s/.test(character)) {
        if (currentLine) pendingSpace += " ";
        continue;
      }

      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = Array.from(range.getClientRects()).find((item) => item.width > 0 && item.height > 0);
      if (!rect) continue;

      if (!currentLine || Math.abs(currentLine.top - rect.top) > 2) {
        currentLine = { left: rect.left, top: rect.top, height: rect.height, text: "" };
        lines.push(currentLine);
        pendingSpace = "";
      } else {
        currentLine.left = Math.min(currentLine.left, rect.left);
        currentLine.height = Math.max(currentLine.height, rect.height);
      }

      if (pendingSpace && currentLine.text.length > 0) currentLine.text += pendingSpace;
      pendingSpace = "";
      currentLine.text += character;
    }

    range.detach();

    for (const line of lines) {
      const text = line.text.trim();
      if (!text) continue;
      const decoration = style.textDecorationLine && style.textDecorationLine !== "none"
        ? ` text-decoration="${escapeXml(style.textDecorationLine)}"`
        : "";
      textElements.push(
        `<text id="text-${textIndex++}" data-editable="true" x="${formatSvgNumber(line.left - rootRect.left)}" y="${formatSvgNumber(line.top - rootRect.top + line.height * 0.82)}" fill="${escapeXml(style.color)}" font-family="${escapeXml(style.fontFamily || "Arial, Helvetica, sans-serif")}" font-size="${formatSvgNumber(parseCssPixel(style.fontSize))}" font-weight="${escapeXml(style.fontWeight || "400")}" font-style="${escapeXml(style.fontStyle || "normal")}"${decoration} xml:space="preserve">${escapeXml(text)}</text>`
      );
    }
  }

  return textElements;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Falha ao converter imagem."));
    reader.readAsDataURL(blob);
  });
}

async function collectImages(root: HTMLElement, rootRect: DOMRect) {
  const images: string[] = [];
  let imageIndex = 0;

  for (const image of Array.from(root.querySelectorAll<HTMLImageElement>("img"))) {
    const rect = image.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const source = image.currentSrc || image.src;
    let href = source;
    if (source && !source.startsWith("data:")) {
      try {
        const response = await fetch(source);
        if (response.ok) href = await blobToDataUrl(await response.blob());
      } catch {
        href = source;
      }
    }
    if (!href) continue;

    images.push(
      `<image id="embedded-image-${imageIndex++}" data-editable="false" x="${formatSvgNumber(rect.left - rootRect.left)}" y="${formatSvgNumber(rect.top - rootRect.top)}" width="${formatSvgNumber(rect.width)}" height="${formatSvgNumber(rect.height)}" href="${escapeXml(href)}" xlink:href="${escapeXml(href)}" preserveAspectRatio="xMidYMid meet" />`
    );
  }

  return images;
}

async function waitForAssets(element: HTMLElement) {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(
    Array.from(element.querySelectorAll("img")).map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) return resolve();
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

export async function renderElementAsSvg(element: HTMLElement, title = "Rótulo nutricional editável") {
  await waitForAssets(element);

  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width || element.scrollWidth || element.clientWidth || 0);
  const height = Math.ceil(rect.height || element.scrollHeight || element.clientHeight || 0);
  const rootRect = new DOMRect(rect.left, rect.top, width, height);
  const { fills, borders } = collectDecorations(element, rootRect);
  const images = await collectImages(element, rootRect);
  const text = collectText(element, rootRect);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" viewBox="0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}">`,
    `<title>${escapeXml(title)}</title>`,
    '<desc>Texto e formas foram exportados como objetos SVG separados para edição em softwares vetoriais.</desc>',
    '<g id="layer-background" inkscape:groupmode="layer" inkscape:label="Fundo">',
    '<rect id="canvas-background" width="100%" height="100%" fill="#ffffff" />',
    '</g>',
    '<g id="layer-shapes" inkscape:groupmode="layer" inkscape:label="Formas" shape-rendering="crispEdges">',
    ...fills,
    ...borders,
    '</g>',
    '<g id="layer-images" inkscape:groupmode="layer" inkscape:label="Imagens incorporadas">',
    ...images,
    '</g>',
    '<g id="layer-text" inkscape:groupmode="layer" inkscape:label="Textos editáveis">',
    ...text,
    '</g>',
    '</svg>',
  ].join("");
}
