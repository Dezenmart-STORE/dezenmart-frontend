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
} from "../../../../store/api";
import { useSnackbar } from "../../../../context/SnackbarContext";
import { useAccount, useChainId } from "wagmi";
import { useCurrency } from "../../../../context/CurrencyContext";
import { TOKENS, buildTradeParams } from "../../../../config/tokens";
import MediaUpload, { MediaFile } from "./MediaUpload";
import VariantsSection, { ProductVariant } from "./VariantsSection";
import PriceField from "./PriceField";

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
  sellerWalletAddress?: string;
  variants?: string;
  submit?: string;
}

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Art Work",
  "Accessories",
  "Other",
];

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
  `w-full bg-[#3A3C41] text-white px-3 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition-all placeholder-gray-600 ${
    hasError ? "ring-1 ring-red-500" : ""
  }`;

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
  const { selectedToken, convertPrice, fiatCurrency, tokens: availableTokens } = useCurrency();
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const { showSnackbar } = useSnackbar();
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    stock: "",
    sellerWalletAddress: "",
    priceInUSDT: "",
    priceInFiat: "",
  });
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [paymentToken, setPaymentToken] = useState(selectedToken?.symbol ?? "USDT");
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

  const handleUSDTChange = useCallback(
    (value: string) => {
      setField("priceInUSDT", value);
      const n = parseFloat(value);
      setField("priceInFiat", isNaN(n) ? "" : convertPrice(n, "USD", fiatCurrency).toFixed(2));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convertPrice, fiatCurrency]
  );

  const handleFiatChange = useCallback(
    (value: string) => {
      setField("priceInFiat", value);
      const n = parseFloat(value);
      setField("priceInUSDT", isNaN(n) ? "" : convertPrice(n, fiatCurrency, "USD").toFixed(2));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convertPrice, fiatCurrency]
  );

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

  const validate = useCallback((): boolean => {
    const e: FormErrors = {};
    const { name, description, category, priceInUSDT, stock, sellerWalletAddress } = form;

    if (!name.trim())        e.name        = "Product name is required";
    if (!description.trim()) e.description = "Description is required";
    if (!category)           e.category    = "Category is required";

    const price = parseFloat(priceInUSDT);
    if (!priceInUSDT.trim())  e.price = "Price is required";
    else if (isNaN(price) || price <= 0) e.price = "Enter a valid price greater than zero";

    const stockNum = parseInt(stock, 10);
    if (!stock.trim()) e.stock = "Stock quantity is required";
    else if (isNaN(stockNum) || stockNum <= 0) e.stock = "Enter a valid whole number";

    if (!sellerWalletAddress.trim()) {
      e.sellerWalletAddress = "Wallet address is required";
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(sellerWalletAddress)) {
      e.sellerWalletAddress = "Enter a valid Celo / EVM wallet address";
    }

    if (mediaFiles.length === 0) e.media = "At least one photo is required";

    const nonEmpty = variants.filter((v) => v.properties.length > 0);
    if (nonEmpty.length > 0) {
      if (nonEmpty.some((v) => !v.quantity))
        e.variants = "Set a quantity for each variant";
      else if (totalVariantQty !== stockNum)
        e.variants = `Variant total (${totalVariantQty}) must equal stock (${stockNum})`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, mediaFiles, variants, totalVariantQty]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const { name, description, category, priceInUSDT, stock, sellerWalletAddress } = form;
      const stockQty = parseInt(stock, 10) || 0;
      const tokenSymbol = paymentToken || "USDT";

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("price", priceInUSDT);
      formData.append("stock", stock);
      formData.append("sellerWalletAddress", sellerWalletAddress);
      formData.append("useUSDT", "true");
      formData.append("paymentToken", tokenSymbol);

      const matchedToken = availableTokens.find((t) => t.symbol === tokenSymbol);
      if (matchedToken && chainId) {
        const tokenAddress = matchedToken.address[chainId];
        if (tokenAddress) {
          formData.append("tokenAddress", tokenAddress);
          const tradeParams = buildTradeParams(parseFloat(priceInUSDT), stockQty, tokenSymbol, chainId);
          formData.append("tradeParams", JSON.stringify(tradeParams));
        }
      }

      // Default logistics (handled at checkout)
      formData.append("logisticsProviders", "0x0c9db90a95a78bf6d9b2448fde00210f36ba61e4");
      formData.append("logisticsCosts", "1");

      const validVariants = variants.filter((v) => v.properties.length > 0);
      if (validVariants.length > 0) {
        const formatted = validVariants.map((v) => {
          const obj: Record<string, string | number> = { quantity: v.quantity || 0 };
          v.properties.forEach((p) => {
            const n = Number(p.value);
            obj[p.name.toLowerCase()] = !isNaN(n) && p.value.trim() !== "" ? n : p.value;
          });
          return obj;
        });
        formData.append("type", JSON.stringify(formatted));
      }

      mediaFiles.forEach((m) => formData.append("images", m.file));

      await createProduct(formData).unwrap();
      setSuccess(true);
      showSnackbar("Product listed successfully!", "success");
      onProductCreated?.();

      setTimeout(() => {
        setForm({ name: "", description: "", category: "", stock: "", sellerWalletAddress: address ?? "", priceInUSDT: "", priceInFiat: "" });
        setMediaFiles([]);
        setVariants([{ id: `v-${Date.now()}`, properties: [], quantity: 0 }]);
        setSuccess(false);
      }, 1500);
    } catch {
      setErrors({ submit: "Failed to list product. Please try again." });
      showSnackbar("Failed to list product. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

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
            placeholder="Describe your product — condition, features, size..."
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
              </svg>
            </div>
          </div>
        </Field>
      </Section>

      {/* Pricing */}
      <Section title="Price">
        <PriceField
          priceUSDT={form.priceInUSDT}
          priceFiat={form.priceInFiat}
          fiatCurrency={fiatCurrency}
          paymentToken={paymentToken}
          tokens={availableTokens as typeof TOKENS}
          onUSDTChange={handleUSDTChange}
          onFiatChange={handleFiatChange}
          onTokenChange={setPaymentToken}
          error={errors.price}
        />
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

      {/* Payment wallet */}
      <Section title="Receive Payment">
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
      </Section>

      {/* Submit */}
      <div className="pt-1">
        {!isConnected && (
          <div className="mb-3 flex items-start gap-2 bg-amber-900/20 border border-amber-800/40 rounded-xl px-3 py-3">
            <FiInfo className="text-amber-400 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-amber-300 text-xs">
              Connect your wallet to list a product. You need a wallet to receive payments from buyers.
            </p>
          </div>
        )}

        {errors.submit && (
          <p className="text-red-400 text-sm text-center mb-3" role="alert">
            {errors.submit}
          </p>
        )}

        {success && (
          <p className="text-green-400 text-sm text-center mb-3 flex items-center justify-center gap-2">
            <FiCheck /> Product listed successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={!isConnected || submitting || isLoading}
          className="w-full bg-red-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting || isLoading
            ? "Listing product…"
            : !isConnected
            ? "Connect wallet to list"
            : "List Product"}
        </button>
      </div>
    </form>
  );
};

export default CreateProduct;
