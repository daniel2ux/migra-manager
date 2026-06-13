-- Campos corporativos do diretório de profissionais (exibidos no card e no cadastro).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company TEXT;
