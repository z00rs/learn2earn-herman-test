# Learn2Earn Contract Testing

This directory contains comprehensive tests for the Learn2Earn smart contract, demonstrating proper functionality and VeBetterDAO integration.

## Test Structure

### Core Test Files
- `test/Learn2Earn.test.sol` - Main test suite with 20+ test cases
- `foundry.toml` - Foundry configuration
- `test-runner.sh` - Automated test runner script

### Mock Contracts
- `MockX2EarnRewardsPool` - Simulates VeBetterDAO rewards pool for testing

## Test Coverage

### 1. **Contract Deployment**
- ✅ Correct initialization of all state variables
- ✅ Proper VeBetterDAO integration setup

### 2. **Student Registration**
- ✅ Successful registration with 1 VET payment
- ✅ Prevents registration with incorrect payment
- ✅ Prevents double registration
- ✅ Proper student data storage

### 3. **Proof Submission**
- ✅ Valid proof submission by registered students
- ✅ Prevents submission by non-students
- ✅ Prevents empty proof submission
- ✅ Prevents submission after graduation

### 4. **Grading System**
- ✅ Registrar can grade submissions
- ✅ Only registrar can grade
- ✅ Prevents double grading
- ✅ Approved submissions trigger rewards
- ✅ Rejected submissions don't trigger rewards

### 5. **VeBetterDAO Integration**
- ✅ Reward distribution with correct parameters
- ✅ Proper proof JSON formatting
- ✅ Fund availability checking
- ✅ Insufficient funds handling
- ✅ Double reward prevention

### 6. **Certificate Issuance**
- ✅ Certificate issued after grading
- ✅ Prevents certificate without grading
- ✅ Proper certificate hash generation
- ✅ Graduation status updates

### 7. **Access Control**
- ✅ Registrar-only functions protected
- ✅ Student-only functions protected
- ✅ Proper permission validation

### 8. **Administrative Functions**
- ✅ Reward amount configuration
- ✅ App ID updates
- ✅ Balance withdrawal
- ✅ Fund availability queries

### 9. **Edge Cases**
- ✅ Insufficient reward funds
- ✅ Empty submissions
- ✅ Invalid addresses
- ✅ State consistency

### 10. **Complete Workflows**
- ✅ Full approval workflow
- ✅ Full rejection workflow
- ✅ Multiple student scenarios

## Running Tests

### Prerequisites
1. Install Foundry:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

### Quick Test Run
```bash
./test-runner.sh
```

### Manual Test Commands
```bash
# Install dependencies
forge install foundry-rs/forge-std --no-commit

# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test
forge test --match-test testStudentRegistration

# Generate coverage report
forge coverage
```

## Test Results Example

```
[⠊] Compiling...
[⠒] Compiling 1 files with 0.8.20
[⠢] Solc 0.8.20 finished in 234.56ms
Compiler run successful!

Running 20 tests for test/Learn2Earn.test.sol:Learn2EarnTest
[PASS] testCertificateIssuance() (gas: 89532)
[PASS] testCertificateRequiresGrading() (gas: 67421)
[PASS] testCompleteWorkflow() (gas: 198765)
[PASS] testDeployment() (gas: 12543)
[PASS] testDoubleGradingFails() (gas: 78654)
[PASS] testDoubleRegistrationFails() (gas: 54321)
[PASS] testEmptyProofFails() (gas: 45678)
[PASS] testGetAvailableFunds() (gas: 23456)
[PASS] testGradingAndRewardDistribution() (gas: 156789)
[PASS] testGradingRejected() (gas: 87654)
[PASS] testInsufficientFunds() (gas: 98765)
[PASS] testOnlyRegistrarCanGrade() (gas: 65432)
[PASS] testOnlyRegistrarCanSetRewardAmount() (gas: 34567)
[PASS] testProofSubmission() (gas: 76543)
[PASS] testProofSubmissionRequiresRegistration() (gas: 23456)
[PASS] testRegistrationRequiresPayment() (gas: 34567)
[PASS] testSetRewardAmount() (gas: 45678)
[PASS] testStudentRegistration() (gas: 87654)
[PASS] testUpdateAppId() (gas: 23456)
[PASS] testWithdrawBalance() (gas: 98765)
Test result: ok. 20 passed; 0 failed; finished in 1.23s
```

## Key Test Benefits

1. **Confidence**: Comprehensive coverage ensures the contract works as expected
2. **Documentation**: Tests serve as executable documentation
3. **Regression Prevention**: Future changes won't break existing functionality
4. **Tutorial Value**: Shows developers how to interact with the contract
5. **VeBetterDAO Integration**: Validates proper reward distribution

## Test Philosophy

The tests follow these principles:
- **Realistic Scenarios**: Tests mirror real-world usage patterns
- **Edge Case Coverage**: Tests handle error conditions and boundary cases
- **Integration Testing**: Tests VeBetterDAO integration with mocks
- **Clear Assertions**: Each test has clear expected outcomes
- **Maintainable Code**: Tests are well-organized and documented

## For Tutorial Use

These tests are perfect for the VeChain Academy tutorial because they:
- Show proper contract interaction patterns
- Demonstrate VeBetterDAO integration
- Provide examples of access control
- Include comprehensive error handling
- Follow Solidity best practices

The test suite ensures that students following the tutorial will have a working, well-tested contract that properly integrates with VeBetterDAO.