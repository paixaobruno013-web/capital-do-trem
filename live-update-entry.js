import { Capacitor } from '@capacitor/core';
import { LiveUpdate } from '@capawesome/capacitor-live-update';

const RELEASES_API = 'https://api.github.com/repos/paixaobruno013-web/capital-do-trem/releases?per_page=50';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'capitaldotrem_live_update_last_check_v1';

async function fetchLatestBundle() {
  const response = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Não foi possível consultar as atualizações.');
  const releases = await response.json();
  const release = releases.find(item =>
    !item.draft && !item.prerelease && typeof item.tag_name === 'string' &&
    item.tag_name.startsWith('web-update-')
  );
  if (!release) return null;
  const zip = release.assets?.find(asset => asset.name === 'capital-do-trem-web-bundle.zip');
  const body = String(release.body || '');
  const checksumMatch = body.match(/SHA-256:\s*([a-f0-9]{64})/i);
  const signatureMatch = body.match(/RSA-SIGNATURE:\s*([A-Za-z0-9+/=]+)/);
  if (!zip?.browser_download_url || !checksumMatch || !signatureMatch) {
    throw new Error('Pacote de atualização incompleto, sem SHA-256 ou sem assinatura RSA.');
  }
  return {
    bundleId: release.tag_name,
    url: zip.browser_download_url,
    checksum: checksumMatch[1].toLowerCase(),
    signature: signatureMatch[1]
  };
}

async function checkForUpdate() {
  const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
  if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;

  const latest = await fetchLatestBundle();
  if (!latest) {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    return;
  }

  const current = await LiveUpdate.getCurrentBundle();
  if (current.bundleId === latest.bundleId) {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    return;
  }

  const downloaded = await LiveUpdate.getBundles();
  if (!downloaded.bundleIds.includes(latest.bundleId)) {
    await LiveUpdate.downloadBundle({
      url: latest.url,
      bundleId: latest.bundleId,
      checksum: latest.checksum,
      signature: latest.signature,
      artifactType: 'zip'
    });
  }

  await LiveUpdate.setNextBundle({ bundleId: latest.bundleId });
  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  console.info('[Capital do Trem] Atualização preparada para a próxima abertura.');
}

async function startLiveUpdates() {
  if (!Capacitor.isNativePlatform() ||
      !Capacitor.isPluginAvailable('LiveUpdate')) return;

  try {
    // Confirma a inicialização em qualquer WebView nativa para manter o rollback seguro.
    await LiveUpdate.ready();
  } catch (error) {
    console.warn('[Capital do Trem] Não foi possível confirmar a inicialização do atualizador.', error);
    return;
  }

  // O iPhone Safari/PWA não usa este plugin; a atualização nativa fica restrita ao Android.
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    await checkForUpdate();
  } catch (error) {
    // Falhas de rede ou do servidor nunca bloqueiam o aplicativo em uso.
    console.warn('[Capital do Trem] Atualização remota adiada; o aplicativo continua funcionando.', error);
  }
}

void startLiveUpdates();
