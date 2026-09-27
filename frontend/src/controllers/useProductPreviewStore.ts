import { create } from "zustand";

// Lets the product page's option picker (inside ProductBuyBox) tell the
// separate ProductGallery which image to show — picking "Black" switches
// the photo to the black one. The two are sibling client components under
// a server-rendered page, so they can't share React state directly.
// `version` bumps on every change so the gallery can tell "a new variant was
// picked" apart from "the shopper clicked a thumbnail since".
interface ProductPreviewState {
  productId: string | null;
  image: string | null;
  version: number;
  showImage: (productId: string, image: string | null) => void;
}

export const useProductPreviewStore = create<ProductPreviewState>()((set) => ({
  productId: null,
  image: null,
  version: 0,
  showImage: (productId, image) =>
    set((state) =>
      state.productId === productId && state.image === image
        ? state
        : { productId, image, version: state.version + 1 }
    ),
}));
