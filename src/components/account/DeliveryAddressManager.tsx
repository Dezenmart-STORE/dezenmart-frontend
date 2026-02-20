import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaStar, FaMapMarkerAlt } from 'react-icons/fa';
import { HiCheckCircle } from 'react-icons/hi2';
import {
  useGetDeliveryAddressesQuery,
  useCreateDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useSetDefaultDeliveryAddressMutation,
} from '../../store/api';
import type { DeliveryAddress, CreateDeliveryAddressParams } from '../../utils/types';
import LoadingSpinner from '../common/LoadingSpinner';

interface AddressFormData extends CreateDeliveryAddressParams {}

const DeliveryAddressManager: React.FC = () => {
  const { data: addresses = [], isLoading } = useGetDeliveryAddressesQuery();
  const [createAddress, { isLoading: isCreating }] = useCreateDeliveryAddressMutation();
  const [updateAddress, { isLoading: isUpdating }] = useUpdateDeliveryAddressMutation();
  const [deleteAddress, { isLoading: isDeleting }] = useDeleteDeliveryAddressMutation();
  const [setDefaultAddress] = useSetDefaultDeliveryAddressMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
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

  const resetForm = () => {
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
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleEditAddress = (address: DeliveryAddress) => {
    setFormData({
      label: address.label,
      recipientName: address.recipientName,
      phoneNumber: address.phoneNumber,
      address: address.address,
      city: address.city,
      state: address.state,
      country: address.country,
      zipCode: address.zipCode,
      isDefault: address.isDefault,
    });
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAddress) {
        await updateAddress({
          _id: editingAddress._id,
          ...formData,
        }).unwrap();
      } else {
        await createAddress(formData).unwrap();
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save address:', error);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await deleteAddress(addressId).unwrap();
      } catch (error) {
        console.error('Failed to delete address:', error);
      }
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(addressId).unwrap();
    } catch (error) {
      console.error('Failed to set default address:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Delivery Addresses</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaPlus className="w-4 h-4" />
            Add New Address
          </button>
        )}
      </div>

      {/* Address Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#292B30] rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingAddress ? 'Edit Address' : 'New Address'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Label (e.g., Home, Office) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="Home"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="+1234567890"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State/Province *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="United States"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ZIP/Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full bg-[#212428] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-300">
                  Set as default address
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isCreating || isUpdating ? (
                    <>
                      <LoadingSpinner />
                      Saving...
                    </>
                  ) : (
                    <>
                      <HiCheckCircle className="w-5 h-5" />
                      {editingAddress ? 'Update' : 'Save'} Address
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <FaMapMarkerAlt className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No delivery addresses yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Add your first delivery address to start shopping
            </p>
          </div>
        ) : (
          addresses.map((address) => (
            <motion.div
              key={address._id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-[#292B30] rounded-lg p-4 border-2 ${
                address.isDefault ? 'border-red-600' : 'border-transparent'
              } relative`}
            >
              {address.isDefault && (
                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                  <FaStar className="w-3 h-3" />
                  Default
                </div>
              )}

              <div className="mb-3">
                <h3 className="text-lg font-semibold text-white mb-1">{address.label}</h3>
                <p className="text-gray-300 font-medium">{address.recipientName}</p>
                <p className="text-gray-400 text-sm">{address.phoneNumber}</p>
              </div>

              <div className="text-gray-400 text-sm space-y-1 mb-4">
                <p>{address.address}</p>
                <p>
                  {address.city}, {address.state} {address.zipCode}
                </p>
                <p>{address.country}</p>
              </div>

              <div className="flex gap-2">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address._id)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <FaStar className="w-3 h-3" />
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEditAddress(address)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <FaEdit className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address._id)}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <FaTrash className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeliveryAddressManager;
