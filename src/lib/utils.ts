// shadcn-style class joiner (no clsx/tailwind-merge: this project styles with plain CSS + tokens).
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
