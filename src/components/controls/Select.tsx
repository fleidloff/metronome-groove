export interface SelectOption<T extends string> {
  readonly value: T
  readonly label: string
}

export function Select<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id?: string
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="cursor-pointer rounded-card border border-muted/30 bg-background px-6 py-3 text-xl font-medium text-foreground"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
