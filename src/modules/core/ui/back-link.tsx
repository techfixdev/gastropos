import Link from "next/link";

export function BackLink({
  href = "/",
  inline = false,
}: {
  href?: string;
  inline?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Volver"
      className={inline ? "scene-back-link scene-back-link-inline" : "scene-back-link"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14.5 5 7.5 12l7 7M8.5 12H19"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
