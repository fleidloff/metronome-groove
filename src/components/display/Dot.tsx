const dotClass = (emphasised: boolean, active: boolean) =>
  [
    'rounded-full transition-colors duration-75',
    emphasised ? 'size-16 sm:size-24 ring-4 ring-offset-4' : 'size-9 sm:size-14',
    active ? 'bg-accent' : 'bg-muted/20',
    emphasised &&
      (active
        ? 'ring-accent ring-offset-background'
        : 'ring-muted/30 ring-offset-background'),
  ]
    .filter(Boolean)
    .join(' ')

export function Dot({
  label,
  emphasised = false,
  active = false,
}: {
  label: string
  emphasised?: boolean
  active?: boolean
}) {
  return (
    <li
      aria-label={label}
      aria-current={active ? 'step' : undefined}
      data-emphasised={emphasised}
      className={dotClass(emphasised, active)}
    />
  )
}
