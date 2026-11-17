// Marca oficial aplicada somente à cópia exportada; o arquivo original nunca é alterado.
const LOGO_URL = new URL('./marca.svg', import.meta.url).href;

function loadImage(blob) {
  return createImageBitmap(blob);
}

async function loadLogo() {
  const response = await fetch(LOGO_URL, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Não foi possível carregar a marca oficial do aplicativo.');
  return createImageBitmap(await response.blob());
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao preparar a imagem com a marca-d’água.')), type, quality);
  });
}

export async function createWatermarkedImage(sourceBlob) {
  if (!(sourceBlob instanceof Blob) || !sourceBlob.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem compatível.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(sourceBlob.type)) {
    throw new Error('Formato de foto não compatível para aplicar a marca-d’água.');
  }

  const [photo, logo] = await Promise.all([loadImage(sourceBlob), loadLogo()]);
  try {
    const maxPixels = 24000000;
    const scale = Math.min(1, Math.sqrt(maxPixels / (photo.width * photo.height)));
    const width = Math.max(1, Math.round(photo.width * scale));
    const height = Math.max(1, Math.round(photo.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: sourceBlob.type !== 'image/jpeg' });
    if (!context) throw new Error('Seu aparelho não conseguiu preparar a imagem.');

    context.drawImage(photo, 0, 0, width, height);
    const margin = Math.max(12, Math.round(width * 0.025));
    const logoWidth = Math.min(Math.round(width * 0.19), Math.round(width * 0.34));
    const ratio = logo.height / logo.width;
    const logoHeight = Math.round(logoWidth * ratio);
    context.save();
    context.globalAlpha = 0.88;
    context.shadowColor = '#000';
    context.shadowBlur = Math.max(3, Math.round(width * 0.006));
    context.drawImage(logo, width - logoWidth - margin, height - logoHeight - margin, logoWidth, logoHeight);
    context.restore();

    const outputType = sourceBlob.type;
    return await canvasBlob(canvas, outputType, outputType === 'image/png' ? undefined : 0.92);
  } finally {
    photo.close?.();
    logo.close?.();
  }
}
