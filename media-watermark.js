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


// Exporta uma cópia do vídeo com a marca oficial incorporada em todos os frames.
// O arquivo original no Storage permanece intacto.
export async function createWatermarkedVideo(sourceBlob) {
  if (!(sourceBlob instanceof Blob) || !sourceBlob.type.startsWith('video/')) throw new Error('O arquivo selecionado não é um vídeo compatível.');
  if (sourceBlob.size < 1 || sourceBlob.size > 200 * 1024 * 1024) throw new Error('Para aplicar a marca, o vídeo precisa ter até 200 MB.');
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Este aparelho ainda não oferece exportação de vídeo com marca. O original foi preservado e não será baixado sem a logo.');
  }
  const mimeType=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mimeType)throw new Error('O navegador não oferece um formato de exportação compatível. O vídeo original foi preservado.');
  const sourceUrl=URL.createObjectURL(sourceBlob),video=document.createElement('video');
  video.preload='auto';video.playsInline=true;video.muted=true;video.src=sourceUrl;
  let logo=null,canvasStream=null,audioContext=null,frameRequest=0,recorder=null,tracks=[];
  try{
    if(video.readyState<1)await new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',()=>reject(new Error('Não foi possível ler este vídeo.')),{once:true});video.load();});
    if(!video.videoWidth||!video.videoHeight)throw new Error('O vídeo não contém quadros válidos.');
    if(Number.isFinite(video.duration)&&video.duration>600)throw new Error('Vídeos acima de 10 minutos ainda não podem ser exportados com a marca.');
    if(video.readyState<2)await new Promise((resolve,reject)=>{video.addEventListener('loadeddata',resolve,{once:true});video.addEventListener('error',()=>reject(new Error('Falha ao carregar os quadros do vídeo.')),{once:true});});
    logo=await loadLogo();
    const scale=Math.min(1,1280/video.videoWidth,1280/video.videoHeight),width=Math.max(1,Math.round(video.videoWidth*scale)),height=Math.max(1,Math.round(video.videoHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');if(!context)throw new Error('Seu aparelho não conseguiu preparar o vídeo.');
    const margin=Math.max(12,Math.round(width*.025)),logoWidth=Math.round(width*.15),logoHeight=Math.round(logoWidth*(logo.height/logo.width));
    const drawFrame=()=>{if(video.readyState>=2){context.drawImage(video,0,0,width,height);context.save();context.globalAlpha=.9;context.shadowColor='#000';context.shadowBlur=Math.max(3,Math.round(width*.006));context.drawImage(logo,width-logoWidth-margin,height-logoHeight-margin,logoWidth,logoHeight);context.restore();}if(!video.ended)frameRequest=requestAnimationFrame(drawFrame);};
    canvasStream=canvas.captureStream(30);tracks=[...canvasStream.getVideoTracks()];
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(AudioContextClass){try{audioContext=new AudioContextClass();const source=audioContext.createMediaElementSource(video),silent=audioContext.createGain(),destination=audioContext.createMediaStreamDestination();silent.gain.value=0;source.connect(silent);silent.connect(audioContext.destination);source.connect(destination);tracks.push(...destination.stream.getAudioTracks());await audioContext.resume();}catch(error){console.warn('Trilha de áudio não pôde ser roteada pelo Web Audio.',error);}}
    if(!tracks.some(track=>track.kind==='audio')){const sourceCapture=video.captureStream?.()||video.mozCaptureStream?.();if(sourceCapture)tracks.push(...sourceCapture.getAudioTracks());}
    const output=new MediaStream(tracks),chunks=[];
    const result=new Promise((resolve,reject)=>{
      recorder=new MediaRecorder(output,{mimeType,videoBitsPerSecond:3500000,audioBitsPerSecond:128000});
      recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data);};
      recorder.onerror=()=>reject(new Error('Falha durante a exportação do vídeo com a marca.'));
      recorder.onstop=()=>{const blob=new Blob(chunks,{type:'video/webm'});if(blob.size)resolve(blob);else reject(new Error('A exportação terminou sem gerar um vídeo válido.'));};
      video.addEventListener('ended',()=>{if(recorder?.state==='recording')recorder.stop();},{once:true});
    });
    drawFrame();recorder.start(1000);await video.play();
    return await result;
  }catch(error){if(recorder?.state==='recording')recorder.stop();throw error;}
  finally{cancelAnimationFrame(frameRequest);video.pause();video.removeAttribute('src');video.load();tracks.forEach(track=>track.stop());canvasStream?.getTracks().forEach(track=>track.stop());if(audioContext&&audioContext.state!=='closed')await audioContext.close().catch(()=>{});logo?.close?.();URL.revokeObjectURL(sourceUrl);}
}
