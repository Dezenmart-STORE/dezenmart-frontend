import {
  useState,
  useRef,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { FiInfo, FiCheck } from "react-icons/fi";
import {
  useCreateProductMutation,
  useGetMySellerProfileQuery,
  useGetNigerianStatesQuery,
  useGetStateLgasQuery,
} from "../../../../store/api";
import {
  bankTransferListingInputSchema,
  toBankTransferListingFormData,
  type Fulfilment,
} from "../../../../utils/validation/bankTransfer";
import { FALLBACK_STATES } from "../../../account/address/constants";
import { useSnackbar } from "../../../../context/SnackbarContext";
import { useAccount, useChainId } from "wagmi";
import { useCurrency } from "../../../../context/CurrencyContext";
import { TOKENS, buildTradeParams } from "../../../../config/tokens";
import MediaUpload, { MediaFile } from "./MediaUpload";
import VariantsSection, { ProductVariant } from "./VariantsSection";
import PriceField from "./PriceField";
import PaymentTypeChoice, { type PaymentType } from "./PaymentTypeChoice";
import BankPayoutStatus from "./BankPayoutStatus";
import StatusBox from "../../../common/StatusBox";
import { NairaPriceField, FulfilmentOptions } from "./BankTransferListingFields";
import { parseNairaInput } from "../../../../utils/format";
import { apiErrorStatus } from "../../../../utils/errors";
import { BANK_TRANSFER_ENABLED } from "../../../../config/features";
import { LISTING_CATEGORIES } from "../../../../utils/validation/listing";

interface CreateProductProps {
  onProductCreated?: () => void;
}

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  media?: string;
  stock?: string;
  weight?: string;
  state?: string;
  lga?: string;
  sellerWalletAddress?: string;
  variants?: string;
  fulfilment?: string;
  submit?: string;
}

const CATEGORIES = LISTING_CATEGORIES;

// ── Reusable field wrapper ─────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Input style ────────────────────────────────────────────────────────
const inputCls = (hasError?: boolean) =>
  `w-full bg-[#3A3C41] text-white px-3 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-red-400/60 transition-all placeholder-gray-500 ${
    hasError ? "border-red-400" : "border-[#767C87] focus:border-red-400"
  }`;

// ── Select chevron ─────────────────────────────────────────────────────
function Chevron() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
      </svg>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#292B30] rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
