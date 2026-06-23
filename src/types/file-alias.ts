/**
 * Interface para mapeamento de aliases de arquivos de log
 * Permite associar nomes de objetos a padrões de nomes de arquivos diferentes
 */
export interface FileAlias {
  id: string;              // objectId (ex: "BILLEBF_MA")
  objectName: string;      // Nome do objeto no Migra (ex: "BILLEBF_MA")
  fileNamePatterns: string[]; // Padrões de nome de arquivo (ex: ["BILLDOCMA", "BILLDOCMA-EM-102"])
  projectId?: string;
}
