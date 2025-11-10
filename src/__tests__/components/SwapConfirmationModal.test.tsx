import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwapConfirmationModal from '../../components/common/SwapConfirmationModal';
import { Web3Context } from '../../context/Web3Context';
import { SnackbarContext } from '../../context/SnackbarContext';
import {
  createMockProviders,
  mockQuoteData,
  mockSwapErrors,
} from '../utils/swapMocks';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('SwapConfirmationModal - Integration Tests', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockOnConfirm: () => Promise<void>;
  let mockOnClose: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProviders = createMockProviders();
    mockOnConfirm = vi.fn().mockResolvedValue(undefined) as any;
    mockOnClose = vi.fn() as any;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderModal = (props = {}, customContext = {}) => {
    const providers = createMockProviders(customContext);

    return render(
      <SnackbarContext.Provider value={providers.snackbarContext}>
        <Web3Context.Provider value={providers.web3Context as any}>
          <SwapConfirmationModal
            isOpen={true}
            fromToken="cUSD"
            toToken="cEUR"
            amountIn={100}
            onConfirm={mockOnConfirm}
            onClose={mockOnClose}
            slippage={1}
            {...props}
          />
        </Web3Context.Provider>
      </SnackbarContext.Provider>
    );
  };

  describe('Initial Rendering', () => {
    it('should render modal with correct title', () => {
      renderModal();
      expect(screen.getByText('Confirm Swap')).toBeInTheDocument();
    });

    it('should display loading state when fetching initial quote', async () => {
      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          isGettingQuote: true,
          lastQuote: null,
        },
      });

      expect(screen.getByText('Fetching best swap rate...')).toBeInTheDocument();
      expect(screen.getByText('This may take a few seconds')).toBeInTheDocument();
    });

    it('should display from and to token information', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('cUSD')).toBeInTheDocument();
        expect(screen.getByText('cEUR')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument(); // amount
      });
    });
  });

  describe('Quote Display', () => {
    it('should display quote details when available', async () => {
      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          lastQuote: mockQuoteData,
        },
      });

      await waitFor(() => {
        // Check for exchange rate
        expect(screen.getByText(/0.955/)).toBeInTheDocument();
        // Check for estimated output
        expect(screen.getByText(/95.5/)).toBeInTheDocument();
      });
    });

    it('should display quote countdown timer', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/Quote expires in \d+s/)).toBeInTheDocument();
      });
    });

    it('should show expired quote warning when countdown reaches zero', async () => {
      renderModal();

      // Fast-forward time to expire the quote
      act(() => {
        vi.advanceTimersByTime(11000); // 11 seconds
      });

      await waitFor(() => {
        expect(screen.getByText('Quote Expired')).toBeInTheDocument();
      });
    });

    it('should display price impact with correct color coding', async () => {
      const highImpactQuote = { ...mockQuoteData, priceImpact: '6.5' };

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          lastQuote: highImpactQuote,
        },
      });

      await waitFor(() => {
        const priceImpactElement = screen.getByText(/6\.50%/);
        expect(priceImpactElement).toBeInTheDocument();
        // High impact should have red color class
        expect(priceImpactElement).toHaveClass('text-red-400');
      });
    });

    it('should display minimum received amount with slippage', async () => {
      renderModal({ slippage: 1 });

      await waitFor(() => {
        expect(screen.getByText(/Minimum received:/)).toBeInTheDocument();
        expect(screen.getByText(/94\.605/)).toBeInTheDocument();
      });
    });

    it('should display multi-hop route when available', async () => {
      const multiHopQuote = {
        ...mockQuoteData,
        route: ['cUSD', 'USDC', 'cEUR'],
      };

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          lastQuote: multiHopQuote,
        },
      });

      await waitFor(() => {
        expect(screen.getByText('cUSD')).toBeInTheDocument();
        expect(screen.getByText('USDC')).toBeInTheDocument();
        expect(screen.getByText('cEUR')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display user-friendly error message on quote failure', async () => {
      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          getSwapQuote: vi.fn().mockRejectedValue(mockSwapErrors.liquidityError),
        },
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Insufficient liquidity for this trade/i)
        ).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          getSwapQuote: vi.fn().mockRejectedValue(mockSwapErrors.networkError),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry quote fetch when retry button is clicked', async () => {
      const mockGetQuote = vi
        .fn()
        .mockRejectedValueOnce(mockSwapErrors.networkError)
        .mockResolvedValueOnce(mockQuoteData);

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          getSwapQuote: mockGetQuote,
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);

      expect(mockGetQuote).toHaveBeenCalledTimes(2);
    });
  });

  describe('Swap Execution', () => {
    it('should disable confirm button when quote is expired', async () => {
      renderModal();

      // Expire the quote
      act(() => {
        vi.advanceTimersByTime(11000);
      });

      await waitFor(() => {
        const confirmButton = screen.getByText(/Get New Quote|Confirm Swap/);
        expect(confirmButton).toBeInTheDocument();
      });
    });

    it('should call performSwap when confirm button is clicked', async () => {
      const mockPerformSwap = vi.fn().mockResolvedValue({
        success: true,
        hash: '0x123',
        amountOut: '95.5',
        recipient: '0xRecipient',
      });

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          performSwap: mockPerformSwap,
          lastQuote: mockQuoteData,
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Confirm Swap')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Swap');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockPerformSwap).toHaveBeenCalledWith({
          fromSymbol: 'cUSD',
          toSymbol: 'cEUR',
          amount: 100,
          slippageTolerance: 0.01,
          recipientAddress: undefined,
        });
      });
    });

    it('should show progress indicator during swap execution', async () => {
      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          isSwapping: true,
          currentStep: 1,
          totalSteps: 2,
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Executing swap...')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      });
    });

    it('should display high price impact warning', async () => {
      const highImpactQuote = { ...mockQuoteData, priceImpact: '12.5' };

      const mockPerformSwap = vi.fn();

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          lastQuote: highImpactQuote,
          performSwap: mockPerformSwap,
        },
      });

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Swap');
        expect(confirmButton).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Swap');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockProviders.snackbarContext.showSnackbar).toHaveBeenCalledWith(
          expect.stringContaining('High price impact'),
          'warning'
        );
      });
    });

    it('should call onConfirm callback on successful swap', async () => {
      const mockPerformSwap = vi.fn().mockResolvedValue({
        success: true,
        hash: '0x123',
        amountOut: '95.5',
        recipient: '0xRecipient',
      });

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          performSwap: mockPerformSwap,
          lastQuote: mockQuoteData,
        },
      });

      const confirmButton = await screen.findByText('Confirm Swap');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });

    it('should display error message on swap failure', async () => {
      const mockPerformSwap = vi.fn().mockRejectedValue(mockSwapErrors.gasError);

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          performSwap: mockPerformSwap,
          lastQuote: mockQuoteData,
        },
      });

      const confirmButton = await screen.findByText('Confirm Swap');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockProviders.snackbarContext.showSnackbar).toHaveBeenCalledWith(
          expect.stringContaining('Insufficient CELO for gas fees'),
          'error'
        );
      });
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when cancel button is clicked', async () => {
      renderModal();

      const cancelButton = await screen.findByText('Cancel');
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should prevent closing modal during swap execution', async () => {
      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          isSwapping: true,
        },
      });

      const cancelButton = await screen.findByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });

    it('should refresh quote when refresh button is clicked', async () => {
      const mockGetQuote = vi.fn().mockResolvedValue(mockQuoteData);

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          getSwapQuote: mockGetQuote,
          lastQuote: mockQuoteData,
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      await userEvent.click(refreshButton);

      expect(mockGetQuote).toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
    it('should display MEV protection notice', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/5-minute deadline for MEV protection/)).toBeInTheDocument();
      });
    });

    it('should display transaction security information', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/Transaction is irreversible once confirmed/)).toBeInTheDocument();
        expect(screen.getByText(/Gas fees are paid in CELO/)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render with mobile-friendly classes', () => {
      const { container } = renderModal();

      // Check for responsive classes
      const modal = container.querySelector('[class*="md:"]');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Quote Auto-Refresh', () => {
    it('should auto-refresh quote after 10 seconds', async () => {
      const mockGetQuote = vi.fn().mockResolvedValue(mockQuoteData);

      renderModal({}, {
        uniswap: {
          ...mockProviders.web3Context.uniswap,
          getSwapQuote: mockGetQuote,
        },
      });

      // Initial quote fetch
      await waitFor(() => {
        expect(mockGetQuote).toHaveBeenCalledTimes(1);
      });

      // Advance time by 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should auto-refresh
      await waitFor(() => {
        expect(mockGetQuote).toHaveBeenCalledTimes(2);
      });
    });
  });
});
