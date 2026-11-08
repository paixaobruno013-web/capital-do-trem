# Configuração do Supabase — Capital do Trem

Este guia ajuda a conectar o banco de dados do Capital do Trem sem alterar o código SQL por tradução automática do navegador.

## Arquivo oficial do banco

Use sempre o arquivo completo `supabase/schema.sql` deste repositório:

- [Abrir o arquivo SQL original no GitHub](https://github.com/paixaobruno013-web/capital-do-trem/blob/main/supabase/schema.sql)
- [Baixar o arquivo SQL original](https://raw.githubusercontent.com/paixaobruno013-web/capital-do-trem/main/supabase/schema.sql)

O SQL usa comandos em inglês, como `create table`, `create policy` e `insert into`. Não traduza esses comandos. Comentários podem estar em português; isso é normal e não afeta a execução.

## Atenção: projeto atual já está ativo

O projeto Supabase deste aplicativo já está conectado e em uso. **Não execute o arquivo completo `supabase/schema.sql` novamente no banco atual**, pois ele é destinado a uma instalação nova. Para o projeto existente, aplique apenas migrations incrementais ainda não executadas e nunca repita uma migration sem conferir o histórico.

Use as instruções abaixo somente para criar um ambiente Supabase novo.

## Antes de colar pelo celular

1. No Chrome, deixe a tradução automática desativada para o GitHub e para o Supabase.
2. Prefira baixar o arquivo `schema.sql` pelo link de download acima. Abra o arquivo baixado em um editor de texto simples que não traduza o conteúdo.
3. Copie o arquivo inteiro, desde a primeira linha até a última.
4. No Supabase, abra o SQL Editor e crie uma consulta nova.
5. Cole o conteúdo completo. Confira que os comandos continuam em inglês — por exemplo, a primeira instrução deve começar com `create extension`, não com uma frase traduzida.
6. Só então execute uma única vez e aguarde o resultado.

Se o celular transformar palavras como `create`, `table`, `policy` ou `references` em português, apague a consulta alterada e recomece usando o arquivo baixado. Não tente corrigir comandos SQL traduzidos manualmente.

## Links do projeto Supabase

- [Painel do projeto](https://supabase.com/dashboard/project/zmjxkfjzrbbxyvgkwirv)
- [SQL Editor](https://supabase.com/dashboard/project/zmjxkfjzrbbxyvgkwirv/sql/new)
- [Editor de tabelas](https://supabase.com/dashboard/project/zmjxkfjzrbbxyvgkwirv/editor)

## Cuidados importantes

- Não execute trechos incompletos.
- Não execute o mesmo script repetidamente sem antes verificar o resultado da execução anterior.
- Não compartilhe chaves secretas, especialmente a chave `service_role`.
- O SQL cria a estrutura e as regras do banco; ele não cria automaticamente uma conta de administrador.
- A conta de administrador só deve ser configurada depois que a conta correspondente existir em Authentication e o e-mail estiver confirmado.
- O site publicado já usa a URL e a chave publicável do projeto conectado. Nunca coloque uma chave secreta no código publicado.

## Depois da execução

1. Confira se as tabelas aparecem no Table Editor.
2. Verifique se as políticas de segurança (RLS) foram criadas.
3. Teste cadastro e login antes de liberar interações sociais.
4. Teste upload e reprodução de músicas com uma conta autorizada.
5. O projeto está conectado; ainda assim, não considere cada função validada até que os testes de ponta a ponta passem.

Se aparecer qualquer erro no SQL Editor, pare e guarde a mensagem ou uma captura de tela para corrigirmos antes de tentar novamente.
