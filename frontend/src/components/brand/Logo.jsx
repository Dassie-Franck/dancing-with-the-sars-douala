/* eslint-disable react/prop-types */
// Logo du projet (SVG animé). Affiché via <img> : ses animations et ses styles internes restent isolés de la page.
const SRC = `${import.meta.env.BASE_URL}brand/logo-dancing-with-the-sars.svg`;

export default function Logo({ size = 40, className = "", decorative = false }) {
  return (
    <img
      src={SRC}
      width={size}
      height={size}
      alt={decorative ? "" : "Dancing with the SARs"}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={`block shrink-0 select-none rounded-full ${className}`}
    />
  );
}
