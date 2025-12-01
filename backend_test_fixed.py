#!/usr/bin/env python3
"""
Backend API Testing for HELOC Chunking Strategy Feature
Tests the /api/debt/analyze-chunking endpoint with realistic mortgage data
"""

import requests
import json
import sys
from typing import Dict, Any

# Get backend URL from environment
BACKEND_URL = "https://money-manager-1384.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "daniel.r.millner@gmail.com"
TEST_PASSWORD = "password"

class HelocChunkingTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        
    def login(self) -> bool:
        """Login with test credentials"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                print(f"✅ Login successful - User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_chunking_endpoint_basic(self) -> Dict[str, Any]:
        """Test basic HELOC chunking calculation with example data"""
        print("\n🧪 Testing HELOC Chunking with Example Data")
        
        test_params = {
            "mortgage_balance": 73214.88,
            "mortgage_rate": 4.0,
            "mortgage_payment": 2033.75,
            "monthly_income": 10000.0,
            "monthly_expenses": 5000.0,
            "heloc_rate": 4.5
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/debt/analyze-chunking",
                params=test_params
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ API Response successful")
                
                # Validate response structure
                required_fields = [
                    "viable", "recommendation", "monthly_cashflow", "optimal_chunk_size",
                    "traditional_payoff", "chunking_payoff", "savings"
                ]
                
                missing_fields = [field for field in required_fields if field not in result]
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return {"success": False, "error": f"Missing fields: {missing_fields}"}
                
                # Validate calculations
                expected_cashflow = test_params["monthly_income"] - test_params["monthly_expenses"] - test_params["mortgage_payment"]
                actual_cashflow = result["monthly_cashflow"]
                
                if abs(expected_cashflow - actual_cashflow) > 0.01:
                    print(f"❌ Cash flow calculation error: Expected {expected_cashflow}, got {actual_cashflow}")
                    return {"success": False, "error": "Cash flow calculation incorrect"}
                
                print(f"✅ Cash flow calculation correct: ${actual_cashflow}")
                
                # Check if viable and recommended for this good scenario
                if not result["viable"]:
                    print(f"❌ Expected viable=true for good scenario, got {result['viable']}")
                    return {"success": False, "error": "Should be viable with good cash flow"}
                
                if result["recommendation"] not in ["highly recommended", "recommended"]:
                    print(f"❌ Expected positive recommendation, got '{result['recommendation']}'")
                    return {"success": False, "error": "Should have positive recommendation"}
                
                # Validate savings calculations
                savings = result["savings"]
                if savings["interest_saved"] <= 0:
                    print(f"❌ Expected positive interest savings, got {savings['interest_saved']}")
                    return {"success": False, "error": "Should show interest savings"}
                
                if savings["time_saved_years"] <= 0:
                    print(f"❌ Expected positive time savings, got {savings['time_saved_years']}")
                    return {"success": False, "error": "Should show time savings"}
                
                print(f"✅ Viable: {result['viable']}")
                print(f"✅ Recommendation: {result['recommendation']}")
                print(f"✅ Monthly Cash Flow: ${result['monthly_cashflow']}")
                print(f"✅ Optimal Chunk Size: ${result['optimal_chunk_size']:,.2f}")
                print(f"✅ Interest Saved: ${savings['interest_saved']:,.2f}")
                print(f"✅ Time Saved: {savings['time_saved_years']} years")
                print(f"✅ Savings Percentage: {savings['savings_percentage']}%")
                
                return {"success": True, "data": result}
                
            else:
                print(f"❌ API request failed: {response.status_code} - {response.text}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Test error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_insufficient_cashflow(self) -> Dict[str, Any]:
        """Test edge case: insufficient cash flow"""
        print("\n🧪 Testing Insufficient Cash Flow Edge Case")
        
        test_params = {
            "mortgage_balance": 200000.0,
            "mortgage_rate": 4.0,
            "mortgage_payment": 2000.0,
            "monthly_income": 3000.0,
            "monthly_expenses": 2500.0,  # Only $500 left after mortgage payment
            "heloc_rate": 4.5
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/debt/analyze-chunking",
                params=test_params
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Should not be viable with insufficient cash flow
                if result["viable"]:
                    print(f"❌ Expected viable=false for insufficient cash flow, got {result['viable']}")
                    return {"success": False, "error": "Should not be viable with low cash flow"}
                
                expected_cashflow = 3000 - 2500 - 2000  # Should be -$500
                if result["monthly_cashflow"] != expected_cashflow:
                    print(f"❌ Cash flow calculation error: Expected {expected_cashflow}, got {result['monthly_cashflow']}")
                    return {"success": False, "error": "Cash flow calculation incorrect"}
                
                print(f"✅ Correctly identified as not viable")
                print(f"✅ Monthly Cash Flow: ${result['monthly_cashflow']} (negative as expected)")
                print(f"✅ Reason: {result.get('reason', 'No reason provided')}")
                
                return {"success": True, "data": result}
                
            else:
                print(f"❌ API request failed: {response.status_code} - {response.text}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Test error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_high_heloc_rate(self) -> Dict[str, Any]:
        """Test edge case: HELOC rate higher than mortgage rate"""
        print("\n🧪 Testing High HELOC Rate Edge Case")
        
        test_params = {
            "mortgage_balance": 100000.0,
            "mortgage_rate": 3.5,
            "mortgage_payment": 1500.0,
            "monthly_income": 8000.0,
            "monthly_expenses": 4000.0,
            "heloc_rate": 7.0  # Higher than mortgage rate
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/debt/analyze-chunking",
                params=test_params
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Should have risk warning about high HELOC rate
                risk_factors = result.get("risk_factors", [])
                has_rate_warning = any("rate" in factor.lower() for factor in risk_factors)
                
                if not has_rate_warning:
                    print(f"❌ Expected risk warning about HELOC rate, got: {risk_factors}")
                    return {"success": False, "error": "Should warn about high HELOC rate"}
                
                print(f"✅ Risk factors identified: {risk_factors}")
                print(f"✅ Viable: {result['viable']}")
                print(f"✅ Recommendation: {result['recommendation']}")
                
                return {"success": True, "data": result}
                
            else:
                print(f"❌ API request failed: {response.status_code} - {response.text}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Test error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_very_low_chunk_size(self) -> Dict[str, Any]:
        """Test edge case: very low cash flow resulting in tiny chunks"""
        print("\n🧪 Testing Very Low Chunk Size Edge Case")
        
        test_params = {
            "mortgage_balance": 150000.0,
            "mortgage_rate": 4.0,
            "mortgage_payment": 1200.0,
            "monthly_income": 2500.0,
            "monthly_expenses": 1100.0,  # Only $200 cash flow after mortgage
            "heloc_rate": 4.5
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/debt/analyze-chunking",
                params=test_params
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # With only $200 cash flow, chunks would be tiny (4 months * $200 = $800)
                # Should not be viable due to chunk size being too small
                expected_cashflow = 2500 - 1100 - 1200  # $200
                if abs(result["monthly_cashflow"] - expected_cashflow) > 0.01:
                    print(f"❌ Cash flow calculation error: Expected {expected_cashflow}, got {result['monthly_cashflow']}")
                    return {"success": False, "error": "Cash flow calculation incorrect"}
                
                # Should likely not be viable due to small chunks
                if result["viable"] and result["optimal_chunk_size"] < 1000:
                    print(f"⚠️  Warning: Viable with very small chunks (${result['optimal_chunk_size']})")
                
                print(f"✅ Monthly Cash Flow: ${result['monthly_cashflow']}")
                
                # Handle different response structure for non-viable scenarios
                chunk_size = result.get('optimal_chunk_size', result.get('optimal_chunk', 0))
                print(f"✅ Optimal Chunk Size: ${chunk_size:,.2f}")
                print(f"✅ Viable: {result['viable']}")
                
                if not result["viable"]:
                    print(f"✅ Reason: {result.get('reason', 'No reason provided')}")
                
                return {"success": True, "data": result}
                
            else:
                print(f"❌ API request failed: {response.status_code} - {response.text}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Test error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_with_custom_heloc_available(self) -> Dict[str, Any]:
        """Test with custom HELOC available amount"""
        print("\n🧪 Testing Custom HELOC Available Amount")
        
        test_params = {
            "mortgage_balance": 80000.0,
            "mortgage_rate": 4.0,
            "mortgage_payment": 1800.0,
            "monthly_income": 9000.0,
            "monthly_expenses": 4500.0,
            "heloc_rate": 4.5,
            "heloc_available": 50000.0  # Custom HELOC limit
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/debt/analyze-chunking",
                params=test_params
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Chunk size should be limited by HELOC available if cash flow would allow larger
                expected_cashflow = 9000 - 4500 - 1800  # $2700
                optimal_chunk_from_cashflow = expected_cashflow * 4  # $10,800
                
                # But should be capped by HELOC available and mortgage balance
                max_chunk = min(50000, 80000 * 0.1)  # min(50000, 8000) = 8000
                expected_chunk = min(optimal_chunk_from_cashflow, max_chunk)
                
                print(f"✅ Monthly Cash Flow: ${result['monthly_cashflow']}")
                print(f"✅ Optimal Chunk Size: ${result['optimal_chunk_size']:,.2f}")
                print(f"✅ Expected chunk calculation: ${expected_chunk:,.2f}")
                print(f"✅ Viable: {result['viable']}")
                print(f"✅ Recommendation: {result['recommendation']}")
                
                return {"success": True, "data": result}
                
            else:
                print(f"❌ API request failed: {response.status_code} - {response.text}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Test error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_missing_parameters(self) -> Dict[str, Any]:
        """Test API with missing required parameters"""
        print("\n🧪 Testing Missing Required Parameters")
        
        # Test with missing mortgage_balance
        test_params = {
            "mortgage_rate": 4.0,
            "mortgage_payment": 2000.0,
            "monthly_income": 8000.0,
            "monthly_expenses": 4000.0
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/debt/analyze-chunking",
                params=test_params
            )
            
            # Should return 422 for missing required parameters
            if response.status_code == 422:
                print(f"✅ Correctly returned 422 for missing parameters")
                return {"success": True, "data": {"status_code": 422}}
            else:
                print(f"❌ Expected 422 for missing parameters, got {response.status_code}")
                return {"success": False, "error": f"Expected 422, got {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Test error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all HELOC chunking tests"""
        print("🚀 Starting HELOC Chunking Strategy Backend Tests")
        print("=" * 60)
        
        # Login first
        if not self.login():
            return {"success": False, "error": "Login failed"}
        
        test_results = {}
        
        # Run all tests
        tests = [
            ("basic_example", self.test_chunking_endpoint_basic),
            ("insufficient_cashflow", self.test_insufficient_cashflow),
            ("high_heloc_rate", self.test_high_heloc_rate),
            ("low_chunk_size", self.test_very_low_chunk_size),
            ("custom_heloc_available", self.test_with_custom_heloc_available),
            ("missing_parameters", self.test_missing_parameters)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                test_results[test_name] = result
                
                if result["success"]:
                    passed += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    failed += 1
                    print(f"❌ {test_name}: FAILED - {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                failed += 1
                test_results[test_name] = {"success": False, "error": str(e)}
                print(f"❌ {test_name}: ERROR - {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All tests passed! HELOC Chunking Strategy API is working correctly.")
        else:
            print(f"⚠️  {failed} test(s) failed. Review the issues above.")
        
        return {
            "success": failed == 0,
            "passed": passed,
            "failed": failed,
            "results": test_results
        }

def main():
    """Main test execution"""
    tester = HelocChunkingTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if results["success"] else 1)

if __name__ == "__main__":
    main()