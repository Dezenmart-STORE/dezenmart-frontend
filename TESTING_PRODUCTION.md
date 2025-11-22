# Production Testing Guide - Payment Flow

This guide will help you test and debug the payment flow in production.

## 🚀 Quick Start

1. **Open the deployed site**: https://dezenmart.netlify.app
2. **Open Browser Console**: Press `F12` or right-click → Inspect → Console
3. **Enable Debug Mode**: Type `enablePaymentDebug()` and press Enter

You'll see:
```
🔍 Payment Debugger ENABLED
📊 Debug data will be collected for all payment flows
💾 Use window.exportPaymentDebug() to export data
```

---

## 📋 Available Debug Commands

### Payment Debugging
```javascript
enablePaymentDebug()   // Start collecting detailed payment data
disablePaymentDebug()  // Stop collecting data
printPaymentDebug()    // Show current payment session summary
exportPaymentDebug()   // Download complete debug data as JSON
clearPaymentDebug()    // Clear all stored debug sessions
```

### Transaction Tracking
```javascript
viewTransaction('0x...')  // View details of a specific transaction
```

### Error Analysis
```javascript
analyzeError(error)       // Get human-readable explanation of any error
```

---

## 🧪 Testing Workflow

### Step 1: Enable Debugging
```javascript
enablePaymentDebug()
```

### Step 2: Perform Purchase
1. Login with your Google account
2. Browse products and select one
3. Connect your Celo wallet
4. Click "Buy Now"
5. Approve token spending (if needed)
6. Confirm purchase transaction

### Step 3: Check Debug Output

The console will automatically log each step:
```
🎬 Payment Debug Session Started: pay_1234567890_abc123
⏳ [Debug] Payment initiated { product: "...", amount: 25.49 }
✅ [Debug] Wallet connected { address: "0x..." }
✅ [Debug] Trade validation success
⏳ [Debug] Token approval pending
✅ [Debug] Token approval success { hash: "0x..." }
⏳ [Debug] Purchase transaction pending
✅ [Debug] Purchase completed { hash: "0x...", purchaseId: "123" }
🏁 Payment Debug Session Ended: SUCCESS
⏱️ Duration: 45.23s
```

### Step 4: View Session Summary
```javascript
printPaymentDebug()
```

Output:
```
📊 Payment Debug Summary
Session ID: pay_1234567890_abc123
User Address: 0x1234...5678
Chain ID: 42220
Steps: 8

Token Info:
  symbol: "cUSD"
  balance: "100.5"
  allowance: "1000"
  requiredAmount: 25.49

Transaction Hashes:
  approval: "0xabc..."
  purchase: "0xdef..."

Steps:
1. ✅ Payment initiated (success)
2. ✅ Wallet connected (success)
3. ✅ Trade validation (success)
4. ✅ Token approval (success)
5. ✅ Purchase completed (success)
```

### Step 5: Export Debug Data (if issues occur)
```javascript
exportPaymentDebug()
```

This downloads a JSON file with complete debug information. Share this file when reporting issues.

---

## 🔍 Console Logs to Monitor

### 1. Payment Modal Logs
```
💰 [PaymentModal] Executing buyTrade...
  totalTokenAmount: 25.489
  paymentToken: "cUSD"
```

**What to check**: The `totalTokenAmount` should match your expected purchase total.

### 2. Web3Context Logs
```
💵 [Web3Context] Using totalTokenAmount from PaymentModal:
  requiredAmount: 25.489
  paymentTokenSymbol: "cUSD"
```

**What to check**: `requiredAmount` should match the amount from PaymentModal.

### 3. Allowance Check
```
✅ [Web3Context] Current allowance: 1000 required: 25.489
✅ [Web3Context] Sufficient allowance confirmed
```

**What to check**: Current allowance should be >= required amount.

### 4. Transaction Execution
```
🚀 [Web3Context] Executing buyTrade transaction...
  tradeId: "123"
  quantity: "1"
  logisticsProvider: "0x..."
```

**What to check**: All parameters look correct.

### 5. Transaction Success
```
✅ [Web3Context] Transaction hash received: 0x1234...5678
✅ [Web3Context] Transaction receipt: { status: "success" }
```

**What to check**: Status should be "success".

---

## ❌ Common Errors & Solutions

### Error: "Invalid totalTokenAmount"
**Cause**: PaymentModal didn't pass the token amount correctly.

**Solution**:
1. Check console for `💰 [PaymentModal] Executing buyTrade`
2. Verify `totalTokenAmount` is present and > 0
3. If missing, this is a bug - export debug data and report it

### Error: "Insufficient allowance"
**Cause**: Token approval didn't complete or was insufficient.

**Solution**:
1. Check console for approval transaction hash
2. Verify approval transaction on Celoscan
3. Try manually approving more tokens

### Error: "Trade validation failed"
**Cause**: Product no longer available or sold out.

**Solution**:
1. Refresh the page
2. Try a different product
3. Contact seller if problem persists

### Error: "User rejected"
**Cause**: You cancelled the transaction in your wallet.

**Solution**: Try again and approve the transaction.

### Error: "Insufficient funds"
**Cause**: Not enough tokens or CELO for gas.

**Solution**:
1. Check token balance: Should be >= purchase amount
2. Check CELO balance: Should be >= 0.01 CELO for gas
3. Add more funds and try again

---

## 📊 What to Report if Issues Occur

When reporting payment issues, please include:

1. **Debug Data Export**
   ```javascript
   exportPaymentDebug()
   ```

2. **Console Logs**
   - Copy all logs starting with `[PaymentModal]` or `[Web3Context]`
   - Include any red error messages

3. **Transaction Hashes**
   - Approval tx: Found in logs as "Approval transaction hash: 0x..."
   - Purchase tx: Found in logs as "Transaction hash received: 0x..."

4. **Account Info**
   - Wallet address (first/last 4 characters: 0x1234...5678)
   - Network: Celo Mainnet or Alfajores Testnet
   - Token used: cUSD, USDT, etc.

5. **Expected vs Actual**
   - What you expected to happen
   - What actually happened
   - Screenshots if helpful

---

## 🔗 Useful Links

- **Celo Mainnet Explorer**: https://celoscan.io
- **Alfajores Testnet Explorer**: https://alfajores.celoscan.io
- **Transaction Status**: Paste your tx hash in the explorer

---

## 💡 Pro Tips

1. **Keep debug mode enabled** during the entire testing session
2. **Export debug data** after each test (successful or failed)
3. **Test with small amounts** first (e.g., $1-2 USD)
4. **Check both approval and purchase** transactions on the explorer
5. **Clear debug sessions** periodically to avoid confusion:
   ```javascript
   clearPaymentDebug()
   ```

---

## 🆘 Emergency Commands

If payment gets stuck:

```javascript
// 1. Check current session
printPaymentDebug()

// 2. Export data for debugging
exportPaymentDebug()

// 3. Disable debug mode
disablePaymentDebug()

// 4. Clear sessions and start fresh
clearPaymentDebug()
```

Then refresh the page and try again.

---

## ✅ Success Checklist

After a successful payment, you should see:

- ✅ All debug steps marked as "success"
- ✅ Two transaction hashes (approval + purchase)
- ✅ Payment confirmed on blockchain explorer
- ✅ Order appears in your account
- ✅ Token balance decreased correctly
- ✅ Duration < 60 seconds

If all checks pass, the payment flow is working correctly! 🎉
