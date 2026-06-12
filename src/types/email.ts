/**
 * Tipos para gestão de contatos e agrupadores de e-mail
 */

export interface EmailContact {
  id: string;
  name: string;
  email: string;
  groupIds: string[]; // IDs dos agrupadores vinculados
  createdAt: string;
  updatedAt: string;
  createdByUid: string;
  updatedByUid: string;
}

export interface EmailGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdByUid: string;
  updatedByUid: string;
}

/**
 * Tipo para seleção no campo "PARA" do formulário COMPOR E-MAIL
 */
export interface EmailRecipientSelection {
  type: 'contact' | 'group' | 'external';
  id: string;
  label: string;
  email?: string; // presente se type === 'contact' ou 'external'
}
