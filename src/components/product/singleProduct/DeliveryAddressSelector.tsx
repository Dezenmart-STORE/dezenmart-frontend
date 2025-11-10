import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaMapMarkerAlt, FaStar, FaCheck } from 'react-icons/fa';
import { HiCheckCircle } from 'react-icons/hi2';
import {
  useGetDeliveryAddressesQuery,
  useGetDefaultDeliveryAddressQuery,
  useCreateDeliveryAddressMutation,
} from '../../../store/api';
import type { DeliveryAddress, CreateDeliveryAddressParams } from '../../../utils/types';
import LoadingSpinner from '../../common/LoadingSpinner';

interface DeliveryAddressSelectorProps {
  selectedAddress: DeliveryAddress | null;
  onAddressSelect: (address: DeliveryAddress) => void;
}

const DeliveryAddressSelector: React.FC<DeliveryAddressSelectorProps> = ({
  selectedAddress,
  onAddressSelect,
}) => {
  const { data: addresses = [], isLoading } = useGetDeliveryAddressesQuery();
  const { data: defaultAddress } = useGetDefaultDeliveryAddressQuery();
  const [createAddress, { isLoading: isCreating }] = useCreateDeliveryAddressMutation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CreateDeliveryAddressParams>({
    label: '',
    recipientName: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    isDefault: false,
  });

  // Auto-select default address if no address is selected
  React.useEffect(() => {
    if (!selectedAddress && defaultAddress) {
      onAddressSelect(defaultAddress);
    }
  }, [defaultAddress, selectedAddress, onAddressSelect]);

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newAddress = await createAddress(formData).unwrap();
      onAddressSelect(newAddress);
      setShowAddForm(false);
      setFormData({
        label: '',
        recipientName: '',
        phoneNumber: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        isDefault: false,
      });
    } catch (error) {
      console.error('Failed to create address:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaMapMarkerAlt className="text-red-500" />
          Delivery Address
        </h3>
        {addresses.length > 0 && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            Add New
          </button>
        )}
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#1a1c20] rounded-lg p-4 border border-gray-700"
          >
            <h4 className="text-sm font-semibold text-white mb-3">Quick Add Address</h4>
            <form onSubmit={handleCreateAddress} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="col-span-2 bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="Label (e.g., Home)"
                />
                <input
                  type="text"
                  required
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="Recipient Name"
                />
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="Phone Number"
                />
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="col-span-2 bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="Street Address"
                />
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="City"
                />
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="State"
                />
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="Country"
                />
                <input
                  type="text"
                  required
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="bg-[#212428] text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                  placeholder="ZIP Code"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? <LoadingSpinner /> : <HiCheckCircle className="w-4 h-4" />}
                  Save & Use
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="text-center py-8 bg-[#1a1c20] rounded-lg border border-gray-700">
          <FaMapMarkerAlt className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 mb-2">No saved addresses</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 mx-auto transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            Add your first delivery address
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {addresses.map((address) => (
            <motion.button
              key={address._id}
              onClick={() => onAddressSelect(address)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedAddress?._id === address._id
                  ? 'border-red-600 bg-red-600/10'
                  : 'border-gray-700 bg-[#1a1c20] hover:border-gray-600'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{address.label}</span>
                    {address.isDefault && (
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                        <FaStar className="w-2 h-2" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm mb-1">{address.recipientName}</p>
                  <p className="text-gray-400 text-xs">{address.phoneNumber}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {address.address}, {address.city}, {address.state}
                  </p>
                </div>
                {selectedAddress?._id === address._id && (
                  <FaCheck className="text-red-500 w-5 h-5 flex-shrink-0" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryAddressSelector;
