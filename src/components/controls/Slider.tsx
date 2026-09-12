export function Slider({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  id?: string
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <input
      id={id}
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-4 w-full cursor-pointer appearance-none rounded-full bg-muted/20 accent-accent"
    />
  )
}
