import { z } from "zod";
import { LISTING_IMAGE_LIMITS, fulfilmentSchema } from "./bankTransfer";

/**
 * Editing a listing (PUT /products/{id}).
 *
 * Every listing can change its words, category, photos and whether buyers see
 * it. Only a naira listing can change its price, stock and how buyers get it: a
 * crypto listing's price and quantity were fixed when its sale was opened, so
 * the form never offers them.
 */
export const LISTING_CATEGORIES = [
  "Electronics",
  "Clothing",
  "Aso-oke & Native Attire",
  "Home & Garden",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Art Work",
  "Accessories",
  "Other",
] as const;

// Same limits and words as creating a listing; the server refuses anything outside them.
const commonFields = {
  name: z.string().trim().min(3, "Give it a name of at least 3 characters").max(100, "Keep the name under 100 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Describe it in at least 10 characters")
    .max(1000, "Keep the description under 1,000 characters"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean(),
};

export const cryptoListingUpdateSchema = z.object({ kind: z.literal("crypto"), ...commonFields });

export const nairaListingUpdateSchema = z.object({
  kind: z.literal("naira"),
  ...commonFields,
  price: z
    .number({ invalid_type_error: "Enter a price in naira, like 25,000" })
    .finite("Enter a price in naira, like 25,000")
    .positive("Enter a price greater than zero"),
  /** The server keeps one count per listing, options included; an order takes from it whichever option is bought. */
  stock: z
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(0, "Stock can't be below zero"),
  fulfilment: z.array(fulfilmentSchema).min(1, "Choose at least one way for buyers to get it"),
});

export const listingUpdateSchema = z.discriminatedUnion("kind", [cryptoListingUpdateSchema, nairaListingUpdateSchema]);
export type ListingUpdate = z.infer<typeof listingUpdateSchema>;

/**
 * The multipart body PUT /products/{id} takes. Photos, when given, replace all
 * of the listing's photos: the server has no way to keep some and add others.
 */
export function toListingUpdateFormData(update: ListingUpdate, photos: readonly File[] = []): FormData {
  if (photos.length > LISTING_IMAGE_LIMITS.max) {
    throw new Error(`Add at most ${LISTING_IMAGE_LIMITS.max} photos`);
  }
  const data = new FormData();
  data.append("name", update.name);
  data.append("description", update.description);
  data.append("category", update.category);
  data.append("isActive", String(update.isActive));
  if (update.kind === "naira") {
    data.append("price", String(update.price));
    data.append("stock", String(update.stock));
    // Same encoding as creating a listing (toBankTransferListingFormData).
    data.append("fulfilment", JSON.stringify(update.fulfilment));
  }
  for (const photo of photos) data.append("images", photo);
  return data;
}
