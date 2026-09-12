export function Checkbox({
  id,
  label,
  checked,
  onChange,
}: {
  id?: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 rounded-card border border-muted/30 bg-background px-6 py-3 text-xl font-medium text-foreground">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 cursor-pointer accent-accent"
      />
      {label}
    </label>
  )
}
