-- Novos domínios de tipo para objetos mestre (catálogo).

ALTER TYPE public.master_object_type ADD VALUE IF NOT EXISTS 'COMMERCIAL_MASTER';
ALTER TYPE public.master_object_type ADD VALUE IF NOT EXISTS 'TECHNICAL_OBJECT';
ALTER TYPE public.master_object_type ADD VALUE IF NOT EXISTS 'EQUIPMENT_READING';
ALTER TYPE public.master_object_type ADD VALUE IF NOT EXISTS 'BILLING';
ALTER TYPE public.master_object_type ADD VALUE IF NOT EXISTS 'CUSTOMER_SERVICE';
