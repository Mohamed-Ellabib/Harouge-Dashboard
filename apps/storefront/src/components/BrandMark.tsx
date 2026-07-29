type BrandMarkProps = {
  className?: string;
};

export const BrandMark = ({ className }: BrandMarkProps) => (
  <span className={`brand-mark ${className ?? ""}`} aria-hidden="true">
    <span />
    <span />
    <span />
    <span />
  </span>
);
