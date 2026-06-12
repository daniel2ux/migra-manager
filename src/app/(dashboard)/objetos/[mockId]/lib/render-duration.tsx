export function renderMockObjectDuration(
  ms: number,
  allowZero: boolean = false,
  hasDates: boolean = true,
) {
  const sanitizedMs = ms <= 0 && (allowZero || !hasDates) ? 0 : Math.max(60000, ms);
  const totalMinutes = Math.floor(sanitizedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <span className="inline-flex items-center justify-center gap-0.5 font-mono font-bold">
      <span>{hours.toString().padStart(2, '0')}</span>
      <span className="text-[0.6em] opacity-60 uppercase">H</span>
      <span className="mx-0.5"></span>
      <span>{minutes.toString().padStart(2, '0')}</span>
      <span className="text-[0.6em] opacity-60 uppercase">M</span>
    </span>
  );
}
