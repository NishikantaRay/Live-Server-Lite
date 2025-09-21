#!/bin/bash

# IDE Compatibility Test Runner
# Runs comprehensive compatibility tests for Live Server Lite extension

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Live Server Lite - IDE Compatibility Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run from extension root directory.${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Ensure tests are compiled
echo -e "${YELLOW}🔨 Compiling tests...${NC}"
npm run compile-tests

echo ""
echo -e "${GREEN}🚀 Running IDE Compatibility Tests...${NC}"
echo ""

# Function to run a test suite and report results
run_test_suite() {
    local test_name="$1"
    local test_pattern="$2"
    
    echo -e "${BLUE}🧪 Running: ${test_name}${NC}"
    echo "----------------------------------------"
    
    if npm run test -- --grep "$test_pattern" 2>&1; then
        echo -e "${GREEN}✅ ${test_name} - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${test_name} - FAILED${NC}"
        return 1
    fi
    echo ""
}

# Track test results
total_tests=0
passed_tests=0

# Run each test suite
echo -e "${YELLOW}1. IDE Compatibility Tests${NC}"
if run_test_suite "IDE Compatibility" "IDE Compatibility Tests"; then
    ((passed_tests++))
fi
((total_tests++))

echo -e "${YELLOW}2. VS Code API Version Compatibility${NC}"
if run_test_suite "API Version Compatibility" "VS Code API Version Compatibility"; then
    ((passed_tests++))
fi
((total_tests++))

echo -e "${YELLOW}3. Marketplace Compatibility${NC}"
if run_test_suite "Marketplace Compatibility" "Marketplace Compatibility Tests"; then
    ((passed_tests++))
fi
((total_tests++))

echo -e "${YELLOW}4. Cross-Platform Compatibility${NC}"
if run_test_suite "Cross-Platform Compatibility" "Cross-Platform Compatibility Tests"; then
    ((passed_tests++))
fi
((total_tests++))

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "======================================="
echo -e "Total Test Suites: ${total_tests}"
echo -e "Passed: ${GREEN}${passed_tests}${NC}"
echo -e "Failed: ${RED}$((total_tests - passed_tests))${NC}"

if [ $passed_tests -eq $total_tests ]; then
    echo ""
    echo -e "${GREEN}🎉 All compatibility tests passed!${NC}"
    echo -e "${GREEN}Your extension is compatible with multiple IDEs.${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above for details.${NC}"
    exit 1
fi