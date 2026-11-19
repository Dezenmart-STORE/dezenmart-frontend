import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetMySellerProfileQuery, useGetProductByIdQuery, useUpdateProductMutation } from "../store/api";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "../context/SnackbarContext";
import { BANK_TRANSFER_ENABLED } from "../config/features";
import { isBankTransferListing, type Product } from "../utils/types";
import {
  LISTING_CATEGORIES,
  listingUpdateSchema,
  toListingUpdateFormData,
} from "../utils/validation/listing";
import { LISTING_IMAGE_LIMITS, type Fulfilment } from "../utils/validation/bankTransfer";
import MediaUpload, { type MediaFile } from "../components/account/overview/products/MediaUpload";
import { apiErrorStatus } from "../utils/errors";
import { parseNairaInput } from "../utils/format";
import Button from "../components/common/Button";
import StatusBox from "../components/common/StatusBox";
import { Field, SelectChevron } from "../components/common/form/Field";
import { inputClass, optionClass } from "../components/common/form/fieldStyles";
import { NairaPriceField, FulfilmentOptions } from "../components/account/overview/products/BankTransferListingFields";

type Errors = Partial<Record<"name" | "description" | "category" | "price" | "stock" | "fulfilment", string>>;

interface FormState {
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  price: string;
  stock: string;
  fulfilment: Fulfilment[];
}

const saveFailure = (status: number | undefined) =>
  status === 403
    ? "Only the seller who listed this item can change it."
    : status === 404
      ? "This listing no longer exists."
      : status === 422
        ? "Some details weren't accepted. Pickup needs a pickup address in Settings, and stock can't be below the minimum order."
        : status === 400
          ? "A photo wasn't accepted. Use JPG, PNG, GIF or WebP files of 5 MB or less."
          : "Couldn't save your changes. Try again.";

const sellerIdOf = (product: Product) => (typeof product.seller === "object" ? product.seller?._id : product.seller);

/** Edit a listing the signed-in seller owns. Laid out like the order detail pages, fields like the listing form. */
export default function EditListing() {
  const { productId = "" } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: product, isLoading, isError, refetch } = useGetProductByIdQuery(productId, { skip: !productId });

  const back = () => navigate(productId ? `/product/${productId}` : "/account?tab=5");

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" aria-hidden />
          <p className="mt-4 text-sm text-gray-400">Loading listing…</p>
        </div>
      </div>
    );
  } else if (isError || !product) {
    body = (
      <StatusBox
        tone="danger"
        title="We couldn't load this listing"
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded text-sm font-medium text-red-300 underline hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Retry
          </button>
        }
      >
        Check your connection and try again.
      </StatusBox>
    );
  } else if (!user || sellerIdOf(product) !== user._id) {
    body = <StatusBox tone="warning">You can only edit listings you created.</StatusBox>;
  } else {
    body = <EditForm product={product} onDone={back} />;
  }

  return (
    <div className="min-h-screen bg-[#212428] px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-[#292B30] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Edit listing</h1>
        </div>
        {body}
      </div>
    </div>
  );
}

function EditForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const naira = BANK_TRANSFER_ENABLED && isBankTransferListing(product);
  const hasOptions = (product.type?.length ?? 0) > 0;
  const { showSnackbar } = useSnackbar();
  const [updateProduct, { isLoading: saving }] = useUpdateProductMutation();
  const { data: shop } = useGetMySellerProfileQuery(undefined, { skip: !naira });

  const [form, setForm] = useState<FormState>(() => ({
    name: product.name ?? "",
    description: typeof product.description === "string" ? product.description : "",
    category: product.category ?? "",
    isActive: product.isActive !== false,
    price: String(product.price ?? ""),
    stock: String(product.stock ?? ""),
    fulfilment: product.fulfilment?.length ? product.fulfilment : ["delivery"],
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string>();

  const currentPhotos = product.images ?? [];
  // null keeps the current photos; a list (even empty) means the seller is replacing them.
  const [newPhotos, setNewPhotos] = useState<MediaFile[] | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  // Previews are object URLs; free them when this screen goes.
  const photosRef = useRef<MediaFile[] | null>(null);
  photosRef.current = newPhotos;
  useEffect(() => () => photosRef.current?.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const keepCurrentPhotos = () => {
    newPhotos?.forEach((p) => URL.revokeObjectURL(p.preview));
    setNewPhotos(null);
    setPhotoError(undefined);
  };

  // Editing again clears the last save error.
  useEffect(() => setSubmitError(undefined), [form]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const common = { name: form.name, description: form.description, category: form.category, isActive: form.isActive };
    const parsed = listingUpdateSchema.safeParse(
      naira
        ? {
            kind: "naira",
            ...common,
            price: parseNairaInput(form.price),
            stock: form.stock.trim() === "" ? NaN : Number(form.stock),
            fulfilment: form.fulfilment,
          }
        : { kind: "crypto", ...common }
    );
    // Saving with no photos would leave the old ones; say so instead of pretending to replace them.
    const noPhotos = newPhotos !== null && newPhotos.length === 0;
    if (noPhotos) setPhotoError("Add at least one photo, or keep the current ones.");
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    if (noPhotos) return;
    try {
      const photos = newPhotos?.map((p) => p.file) ?? [];
      await updateProduct({ id: product._id, data: toListingUpdateFormData(parsed.data, photos) }).unwrap();
      showSnackbar("Listing updated", "success");
      onDone();
    } catch (err) {
      setSubmitError(saveFailure(apiErrorStatus(err)));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3 pb-6">
      <Section title="Product details">
        <Field label="Name" required surface="card" error={errors.name}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass("card", invalid)}
            />
          )}
        </Field>
        <Field label="Description" required surface="card" error={errors.description}>
          {({ id, describedBy, invalid }) => (
            <textarea
              id={id}
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass("card", invalid)}
            />
          )}
        </Field>
        <Field label="Category" required surface="card" error={errors.category}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <select
                id={id}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className={`${inputClass("card", invalid)} appearance-none cursor-pointer pr-8`}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {/* Keep an older category the list no longer has, so saving doesn't change it. */}
                {form.category && !LISTING_CATEGORIES.some((c) => c === form.category) && (
                  <option value={form.category} className={optionClass("card")}>
                    {form.category}
                  </option>
                )}
                {LISTING_CATEGORIES.map((c) => (
                  <option key={c} value={c} className={optionClass("card")}>
                    {c}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          )}
        </Field>
      </Section>

      <Section title="Photos">
        {newPhotos === null ? (
          <>
            {currentPhotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {currentPhotos.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Current photo ${i + 1}`}
                    className="aspect-square w-full rounded-xl object-cover bg-[#3A3C41]"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">This listing has no photos.</p>
            )}
            <Button
              variant="secondary"
              title={currentPhotos.length > 0 ? "Replace photos" : "Add photos"}
              onClick={() => setNewPhotos([])}
              className="bg-[#3A3C41] hover:bg-[#45474D]"
            />
          </>
        ) : (
          <>
            {currentPhotos.length > 0 && (
              <p className="text-sm text-gray-300">
                The photos you add here replace all of the current ones when you save.
              </p>
            )}
            <MediaUpload
              files={newPhotos}
              onAdd={(incoming) => {
                setNewPhotos((prev) => [...(prev ?? []), ...incoming].slice(0, LISTING_IMAGE_LIMITS.max));
                setPhotoError(undefined);
              }}
              onRemove={(index) =>
                setNewPhotos((prev) => {
                  if (!prev) return prev;
                  URL.revokeObjectURL(prev[index].preview);
                  return prev.filter((_, i) => i !== index);
                })
              }
              error={photoError}
            />
            {currentPhotos.length > 0 && (
              <button
                type="button"
                onClick={keepCurrentPhotos}
                className="rounded text-sm font-medium text-red-300 underline hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Keep the current photos
              </button>
            )}
          </>
        )}
      </Section>

      <Section title="Price and stock">
        {naira ? (
          <>
            <NairaPriceField value={form.price} error={errors.price} onChange={(v) => set("price", v)} />
            <Field
              label="Stock"
              required
              surface="card"
              error={errors.stock}
              hint={
                hasOptions
                  ? "How many you have in total, across all options. Each order takes from this number."
                  : "How many you have to sell."
              }
            >
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  className={inputClass("card", invalid)}
                />
              )}
            </Field>
            <FulfilmentOptions
              value={form.fulfilment}
              canOfferPickup={Boolean(shop?.address) || form.fulfilment.includes("pickup")}
              error={errors.fulfilment}
              onToggle={(option) =>
                set(
                  "fulfilment",
                  form.fulfilment.includes(option)
                    ? form.fulfilment.filter((f) => f !== option)
                    : [...form.fulfilment, option]
                )
              }
            />
          </>
        ) : (
          <StatusBox tone="info">
            The price and quantity of a listing paid by wallet are fixed once it's listed. To change them, list
            the item again.
          </StatusBox>
        )}
      </Section>

      <Section title="Visibility">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#767C87] bg-[#3A3C41] text-red-600 focus:ring-2 focus:ring-red-400 focus:ring-offset-0"
          />
          <span>
            <span className="block text-sm font-medium text-gray-200">Show this listing to buyers</span>
            <span className="block text-xs text-gray-400">
              Untick to pause it. It stays in your products and you can turn it back on any time.
            </span>
          </span>
        </label>
      </Section>

      {submitError && <StatusBox tone="danger">{submitError}</StatusBox>}

      <div className="flex gap-3 pt-1">
        <Button variant="primary" type="submit" title="Save changes" loading={saving} loadingTitle="Saving…" className="flex-1" />
        <Button variant="secondary" title="Cancel" onClick={onDone} disabled={saving} />
      </div>
    </form>
  );
}

/** The listing form's section card. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-[#292B30] rounded-2xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
