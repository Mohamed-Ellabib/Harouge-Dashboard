import { useEffect, useState } from "react";

import type { StorefrontProductCardDto } from "../types";
import { StorefrontLink } from "../lib/navigation";
import { ArrowLeftIcon, PackageIcon } from "./Icons";

type ProductCardProps = {
  product: StorefrontProductCardDto;
  headingLevel?: 2 | 3;
};

export const ProductCard = ({
  product,
  headingLevel = 3,
}: ProductCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const Heading = `h${headingLevel}` as const;

  useEffect(() => setImageFailed(false), [product.thumbnail_url]);

  const destination = `/products/${encodeURIComponent(product.handle)}`;

  return (
    <article className="product-card">
      <StorefrontLink
        to={destination}
        className="product-card__image-link"
        ariaLabel={`عرض ${product.title}`}
      >
        {product.thumbnail_url && !imageFailed ? (
          <img
            src={product.thumbnail_url}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="product-card__placeholder" aria-hidden="true">
            <PackageIcon />
          </span>
        )}
      </StorefrontLink>
      <div className="product-card__body">
        <Heading>
          <StorefrontLink to={destination}>{product.title}</StorefrontLink>
        </Heading>
        {product.subtitle ? (
          <p>{product.subtitle}</p>
        ) : (
          <p className="product-card__quiet">تفاصيل مختارة بعناية</p>
        )}
        <StorefrontLink to={destination} className="product-card__action">
          عرض التفاصيل
          <ArrowLeftIcon />
        </StorefrontLink>
      </div>
    </article>
  );
};
