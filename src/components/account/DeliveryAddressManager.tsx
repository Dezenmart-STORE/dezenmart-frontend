import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaEdit, FaTrash, FaStar, FaMapMarkerAlt } from "react-icons/fa";
import { HiCheckCircle } from "react-icons/hi2";
import { LiaAngleLeftSolid } from "react-icons/lia";
import {
  useGetDeliveryAddressesQuery,
  useCreateDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useSetDefaultDeliveryAddressMutation,
} from "../../store/api";
import { useSnackbar } from "../../context/SnackbarContext";
import type { DeliveryAddress, CreateDeliveryAddressParams } from "../../utils/types";
import LoadingSpinner from "../common/LoadingSpinner";

const BLANK: CreateDeliveryAddressParams = {
  label: "",
  recipientName: "",
  phoneNumber: "",
  address: "",
  city: "",
  state: "",
  country: "",
  zipCode: "",
  isDefault: false,
};

interface Props {
  onBack?: () => void;
}

const DeliveryAddressManager: React.FC<Props> = ({ onBack }) => {
  const { data: addresses = [], isLoading } = useGetDeliveryAddressesQuery();
  const [createAddress, { isLoading: isCreating }] = useCreateDeliveryAddressMutation();
  const [updateAddress, { isLoading: isUpdating }] = useUpdateDeliveryAddressMutation();
  const [deleteAddress, { isLoading: isDeleting }] = useDeleteDeliveryAddressMutation();
  const [setDefaultAddress] = useSetDefaultDeliveryAddressMutation();
  const { showSnackbar } = useSnackbar();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateDeliveryAddressParams>(BLANK);

  const field = (key: keyof CreateDeliveryAddressParams) => ({
    value: formData[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const openCreate = () => {
    setFormData(BLANK);
    setEditingAddress(null);
    setShowForm(true);
  };

  const openEdit = (addr: DeliveryAddress) => {
    setFormData({
      label: addr.label,
      recipientName: addr.recipientName,
      phoneNumber: addr.phoneNumber,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      zipCode: addr.zipCode,
      isDefault: addr.isDefault,
    });
    setEditingAddress(addr);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormData(BLANK);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await updateAddress({ _id: editingAddress._id, ...formData }).unwrap();
        showSnackbar("Address updated", "success");
      } else {
        await createAddress(formData).unwrap();
        showSnackbar("Address saved", "success");
      }
      closeForm();
    } catch {
      showSnackbar("Failed to save address. Please try again.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddress(id).unwrap();
      showSnackbar("Address removed", "success");
    } catch {
      showSnackbar("Failed to delete address.", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id).unwrap();
      showSnackbar("Default address updated", "success");
    } catch {
      showSnackbar("Failed to set default address.", "error");
    }
  };

  const isSaving = isCreating || isUpdating;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  // ── Address Form ──────────────────────────────────────────────────────
  if (showForm) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={closeForm}
            aria-label="Back"
            className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
          >
            <LiaAngleLeftSolid className="text-white text-xl" />
          </button>
          <h2 className="text-xl font-bold text-white">
            {editingAddress ? "Edit Address" : "New Address"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Label (e.g. Home, Office)" placeholder="Home" required {...field("label")} />
            <Field label="Recipient Name" placeholder="John Doe" required {...field("recipientName")} />
            <Field label="Phone Number" placeholder="+1 234 567 8900" type="tel" required {...field("phoneNumber")} />
            <div className="sm:col-span-2">
              <Field label="Street Address" placeholder="123 Main Street, Apt 4B" required {...field("address")} />
            </div>
            <Field label="City" placeholder="New York" required {...field("city")} />
            <Field label="State / Province" placeholder="NY" required {...field("state")} />
            <Field label="Country" placeholder="United States" required {...field("country")} />
            <Field label="ZIP / Postal Code" placeholder="10001" required {...field("zipCode")} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault as boolean}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
              }
              className="w-4 h-4 rounded border-gray-600 text-red-600 bg-[#292B30] focus:ring-red-500"
            />
            <span className="text-sm text-gray-300">Set as default address</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner />
                  Saving…
                </>
              ) : (
                <>
                  <HiCheckCircle className="w-4 h-4" />
                  {editingAddress ? "Update Address" : "Save Address"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-3 rounded-xl bg-[#292B30] hover:bg-[#3A3A3C] text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  // ── Address List ──────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
          >
            <LiaAngleLeftSolid className="text-white text-xl" />
          </button>
        )}
        <h2 className="text-xl font-bold text-white flex-1">Delivery Addresses</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <FaPlus className="w-3 h-3" />
          Add
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-[#292B30] rounded-2xl">
          <FaMapMarkerAlt className="w-10 h-10 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-300 font-medium">No delivery addresses yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Add an address so sellers know where to deliver.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {addresses.map((addr) => (
              <motion.div
                key={addr._id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={`bg-[#292B30] rounded-xl p-4 border-2 transition-colors ${
                  addr.isDefault ? "border-red-600" : "border-transparent"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="flex items-center gap-1 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">
                          <FaStar className="w-2.5 h-2.5" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mt-0.5">{addr.recipientName}</p>
                    <p className="text-gray-400 text-xs">{addr.phoneNumber}</p>
                  </div>
                </div>

                {/* Address lines */}
                <div className="text-gray-400 text-xs space-y-0.5 mb-4">
                  <p>{addr.address}</p>
                  <p>
                    {addr.city}, {addr.state} {addr.zipCode}
                  </p>
                  <p>{addr.country}</p>
                </div>

                {/* Inline delete confirmation */}
                <AnimatePresence>
                  {confirmDeleteId === addr._id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm"
                    >
                      <p className="text-red-300 font-medium mb-2">
                        Remove this address?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(addr._id)}
                          disabled={isDeleting}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          {isDeleting ? "Removing…" : "Yes, Remove"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 bg-[#3A3A3C] hover:bg-[#4A4A4C] text-white py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          Keep
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr._id)}
                      className="flex-1 bg-[#3A3A3C] hover:bg-[#484A4E] text-gray-300 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FaStar className="w-3 h-3" />
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(addr)}
                    className="flex-1 bg-[#3A3A3C] hover:bg-[#484A4E] text-gray-300 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FaEdit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      setConfirmDeleteId(
                        confirmDeleteId === addr._id ? null : addr._id
                      )
                    }
                    className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FaTrash className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

// ── Reusable field ────────────────────────────────────────────────────
function Field({
  label,
  placeholder,
  type = "text",
  required,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#1a1c20] text-white px-3 py-2.5 rounded-xl border border-[#3A3A3C] focus:border-red-500 focus:outline-none text-sm placeholder-gray-600 transition-colors"
      />
    </div>
  );
}

export default DeliveryAddressManager;
