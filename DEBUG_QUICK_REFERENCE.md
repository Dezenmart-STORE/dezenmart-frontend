# 🚀 Payment Debug Quick Reference

## Open Console First!
Press `F12` → Click "Console" tab

---

## 📝 Copy & Paste These Commands

### Before Testing
```javascript
// Enable debug mode (do this FIRST)
enablePaymentDebug()
```

### After Each Test
```javascript
// View what happened
printPaymentDebug()

// Download debug file (for bug reports)
exportPaymentDebug()
```

### If Errors Occur
```javascript
// Get help understanding the error
// (The error will be in the console above)
analyzeError(/* paste error here */)

// Export complete debug data
exportPaymentDebug()
```

### Clean Up
```javascript
// Clear old sessions
clearPaymentDebug()

// Turn off debug mode
disablePaymentDebug()
```

---

## ✅ What You Should See (Success)

```
🔍 Payment Debugger ENABLED
🎬 Payment Debug Session Started: pay_...
⏳ [Debug] Payment initiated { product: "...", amount: 25.49 }
✅ [Debug] Wallet connected
✅ [Debug] Trade validation
✅ [Debug] Token approval (if needed)
✅ [Debug] Purchase completed
🏁 Payment Debug Session Ended: SUCCESS
⏱️ Duration: 45.23s
```

---

## ❌ What You Should NOT See (Problems)

```
❌ [Debug] Trade validation { error: "..." }
❌ [Debug] Payment failed
🏁 Payment Debug Session Ended: FAILED
```

**If you see this** → Run `exportPaymentDebug()` and save the file!

---

## 📋 Testing Checklist

1. ✅ Open console (F12)
2. ✅ Run: `enablePaymentDebug()`
3. ✅ Login to Dezenmart
4. ✅ Connect wallet
5. ✅ Try to buy something
6. ✅ Run: `printPaymentDebug()`
7. ✅ Run: `exportPaymentDebug()`
8. ✅ Share the downloaded JSON file if there were errors

---

## 🔗 Transaction Links

After payment, check your transactions:
- **Mainnet**: https://celoscan.io
- **Testnet**: https://alfajores.celoscan.io

Paste your transaction hash (0x...) in the search box.

---

## 💡 Pro Tip

Keep debug mode ON during your entire testing session:
```javascript
enablePaymentDebug()  // Once at the start

// Test as much as you want...

exportPaymentDebug()  // At the end
```

The debugger tracks EVERY payment attempt, so you get a complete history!

---

## 🆘 Need Help?

1. Copy **all** console logs (Ctrl+A in console, Ctrl+C)
2. Run `exportPaymentDebug()` to download debug file
3. Share both with the development team

The debug file contains EVERYTHING needed to find the problem!
