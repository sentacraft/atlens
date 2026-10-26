import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { TEXT_LINK_CLS } from "@/config/ui-tokens";
import { CINE_COLLECTION_SLUG } from "@/lib/collections";
import { mountHasCollections } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import { collectionPath } from "@/lib/url/routes";

function plainText(chunks: ReactNode): ReactNode {
  return chunks;
}

/**
 * The `<cine>` tag in a "leaves out N cine lenses" note: a link to the cine collection, or plain
 * text on a mount without collections.
 */
export function cineCollectionTag(mount: Mount): (chunks: ReactNode) => ReactNode {
  if (!mountHasCollections(mount)) {
    return plainText;
  }
  const href = collectionPath(mount, CINE_COLLECTION_SLUG);
  return function CineCollectionLink(chunks: ReactNode) {
    return (
      <Link href={href} className={TEXT_LINK_CLS}>
        {chunks}
      </Link>
    );
  };
}
