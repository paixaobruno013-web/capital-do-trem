import * as auth from './supabase/auth.js';

/**
 * Serviço interno de IA do Capital do Trem.
 * Não cria botões, janelas ou elementos visíveis na interface.
 * Os recursos da IA são chamados apenas pelos módulos internos que precisam deles.
 */
export async function runCapitalAI({ prompt, imageDataUrl = '', mode = 'assistant' } = {}) {
  const cleanPrompt = String(prompt || '').trim().slice(0, 1800);
  if (!cleanPrompt && !imageDataUrl) throw new Error('Escreva uma pergunta ou escolha uma foto.');
  const supabase = auth.initSupabase();
  const { data: { session } = {}, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.access_token) throw new Error('Entre na sua conta para usar a IA do Capital do Trem.');
  const { data, error: invokeError } = await supabase.functions.invoke('capital-ai-assistant', {
    body: { prompt: cleanPrompt, image: imageDataUrl, mode }
  });
  if (invokeError) throw new Error(invokeError.message || 'A IA não respondeu. Tente novamente.');
  const answer = String(data?.answer || '').trim();
  if (!answer) throw new Error('A IA não retornou uma resposta.');
  return answer.slice(0, 5000);
}
