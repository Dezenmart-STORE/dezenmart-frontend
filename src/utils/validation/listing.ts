import { z } from "zod";
import { fulfilmentSchema } from "./bankTransfer";

/**
 * Editing a listing (PUT /products/{id}).
 *
 * Every listing can change its words, category and whether buyers see it. Only
 * a naira listing can change its price, stock and how buyers get it: a crypto
 * listing's price and quantity were fixed when its sale was opened, so the
 * form never offers them.
 */
export const LISTING_CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Art Work",
  "Accessories",
  "Other",
] as const;

const commonFields = {
  name: z.string().trim().min(1, "Product name is required").max(120, "Keep the name under 120 characters"),
  description: z.string().trim().min(1, "Description is required").max(2000, "Keep the description under 2,000 characters"),
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
  /** Absent when the listing has options, whose stock is kept per option. */
  stock: z
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(0, "Stock can't be below zero")
    .optional(),
  fulfilment: z.array(fulfilmentSchema).min(1, "Choose at least one way for buyers to get it"),
});

export const listingUpdateSchema = z.discriminatedUnion("kind", [cryptoListingUpdateSchema, nairaListingUpdateSchema]);
export type ListingUpdate = z.infer<typeof listingUpdateSchema>;

/** The multipart body PUT /products/{id} takes. */
export function toListingUpdateFormData(update: ListingUpdate): FormData {
  const data = new FormData();
  data.append("name", update.name);
  data.append("description", update.description);
  data.append("category", update.category);
  data.append("isActive", String(update.isActive));
  if (update.kind === "naira") {
    data.append("price", String(update.price));
    if (update.stock !== undefined) data.append("stock", String(update.stock));
    // Same encoding as creating a listing (toBankTransferListingFormData).
    data.append("fulfilment", JSON.stringify(update.fulfilment));
  }
  return data;
}
