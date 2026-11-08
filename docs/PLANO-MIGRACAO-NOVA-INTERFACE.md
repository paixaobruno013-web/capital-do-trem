# Plano de migração visual — Capital do Trem

Este documento registra os requisitos aprovados para a próxima versão. A migração deve evoluir o aplicativo existente, sem substituir o projeto por uma implementação nova.

## Identidade visual aprovada
- A tela de abertura deve usar a arte original enviada pelo responsável pelo projeto: favela à noite, helicóptero, triângulo vermelho, marca Capital do Trem e frase “Aqui a música não para!”.
- A assinatura “Bruno Chock” permanece somente na abertura, pequena e centralizada na parte inferior, conforme a arte aprovada.
- Não exibir “Bruno Chock” dentro das telas internas do aplicativo.
- A imagem de perfil institucional deve usar a mesma arte original da Capital do Trem, com fundo preto.
- Preservar a linguagem visual preta, vermelha e branca e os planos de fundo originais fornecidos pelo responsável. Não substituir por imagens genéricas.
- Não oferecer gravação de música pelo próprio usuário. Manter a área de catálogo, descoberta, reprodução e recursos de música já existentes que não sejam gravação.

## Regras de migração
1. Trabalhar na branch de desenvolvimento; não alterar nem publicar diretamente em `main`.
2. Preservar as páginas e os recursos existentes: início, catálogo/player de músicas, eventos e mapas, artistas, comunidade, bate-papo, ação social, parcerias, divulgação, dúvidas, conta, mensagens e avatar.
3. Reaproveitar os componentes e integrações já existentes sempre que possível.
4. Cada controle visível deve ter ação real e acessível: navegação, abrir link, enviar formulário, compartilhar, copiar, instalar ou executar a função correspondente. Não deixar botões meramente decorativos.
5. Distinguir recursos locais/demonstração de recursos sincronizados por servidor; não apresentar dados locais como compartilhados.
6. Validar responsividade e navegação em celular e desktop; testar os fluxos principais e registrar falhas conhecidas.
7. Não remover recursos existentes, alterar configuração do Supabase, publicar ou mesclar a branch sem autorização explícita.

## Dependências de conteúdo e integração
- Os arquivos binários originais da arte de abertura e da arte institucional de perfil precisam estar presentes em `assets/` antes de referenciá-los no HTML/CSS.
- A sincronização de perfis/avatares e mensagens depende da configuração do projeto Supabase e da aplicação da migração SQL correspondente.
- A integração Supabase permanece pendente até que o responsável forneça as capturas do painel solicitadas para confirmar as configurações.

## Critérios de conclusão
- A abertura usa a arte original e mantém a assinatura somente nela.
- O perfil institucional usa a arte correta sobre fundo preto.
- Nenhuma tela interna exibe a assinatura Bruno Chock.
- Não existe opção de gravar música; catálogo e reprodução continuam disponíveis.
- Os botões e links visíveis têm destino ou comportamento funcional.
- Os principais fluxos foram testados e os limites de integração estão claramente identificados.
- A nova versão só é publicada após revisão e autorização.