const CreateProduct: React.FC<CreateProductProps> = ({ onProductCreated }) => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { selectedToken, convertPrice, tokens: availableTokens, userLocalCurrency } = useCurrency();
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const { showSnackbar } = useSnackbar();
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    stock: "",
    weight: "",
    state: "",
    lga: "",
    sellerWalletAddress: "",
    listPrice: "",
    nairaPrice: "",
  });
  const [paymentType, setPaymentType] = useState<PaymentType>("crypto");
  const isBank = paymentType === "bank";
  const [fulfilment, setFulfilment] = useState<Fulfilment[]>(["delivery"]);

  // Bank-transfer listings need a verified payout account; only asked for in that mode.
  const {
    data: sellerProfile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetMySellerProfileQuery(undefined, { skip: !isBank });
  const hasPayoutAccount = Boolean(sellerProfile?.payoutAccount);
  const canOfferPickup = Boolean(sellerProfile?.address);

  // Offer pickup by default once we know the seller has somewhere to collect from.
  useEffect(() => {
    if (canOfferPickup) setFulfilment((f) => (f.includes("pickup") ? f : [...f, "pickup"]));
  }, [canOfferPickup]);

  const toggleFulfilment = (option: Fulfilment) => {
    setFulfilment((f) => (f.includes(option) ? f.filter((o) => o !== option) : [...f, option]));
    setErrors((prev) => ({ ...prev, fulfilment: undefined }));
  };

  // Origin state/LGA come from the backend; LGAs depend on the selected state.
  const { data: fetchedStates = [] } = useGetNigerianStatesQuery();
  const originStates = fetchedStates.length ? fetchedStates : FALLBACK_STATES;
  const { data: originLgas = [], isFetching: lgasFetching } = useGetStateLgasQuery(
    form.state,
    { skip: !form.state }
  );
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [paymentToken, setPaymentToken] = useState(selectedToken?.symbol ?? "USDT");
  // Seller enters the list price in USD or their local fiat; backend always gets USD.
  const [priceCurrency, setPriceCurrency] = useState<"USD" | "FIAT">("USD");
  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: `v-${Date.now()}`, properties: [], quantity: 0 },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-focus name on mount
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Auto-fill wallet from connected address (once, non-destructive)
  useEffect(() => {
    if (address) {
      setForm((prev) =>
        prev.sellerWalletAddress ? prev : { ...prev, sellerWalletAddress: address }
      );
    }
  }, [address]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Price is entered in USD or local fiat; derive USD (for the backend) and the
  // payment-token amount (for the on-chain trade).
  const priceUSD = useMemo(() => {
    const n = parseFloat(form.listPrice);
    if (isNaN(n) || n <= 0) return 0;
    return priceCurrency === "USD" ? n : convertPrice(n, "FIAT", "USD");
  }, [form.listPrice, priceCurrency, convertPrice]);

  const tokenEquivalent = useMemo(
    () => (priceUSD > 0 ? convertPrice(priceUSD, "USD", paymentToken) : 0),
    [priceUSD, paymentToken, convertPrice]
  );
  const fiatEquivalent = useMemo(
    () => (priceUSD > 0 ? convertPrice(priceUSD, "USD", "FIAT") : 0),
    [priceUSD, convertPrice]
  );

  const handlePriceChange = (value: string) => {
    setForm((prev) => ({ ...prev, listPrice: value }));
    if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
  };

  const handleTokenChange = (symbol: string) => setPaymentToken(symbol);

  const handleAddMedia = useCallback((incoming: MediaFile[]) => {
    setMediaFiles((prev) => [...prev, ...incoming].slice(0, 5));
    setErrors((prev) => ({ ...prev, media: undefined }));
  }, []);

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => { mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalVariantQty = useMemo(
    () => variants.reduce((s, v) => s + (v.quantity || 0), 0),
    [variants]
  );

  // `type` as the API expects it (empty when there are no variants).
  const formattedVariants = useCallback(
    () =>
      variants
        .filter((v) => v.properties.length > 0)
        .map((v) => {
          const obj: Record<string, string | number> = { quantity: v.quantity || 0 };
          v.properties.forEach((p) => {
            const n = Number(p.value);
            obj[p.name.toLowerCase()] = !isNaN(n) && p.value.trim() !== "" ? n : p.value;
          });
          return obj;
        }),
    [variants]
  );

  /** The bank-transfer payload, before the schema checks it. */
  const bankListingInput = useCallback(
    () => ({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      price: parseNairaInput(form.nairaPrice),
      stock: Number(form.stock),
      weight: Number(form.weight),
      state: form.state,
      lga: form.lga,
      fulfilment,
      type: formattedVariants(),
    }),
    [form, fulfilment, formattedVariants]
  );

  const validate = useCallback((): boolean => {
    const e: FormErrors = {};
    const stockNum = parseInt(form.stock, 10);

    // Photos and variant totals sit outside the payload schema, so both modes check them here.
    if (mediaFiles.length === 0) e.media = "At least one photo is required";
    const nonEmpty = variants.filter((v) => v.properties.length > 0);
    if (nonEmpty.length > 0) {
      if (nonEmpty.some((v) => !v.quantity)) e.variants = "Set a quantity for each variant";
      else if (totalVariantQty !== stockNum)
        e.variants = `Variant total (${totalVariantQty}) must equal stock (${stockNum})`;
    }

    if (isBank) {
      // One validator for bank-transfer listings: the payload schema, which
      // carries the same rules the server enforces.
      const parsed = bankTransferListingInputSchema.safeParse(bankListingInput());
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          const field = (key === "type" ? "variants" : key) as keyof FormErrors;
          e[field] ??= issue.message;
        }
      }
      if (!hasPayoutAccount) e.submit = "Add your bank account under Receive Payment first.";
    } else {
      const { name, description, category, stock, sellerWalletAddress } = form;
      if (!name.trim()) e.name = "Product name is required";
      if (!description.trim()) e.description = "Description is required";
      if (!category) e.category = "Category is required";
      if (!form.listPrice.trim()) e.price = "Price is required";
      else if (priceUSD <= 0) e.price = "Enter a valid price greater than zero";
      if (!stock.trim()) e.stock = "Stock quantity is required";
      else if (isNaN(stockNum) || stockNum <= 0) e.stock = "Enter a valid whole number";
      const weightNum = parseFloat(form.weight);
      if (!form.weight.trim()) e.weight = "Weight is required";
      else if (isNaN(weightNum) || weightNum <= 0) e.weight = "Enter a valid weight in kg";
      if (!form.state) e.state = "Origin state is required";
      if (!form.lga) e.lga = "Origin city / LGA is required";
      if (!sellerWalletAddress.trim()) e.sellerWalletAddress = "Wallet address is required";
      else if (!/^0x[a-fA-F0-9]{40}$/.test(sellerWalletAddress))
        e.sellerWalletAddress = "Enter a valid Celo / EVM wallet address";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, priceUSD, mediaFiles, variants, totalVariantQty, isBank, hasPayoutAccount, bankListingInput]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      if (isBank) {
        await createProduct(
          toBankTransferListingFormData(bankListingInput(), mediaFiles.map((m) => m.file))
        ).unwrap();
        finishListing();
        return;
      }

      const { name, description, category, stock, sellerWalletAddress } = form;
      const stockQty = parseInt(stock, 10) || 0;
      const tokenSymbol = paymentToken || "USDT";

      const matchedToken = availableTokens.find((t) => t.symbol === tokenSymbol);
      const isStable = matchedToken?.isStableToken ?? true;

      // Backend always stores the price in USD, regardless of the entry currency.
      const priceUsdStr = priceUSD.toFixed(2);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("price", priceUsdStr);
      formData.append("stock", stock);
      formData.append("weight", form.weight);
      formData.append("state", form.state);
      formData.append("lga", form.lga);
      formData.append("sellerWalletAddress", sellerWalletAddress);
      formData.append("useUSDT", isStable ? "true" : "false");
      formData.append("paymentToken", tokenSymbol);

      if (matchedToken && chainId) {
        const tokenAddress = matchedToken.address[chainId];
        if (tokenAddress) {
          formData.append("tokenAddress", tokenAddress);
          const tradeParams = buildTradeParams(tokenEquivalent || priceUSD, stockQty, tokenSymbol, chainId);
          formData.append("tradeParams", JSON.stringify(tradeParams));
        }
      }

      // Logistics providers are chosen by the buyer at checkout via /logistics/available,
      // so nothing product-specific is sent here anymore.

      // `type` is required by the API - always send it (empty array when no variants).
      formData.append("type", JSON.stringify(formattedVariants()));

      mediaFiles.forEach((m) => formData.append("images", m.file));

      await createProduct(formData).unwrap();
      finishListing();
    } catch (err) {
      const status = isBank ? apiErrorStatus(err) : undefined;
      const message =
        status === 400
          ? "Your bank account isn't verified yet. Add it under Receive Payment, then try again."
          : status === 403
            ? "Your seller account can't list right now. Contact support."
            : status === 422
              ? "Some details weren't accepted. Pickup needs a pickup address in Settings; check that and try again."
              : "Failed to list product. Please try again.";
      setErrors({ submit: message });
      showSnackbar(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  function finishListing() {
    setSuccess(true);
    showSnackbar("Product listed successfully!", "success");
    onProductCreated?.();

    setTimeout(() => {
      setForm({ name: "", description: "", category: "", stock: "", weight: "", state: "", lga: "", sellerWalletAddress: address ?? "", listPrice: "", nairaPrice: "" });
      setMediaFiles([]);
      setVariants([{ id: `v-${Date.now()}`, properties: [], quantity: 0 }]);
      setSuccess(false);
    }, 1500);
  }

  const submitBlocked = isBank ? !hasPayoutAccount : !isConnected;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-6">
      {/* Photos */}
      <Section title="Photos & Videos">
        <MediaUpload
          files={mediaFiles}
          onAdd={handleAddMedia}
          onRemove={handleRemoveMedia}
          error={errors.media}
        />
      </Section>

      {/* Basic info */}
      <Section title="Product Details">
        <Field label="Name" error={errors.name}>
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="What are you selling?"
            className={inputCls(!!errors.name)}
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={3}
            placeholder="Describe your product - condition, features, size..."
            className={inputCls(!!errors.description)}
          />
        </Field>

        <Field label="Category" error={errors.category}>
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className={`${inputCls(!!errors.category)} appearance-none pr-8`}
            >
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Chevron />
          </div>
        </Field>
      </Section>

      {/* How buyers pay */}
      {BANK_TRANSFER_ENABLED && (
      <Section title="How buyers pay">
        <PaymentTypeChoice
          value={paymentType}
          onChange={(type) => {
            setPaymentType(type);
            setErrors({});
          }}
        />
      </Section>
      )}

      {/* Pricing */}
      <Section title="Price">
        {isBank ? (
          <NairaPriceField
            value={form.nairaPrice}
            error={errors.price}
            onChange={(v) => setField("nairaPrice", v)}
          />
        ) : (
        <PriceField
          listPrice={form.listPrice}
          priceCurrency={priceCurrency}
          fiatCode={userLocalCurrency}
          priceUSD={priceUSD}
          fiatEquivalent={fiatEquivalent}
          tokenEquivalent={tokenEquivalent}
          paymentToken={paymentToken}
          tokens={availableTokens as typeof TOKENS}
          onPriceChange={handlePriceChange}
          onCurrencyToggle={setPriceCurrency}
          onTokenChange={handleTokenChange}
          error={errors.price}
        />
        )}
      </Section>

      {/* Inventory */}
      <Section title="Inventory">
        <Field label="Stock Quantity" error={errors.stock}>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={form.stock}
            onChange={(e) => setField("stock", e.target.value)}
            placeholder="How many do you have?"
            className={inputCls(!!errors.stock)}
          />
        </Field>

        <div className="border-t border-[#3A3C41] pt-3">
          <VariantsSection
            variants={variants}
            totalStock={parseInt(form.stock, 10) || 0}
            onChange={setVariants}
            error={errors.variants}
          />
        </div>
      </Section>

      {/* Delivery - origin + weight drive the buyer's shipping options & cost */}
      <Section title="Delivery">
        <p className="text-xs text-gray-400 -mt-1">
          Buyers see delivery providers and cost at checkout based on where this
          ships from and how much it weighs.
        </p>

        <Field label="Item weight (kg)" error={errors.weight}>
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={form.weight}
            onChange={(e) => setField("weight", e.target.value)}
            placeholder="Weight of one item, e.g. 1.5"
            className={inputCls(!!errors.weight)}
          />
        </Field>

        <div className="border-t border-[#3A3C41] pt-3">
          <p className="text-sm font-medium text-gray-300 mb-2">Ships from</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="State" error={errors.state}>
              <div className="relative">
                <select
                  value={form.state}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, state: e.target.value, lga: "" }));
                    setErrors((prev) => ({ ...prev, state: undefined, lga: undefined }));
                  }}
                  className={`${inputCls(!!errors.state)} appearance-none pr-8 ${
                    form.state ? "text-white" : "text-gray-600"
                  }`}
                >
                  <option value="" disabled>Select state</option>
                  {originStates.map((s) => (
                    <option key={s} value={s} className="text-white bg-[#3A3C41]">{s}</option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>

            <Field label="City / LGA" error={errors.lga}>
              <div className="relative">
                <select
                  value={form.lga}
                  onChange={(e) => setField("lga", e.target.value)}
                  disabled={!form.state}
                  className={`${inputCls(!!errors.lga)} appearance-none pr-8 disabled:opacity-50 ${
                    form.lga ? "text-white" : "text-gray-600"
                  }`}
                >
                  <option value="" disabled>
                    {!form.state ? "Select a state first" : lgasFetching ? "Loading…" : "Select city / LGA"}
                  </option>
                  {originLgas.map((l) => (
                    <option key={l} value={l} className="text-white bg-[#3A3C41]">{l}</option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>
          </div>
        </div>

        {isBank && (
          <FulfilmentOptions
            value={fulfilment}
            canOfferPickup={canOfferPickup}
            error={errors.fulfilment}
            onToggle={toggleFulfilment}
          />
        )}
      </Section>

      {/* Payment wallet */}
      <Section title="Receive Payment">
        {isBank ? (
          <BankPayoutStatus
            profile={sellerProfile}
            isLoading={profileLoading}
            isError={profileError}
            onRetry={refetchProfile}
          />
        ) : (
        <Field label="Wallet Address" error={errors.sellerWalletAddress}>
          <div className="space-y-1.5">
            <input
              type="text"
              value={form.sellerWalletAddress}
              onChange={(e) => setField("sellerWalletAddress", e.target.value)}
              placeholder="0x..."
              className={`${inputCls(!!errors.sellerWalletAddress)} font-mono text-xs`}
            />
            {address && form.sellerWalletAddress !== address && (
              <button
                type="button"
                onClick={() => setField("sellerWalletAddress", address)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Use connected wallet ({address.slice(0, 6)}…{address.slice(-4)})
              </button>
            )}
            {address && form.sellerWalletAddress === address && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <FiCheck size={11} /> Using your connected wallet
              </p>
            )}
          </div>
        </Field>
        )}
      </Section>

      {/* Submit */}
      <div className="pt-1">
        {!isBank && !isConnected && (
          <div className="mb-3 flex items-start gap-2 bg-amber-900/20 border border-amber-800/40 rounded-xl px-3 py-3">
            <FiInfo className="text-amber-400 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-amber-300 text-xs">
              Connect your wallet to list a product. You need a wallet to receive payments from buyers.
            </p>
          </div>
        )}

        {errors.submit && (
          <div className="mb-3">
            <StatusBox tone="danger">{errors.submit}</StatusBox>
          </div>
        )}

        {success && (
          <p className="text-green-400 text-sm text-center mb-3 flex items-center justify-center gap-2">
            <FiCheck /> Product listed successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={submitBlocked || submitting || isLoading}
          className="w-full bg-red-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting || isLoading
            ? "Listing product…"
            : !isBank && !isConnected
            ? "Connect wallet to list"
            : isBank && !hasPayoutAccount
            ? "Add your bank account to list"
            : "List Product"}
        </button>
      </div>
    </form>
  );
};

export default CreateProduct;
