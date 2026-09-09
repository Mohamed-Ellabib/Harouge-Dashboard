const sizeLabels: Record<string, string> = { S: "Small", M: "Medium", L: "Large", XL: "XL", XXL: "XXL" };

/** Present the standard size / color variant title without inventing missing options. */
export function urbxCartVariant(title?: string | null): string | null {
  if (!title || title === "Default variant" || title === "Standard") return null;
  const parts = title.split(" / ");
  return parts.length === 2 && Object.hasOwn(sizeLabels, parts[0])
    ? `${parts[1]} / ${sizeLabels[parts[0]]}`
    : title;
}
