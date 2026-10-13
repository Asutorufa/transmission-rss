import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function Icon({ children, ...props }: Props) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export function PlusIcon() {
  return <Icon><path d="M12 5v14M5 12h14" /></Icon>;
}

export function EditIcon() {
  return <Icon><path d="m16 4 4 4M4 20l4-.8L20 7a2.8 2.8 0 0 0-4-4L4 15.2z" /></Icon>;
}

export function DeleteIcon() {
  return <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></Icon>;
}

export function CloseIcon() {
  return <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>;
}
