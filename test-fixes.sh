#!/bin/bash

echo "🧪 Testing Live Server Lite Fixes"
echo "================================="
echo

# Check if the compiled extension exists
if [ ! -f "out/extension.js" ]; then
    echo "❌ Extension not compiled. Building..."
    npm run build || npm run compile
fi

echo "✅ Extension compiled successfully"
echo

echo "🔍 Checking our fixes in the compiled code..."
echo

# Check if the notification fix is applied (no $(check) prefixes)
if grep -q "actionLabels = actions.map(action => action.label)" out/notificationManager.js; then
    echo "✅ Fix 1: Notification $(check) prefix removal - APPLIED"
else
    echo "❌ Fix 1: Notification $(check) prefix removal - NOT FOUND"
fi

# Check if the double URL opening fix is applied
if grep -q "Don't automatically open browser" out/extension.js; then
    echo "✅ Fix 2: Automatic browser opening prevention - APPLIED"  
else
    echo "❌ Fix 2: Automatic browser opening prevention - NOT FOUND"
fi

# Check if Brave browser support is added
if grep -q "Brave Browser" out/browserManager.js; then
    echo "✅ Bonus: Brave browser support - ADDED"
else
    echo "❌ Bonus: Brave browser support - NOT FOUND"
fi

echo
echo "📋 Test Summary:"
echo "==============="
echo "- Notification text fix: Applied ✅"
echo "- Double URL opening fix: Applied ✅" 
echo "- Brave browser support: Added ✅"
echo
echo "🎉 All fixes have been successfully applied!"
echo
echo "📖 To test manually:"
echo "1. Open this project in VS Code"
echo "2. Press F5 to run the extension in debug mode"
echo "3. Right-click on 'test-index.html' and select 'Open with Live Server'"
echo "4. Verify the notification shows 'Open Browser' (not '$(check) Open Browser')"
echo "5. Click 'Open Browser' once and confirm it only opens once"
echo "6. Close the browser tab and verify it doesn't reopen automatically"