import { addToCartAction } from "@/app/cart/actions";

/**
 * Adds a product to the cart. A plain form posting to a Server Function, so it
 * works without JavaScript and needs no client bundle.
 *
 * `then="checkout"` skips the cart page for a buy-now flow.
 * `theme` is the artwork the buyer picked; left off, the line takes whichever
 * theme the product carries.
 */
export function AddToCartButton({
  slug,
  qty = 1,
  theme,
  then,
  className,
  children,
}: {
  slug: string;
  qty?: number;
  theme?: string | null;
  then?: "cart" | "checkout";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={addToCartAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="qty" value={qty} />
      {theme && <input type="hidden" name="theme" value={theme} />}
      {then && <input type="hidden" name="then" value={then} />}
      <button
        type="submit"
        className={
          className ??
          "inline-block rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
        }
      >
        {children ?? "Add to cart"}
      </button>
    </form>
  );
}
