// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../Learn2Earn.sol";

// Mock VeBetterDAO X2EarnRewardsPool for testing
contract MockX2EarnRewardsPool is IX2EarnRewardsPool {
    mapping(bytes32 => uint256) public availableFunds;
    mapping(bytes32 => uint256) public totalDistributed;
    
    // Track calls for testing
    struct RewardCall {
        bytes32 appId;
        uint256 amount;
        address receiver;
        string proof;
    }
    
    RewardCall[] public rewardCalls;
    
    function setAvailableFunds(bytes32 appId, uint256 amount) external {
        availableFunds[appId] = amount;
    }
    
    function distributeReward(
        bytes32 appId,
        uint256 amount,
        address receiver,
        string memory proof
    ) external override {
        require(availableFunds[appId] >= amount, "Insufficient funds");
        
        availableFunds[appId] -= amount;
        totalDistributed[appId] += amount;
        
        rewardCalls.push(RewardCall({
            appId: appId,
            amount: amount,
            receiver: receiver,
            proof: proof
        }));
    }
    
    function getRewardCallsCount() external view returns (uint256) {
        return rewardCalls.length;
    }
    
    function getRewardCall(uint256 index) external view returns (
        bytes32 appId,
        uint256 amount,
        address receiver,
        string memory proof
    ) {
        RewardCall storage call = rewardCalls[index];
        return (call.appId, call.amount, call.receiver, call.proof);
    }
}

