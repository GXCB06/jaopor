import { notFound } from "next/navigation";

// Any URL under a locale that no route matches renders [locale]/not-found.tsx inside the layout,
// so the 404 keeps the header and the language (Next's default 404 has neither).
export default function CatchAll() {
  notFound();
}
