import JSZip from "jszip";

export type SceneZipEntry = {
  sceneNumber: string;
  imageUrl: string;
};

export function sceneNumberToZipFilename(sceneNumber: string): string {
  const match = sceneNumber.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 0;
  return `scene-${String(num).padStart(3, "0")}.png`;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function imageUrlToBytes(imageUrl: string): Promise<Uint8Array> {
  if (imageUrl.startsWith("data:")) {
    return dataUrlToUint8Array(imageUrl);
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("画像の取得に失敗しました。");
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadScenesAsZip(
  scenes: SceneZipEntry[],
  zipFilename = "scenes.zip"
): Promise<{ added: number; skipped: number }> {
  const zip = new JSZip();
  let added = 0;
  let skipped = 0;

  const sorted = [...scenes].sort((a, b) => {
    const numA = parseInt(a.sceneNumber.match(/\d+/)?.[0] ?? "0", 10);
    const numB = parseInt(b.sceneNumber.match(/\d+/)?.[0] ?? "0", 10);
    return numA - numB;
  });

  for (const scene of sorted) {
    if (!scene.imageUrl?.trim()) {
      skipped++;
      continue;
    }

    try {
      const bytes = await imageUrlToBytes(scene.imageUrl);
      zip.file(sceneNumberToZipFilename(scene.sceneNumber), bytes);
      added++;
    } catch {
      skipped++;
    }
  }

  if (added === 0) {
    throw new Error("ダウンロード可能な画像がありません。");
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, zipFilename);

  return { added, skipped };
}

export function countDownloadableScenes(scenes: SceneZipEntry[]): number {
  return scenes.filter((scene) => Boolean(scene.imageUrl?.trim())).length;
}