contract Learn2EarnTest is Test {
    Learn2Earn public learn2Earn;
    MockX2EarnRewardsPool public mockRewardsPool;
    
    address public registrar = address(0x1);
    address public student1 = address(0x2);
    address public student2 = address(0x3);
    address public nonStudent = address(0x4);
    
    bytes32 public constant APP_ID = keccak256("test-app");
    string public constant INSTITUTE_NAME = "VeChain Test Academy";
    uint256 public constant REWARD_AMOUNT = 10 * 10**18; // 10 tokens
    
    event SubmissionReceived(address indexed user, string proof);
    event SubmissionGraded(address indexed user, bool approved);
    event RewardDistributed(address indexed user, uint256 amount);
    event CertificateIssued(string institute, bytes32 certificateHash, address student);
    
    function setUp() public {
        // Deploy mock rewards pool
        mockRewardsPool = new MockX2EarnRewardsPool();
        
        // Set up funds for testing
        mockRewardsPool.setAvailableFunds(APP_ID, 1000 * 10**18);
        
        // Deploy Learn2Earn contract
        vm.prank(registrar);
        learn2Earn = new Learn2Earn(
            INSTITUTE_NAME,
            address(mockRewardsPool),
            APP_ID
        );
        
        // Fund test addresses
        vm.deal(registrar, 10 ether);
        vm.deal(student1, 10 ether);
        vm.deal(student2, 10 ether);
        vm.deal(nonStudent, 10 ether);
    }
    
    function testDeployment() public view {
        assertEq(learn2Earn.institute(), INSTITUTE_NAME);
        assertEq(learn2Earn.appId(), APP_ID);
        assertEq(learn2Earn.rewardAmount(), REWARD_AMOUNT);
        assertEq(address(learn2Earn.x2EarnRewardsPoolContract()), address(mockRewardsPool));
    }
    
    function testStudentRegistration() public {
        // Test successful registration
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        (address wallet, string memory name, string memory familyName, bool registered, bool graduated, bytes32 certificate) = learn2Earn.students(student1);
        
        assertEq(wallet, student1);
        assertEq(name, "John");
        assertEq(familyName, "Doe");
        assertTrue(registered);
        assertFalse(graduated);
        assertEq(certificate, bytes32(0));
    }
    
    function testRegistrationRequiresPayment() public {
        // Test registration with insufficient payment
        vm.prank(student1);
        vm.expectRevert("You must pay 1 VET to register.");
        learn2Earn.addStudent{value: 0.5 ether}("John", "Doe");
        
        // Test registration with excess payment
        vm.prank(student1);
        vm.expectRevert("You must pay 1 VET to register.");
        learn2Earn.addStudent{value: 2 ether}("John", "Doe");
    }
    
    function testDoubleRegistrationFails() public {
        // Register student first time
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        // Try to register again
        vm.prank(student1);
        vm.expectRevert("You are already registered.");
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
    }
    
    function testProofSubmission() public {
        // Register student first
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        // Submit proof
        string memory proof = "https://github.com/student1/project";
        
        vm.prank(student1);
        vm.expectEmit(true, false, false, true);
        emit SubmissionReceived(student1, proof);
        learn2Earn.submitProof(proof);
        
        assertEq(learn2Earn.getSubmission(student1), proof);
    }
    
    function testProofSubmissionRequiresRegistration() public {
        vm.prank(nonStudent);
        vm.expectRevert("You must be a registered student to submit proof.");
        learn2Earn.submitProof("https://github.com/nonStudent/project");
    }
    
    function testEmptyProofFails() public {
        // Register student first
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        // Try to submit empty proof
        vm.prank(student1);
        vm.expectRevert("Proof cannot be empty.");
        learn2Earn.submitProof("");
    }
    
    function testGradingAndRewardDistribution() public {
        // Register student and submit proof
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        // Grade submission (approved)
        vm.prank(registrar);
        vm.expectEmit(true, false, false, true);
        emit SubmissionGraded(student1, true);
        vm.expectEmit(true, false, false, true);
        emit RewardDistributed(student1, REWARD_AMOUNT);
        learn2Earn.gradeSubmission(student1, true);
        
        assertTrue(learn2Earn.isGraded(student1));
        assertTrue(learn2Earn.isRewarded(student1));
        
        // Check reward was distributed
        assertEq(mockRewardsPool.getRewardCallsCount(), 1);
        (bytes32 appId, uint256 amount, address receiver, string memory proof) = mockRewardsPool.getRewardCall(0);
        assertEq(appId, APP_ID);
        assertEq(amount, REWARD_AMOUNT);
        assertEq(receiver, student1);
        assertEq(proof, '{"type":"education","submission":"https://github.com/student1/project","institute":"VeChain Test Academy"}');
    }
    
    function testGradingRejected() public {
        // Register student and submit proof
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        // Grade submission (rejected)
        vm.prank(registrar);
        vm.expectEmit(true, false, false, true);
        emit SubmissionGraded(student1, false);
        learn2Earn.gradeSubmission(student1, false);
        
        assertTrue(learn2Earn.isGraded(student1));
        assertFalse(learn2Earn.isRewarded(student1));
        
        // Check no reward was distributed
        assertEq(mockRewardsPool.getRewardCallsCount(), 0);
    }
    
    function testOnlyRegistrarCanGrade() public {
        // Register student and submit proof
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        // Try to grade as non-registrar
        vm.prank(student2);
        vm.expectRevert("Only the registrar can grade submissions.");
        learn2Earn.gradeSubmission(student1, true);
    }
    
    function testDoubleGradingFails() public {
        // Register student and submit proof
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        // Grade once
        vm.prank(registrar);
        learn2Earn.gradeSubmission(student1, true);
        
        // Try to grade again
        vm.prank(registrar);
        vm.expectRevert("This submission has already been graded.");
        learn2Earn.gradeSubmission(student1, false);
    }
    
    function testCertificateIssuance() public {
        // Register student, submit proof, and get approved
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        vm.prank(registrar);
        learn2Earn.gradeSubmission(student1, true);
        
        // Issue certificate
        vm.prank(registrar);
        vm.expectEmit(true, false, false, false); // Only check the first indexed parameter
        emit CertificateIssued(INSTITUTE_NAME, bytes32(0), student1);
        learn2Earn.issueCertificate(student1);
        
        assertTrue(learn2Earn.isGraduated(student1));
        
        (,,,, bool graduated, bytes32 certificate) = learn2Earn.students(student1);
        assertTrue(graduated);
        assertNotEq(certificate, bytes32(0));
    }
    
    function testCertificateRequiresGrading() public {
        // Register student and submit proof
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        // Try to issue certificate without grading
        vm.prank(registrar);
        vm.expectRevert("Student submission must be graded first.");
        learn2Earn.issueCertificate(student1);
    }
    
    function testInsufficientFunds() public {
        // Set low funds
        mockRewardsPool.setAvailableFunds(APP_ID, 5 * 10**18); // Only 5 tokens, need 10
        
        // Register student and submit proof
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        // Try to grade (should fail due to insufficient funds)
        vm.prank(registrar);
        vm.expectRevert("Insufficient funds in rewards pool");
        learn2Earn.gradeSubmission(student1, true);
    }
    
    function testSetRewardAmount() public {
        uint256 newAmount = 20 * 10**18;
        
        vm.prank(registrar);
        learn2Earn.setRewardAmount(newAmount);
        
        assertEq(learn2Earn.rewardAmount(), newAmount);
    }
    
    function testOnlyRegistrarCanSetRewardAmount() public {
        vm.prank(student1);
        vm.expectRevert("Only the registrar can set reward amount.");
        learn2Earn.setRewardAmount(20 * 10**18);
    }
    
    function testUpdateAppId() public {
        bytes32 newAppId = keccak256("new-app-id");
        
        vm.prank(registrar);
        learn2Earn.updateAppId(newAppId);
        
        assertEq(learn2Earn.appId(), newAppId);
    }
    
    function testWithdrawBalance() public {
        // Register some students to accumulate VET
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student2);
        learn2Earn.addStudent{value: 1 ether}("Jane", "Smith");
        
        // Check contract balance
        assertEq(address(learn2Earn).balance, 2 ether);
        
        // Check registrar balance before withdrawal
        uint256 registrarBalanceBefore = registrar.balance;
        
        // Withdraw
        vm.prank(registrar);
        learn2Earn.withdrawBalance();
        
        // Check balances after withdrawal
        assertEq(address(learn2Earn).balance, 0);
        assertEq(registrar.balance, registrarBalanceBefore + 2 ether);
    }
    
    function testGetAvailableFunds() public view {
        uint256 funds = learn2Earn.getAvailableFunds();
        assertEq(funds, 1000 * 10**18);
    }
    
    function testCompleteWorkflow() public {
        // Student 1: Complete workflow with approval
        vm.prank(student1);
        learn2Earn.addStudent{value: 1 ether}("John", "Doe");
        
        vm.prank(student1);
        learn2Earn.submitProof("https://github.com/student1/project");
        
        vm.prank(registrar);
        learn2Earn.gradeSubmission(student1, true);
        
        vm.prank(registrar);
        learn2Earn.issueCertificate(student1);
        
        // Student 2: Workflow with rejection
        vm.prank(student2);
        learn2Earn.addStudent{value: 1 ether}("Jane", "Smith");
        
        vm.prank(student2);
        learn2Earn.submitProof("https://github.com/student2/project");
        
        vm.prank(registrar);
        learn2Earn.gradeSubmission(student2, false);
        
        // Verify final states
        assertTrue(learn2Earn.isGraduated(student1));
        assertTrue(learn2Earn.isRewarded(student1));
        assertFalse(learn2Earn.isGraduated(student2));
        assertFalse(learn2Earn.isRewarded(student2));
        
        // Check only one reward was distributed
        assertEq(mockRewardsPool.getRewardCallsCount(), 1);
    }
}