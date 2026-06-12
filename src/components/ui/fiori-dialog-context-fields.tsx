export function FioriDialogContextFields({
  empresa,
  projectName,
  mockName,
}: {
  empresa?: string;
  projectName?: string;
  mockName?: string;
}) {
  const fields = [
    empresa && empresa !== "—" ? { label: "Empresa", value: empresa } : null,
    projectName && projectName !== "—" ? { label: "Projeto", value: projectName } : null,
    mockName && mockName !== "—" ? { label: "Mock", value: mockName } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (!fields.length) return null;

  return (
    <>
      <div className="fiori-dialog-title-context-divider" aria-hidden />
      <div className="fiori-dialog-context fiori-dialog-context--inline">
        {fields.map((field, index) => (
          <span key={field.label} className="contents">
            {index > 0 ? <div className="fiori-dialog-context-divider" aria-hidden /> : null}
            <div className="fiori-dialog-context-field">
              <span className="fiori-dialog-context-label">{field.label}</span>
              <span className="fiori-dialog-context-value">{field.value}</span>
            </div>
          </span>
        ))}
      </div>
    </>
  );
}
