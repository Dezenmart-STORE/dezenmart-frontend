import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaTruck, FaBolt, FaClock, FaCheck } from 'react-icons/fa';
import { HiExclamationTriangle } from 'react-icons/hi2';
import { useGetLogisticsProvidersQuery } from '../../../store/api';
import type { DeliveryAddress } from '../../../utils/types';
import LoadingSpinner from '../../common/LoadingSpinner';

export interface LogisticsProvider {
  _id: string;
  name: string;
  walletAddress: string;
  serviceAreas: string[]; // Cities/states they serve
  deliverySpeed: 'standard' | 'express' | 'same-day';
  estimatedDays: string;
  baseCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FilteredLogisticsProvider {
  provider: LogisticsProvider;
  cost: number;
  available: boolean;
}

interface FilteredLogisticsSelectorProps {
  deliveryAddress: DeliveryAddress | null;
  selectedProvider: FilteredLogisticsProvider | null;
  onProviderSelect: (provider: FilteredLogisticsProvider) => void;
  productPrice: number; // To calculate cost based on distance/value
}

const FilteredLogisticsSelector: React.FC<FilteredLogisticsSelectorProps> = ({
  deliveryAddress,
  selectedProvider,
  onProviderSelect,
  productPrice,
}) => {
  const { data: allProviders = [], isLoading } = useGetLogisticsProvidersQuery();

  // Filter providers based on delivery address and calculate costs
  const filteredProviders = useMemo<FilteredLogisticsProvider[]>(() => {
    if (!deliveryAddress) return [];

    // Cast to LogisticsProvider type since backend may not return all fields yet
    const typedProviders = allProviders as any as LogisticsProvider[];

    return typedProviders
      .filter((provider) => provider.isActive)
      .map((provider) => {
        // Check if provider serves this area
        const servesArea = provider.serviceAreas
          ? provider.serviceAreas.some(
              (area) =>
                area.toLowerCase().includes(deliveryAddress.city.toLowerCase()) ||
                area.toLowerCase().includes(deliveryAddress.state.toLowerCase()) ||
                deliveryAddress.city.toLowerCase().includes(area.toLowerCase()) ||
                deliveryAddress.state.toLowerCase().includes(area.toLowerCase())
            )
          : true; // If no service areas defined, assume available everywhere

        // Calculate cost based on speed and product value
        let cost = provider.baseCost || 10; // Default base cost

        // Add premium for express/same-day
        if (provider.deliverySpeed === 'express') {
          cost = cost * 1.5;
        } else if (provider.deliverySpeed === 'same-day') {
          cost = cost * 2;
        }

        // Add percentage of product value (e.g., 2% for insurance)
        const insuranceCost = productPrice * 0.02;
        cost = cost + insuranceCost;

        return {
          provider,
          cost: Math.round(cost * 100) / 100, // Round to 2 decimals
          available: servesArea,
        };
      })
      .sort((a, b) => {
        // Sort: available first, then by cost
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.cost - b.cost;
      });
  }, [allProviders, deliveryAddress, productPrice]);

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'same-day':
        return <FaBolt className="w-4 h-4 text-yellow-500" />;
      case 'express':
        return <FaTruck className="w-4 h-4 text-blue-500" />;
      default:
        return <FaClock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSpeedLabel = (speed: string) => {
    switch (speed) {
      case 'same-day':
        return 'Same Day';
      case 'express':
        return 'Express';
      default:
        return 'Standard';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!deliveryAddress) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-400">
          <HiExclamationTriangle className="w-5 h-5" />
          <span className="text-sm">Please select a delivery address first</span>
        </div>
      </div>
    );
  }

  if (filteredProviders.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <HiExclamationTriangle className="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold">No delivery service available</p>
            <p className="text-xs mt-1">
              Sorry, we don't have delivery service to {deliveryAddress.city}, {deliveryAddress.state} yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const availableProviders = filteredProviders.filter((p) => p.available);
  const unavailableProviders = filteredProviders.filter((p) => !p.available);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaTruck className="text-red-500" />
          Select Delivery Service
        </h3>
        <span className="text-xs text-gray-400">
          {availableProviders.length} option{availableProviders.length !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Available Providers */}
      <div className="space-y-2">
        {availableProviders.map((item) => (
          <motion.button
            key={item.provider._id}
            onClick={() => onProviderSelect(item)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selectedProvider?.provider._id === item.provider._id
                ? 'border-red-600 bg-red-600/10'
                : 'border-gray-700 bg-[#1a1c20] hover:border-gray-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getSpeedIcon(item.provider.deliverySpeed)}
                  <span className="font-semibold text-white">{item.provider.name}</span>
                  <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                    {getSpeedLabel(item.provider.deliverySpeed)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <FaClock className="w-3 h-3" />
                    <span>{item.provider.estimatedDays || '2-3 days'}</span>
                  </div>
                  <div className="text-red-500 font-semibold">
                    ${item.cost.toFixed(2)}
                  </div>
                </div>
              </div>

              {selectedProvider?.provider._id === item.provider._id && (
                <FaCheck className="text-red-500 w-5 h-5 flex-shrink-0 mt-1" />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Unavailable Providers (if any) */}
      {unavailableProviders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mt-4">Not available in your area:</p>
          {unavailableProviders.map((item) => (
            <div
              key={item.provider._id}
              className="p-4 rounded-lg border border-gray-800 bg-gray-900/50 opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSpeedIcon(item.provider.deliverySpeed)}
                  <span className="text-gray-500 text-sm">{item.provider.name}</span>
                  <span className="bg-gray-800 text-gray-600 px-2 py-0.5 rounded text-xs">
                    {getSpeedLabel(item.provider.deliverySpeed)}
                  </span>
                </div>
                <span className="text-xs text-gray-600">Not available</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delivery Info Note */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> Delivery costs include insurance based on product value. Estimated delivery times may vary.
        </p>
      </div>
    </div>
  );
};

export default FilteredLogisticsSelector;
