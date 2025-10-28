// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Interface for VeBetterDAO X2EarnRewardsPool
interface IX2EarnRewardsPool {
    function distributeReward(
        bytes32 appId,
        uint256 amount,
        address receiver,
        string memory proof
    ) external;
    
    function availableFunds(bytes32 appId) external view returns (uint256);
}

contract Learn2Earn {

    // The address of the registrar (contract creator)
    address private registrar;

    // The name of the university
    string public institute;
    
    // VeBetterDAO integration
    IX2EarnRewardsPool public x2EarnRewardsPoolContract;
    bytes32 public appId;
    uint256 public rewardAmount = 10 * 10**18; // 10 B3TR tokens per approved submission

    // Structure to store student information
    struct Student {
        address wallet;         // Student's wallet address
        string name;            // First name
        string familyName;      // Last name
        bool registered;        // True if student is registered
        bool graduated;         // True if student has graduated
        bytes32 certificate;    // Certificate hash (created when student graduates)
    }

    // Mapping from wallet address to student data
    mapping(address => Student) public students;

    // NEW: Mapping to store proof submissions
    mapping(address => string) public submissions;
    
    // NEW: Mapping to track if submission has been graded
    mapping(address => bool) public graded;
    
    // NEW: Mapping to track if student has been rewarded
    mapping(address => bool) public rewarded;

    // Event triggered when a certificate is issued
    event CertificateIssued(string institute, bytes32 certificateHash, address student);
    
    // NEW: Event triggered when a proof is submitted
    event SubmissionReceived(address indexed user, string proof);
    
    // NEW: Event triggered when a submission is graded and approved
    event SubmissionGraded(address indexed user, bool approved);
    
    // NEW: Event triggered when rewards are distributed
    event RewardDistributed(address indexed user, uint256 amount);

    // Set the university name, registrar, and VeBetterDAO details when contract is deployed
    constructor(
        string memory _institute,
        address _x2EarnRewardsPoolContract,
        bytes32 _appId
    ) {
        registrar = msg.sender;
        institute = _institute;
        x2EarnRewardsPoolContract = IX2EarnRewardsPool(_x2EarnRewardsPoolContract);
        appId = _appId;
    }

    // Function for students to register by paying 1 VET
    function addStudent(string memory _name, string memory _familyName) public payable {
        require(msg.value == 1 ether, "You must pay 1 VET to register.");

        // Make sure the student isn't already registered
        require(!students[msg.sender].registered, "You are already registered.");

        // Create a new student record
        students[msg.sender] = Student({
            wallet: msg.sender,
            name: _name,
            familyName: _familyName,
            registered: true,
            graduated: false,
            certificate: 0
        });
    }

    function _checkStudent(address studentAddress) view private returns (bool){
        Student storage student = students[studentAddress];
        require(student.registered, "This person is not a registered student.");
        return true;
    }

    // NEW: Function for students to submit proof of learning completion
    function submitProof(string memory proof) public {
        require(students[msg.sender].registered, "You must be a registered student to submit proof.");
        require(!students[msg.sender].graduated, "You have already graduated.");
        require(bytes(proof).length > 0, "Proof cannot be empty.");
        
        // Store the submission
        submissions[msg.sender] = proof;
        
        // Emit event
        emit SubmissionReceived(msg.sender, proof);
    }

    // NEW: Function for registrar to grade submissions and trigger rewards
    function gradeSubmission(address studentAddress, bool approved) public {
        require(msg.sender == registrar, "Only the registrar can grade submissions.");
        require(students[studentAddress].registered, "This person is not a registered student.");
        // NOTE: Submission verification is done off-chain in the backend
        // require(bytes(submissions[studentAddress]).length > 0, "No submission found for this student.");
        require(!graded[studentAddress], "This submission has already been graded.");
        
        // Mark as graded
        graded[studentAddress] = true;
        
        // Emit grading event
        emit SubmissionGraded(studentAddress, approved);
        
        if (approved && !rewarded[studentAddress]) {
            // Distribute VeBetterDAO rewards
            _distributeReward(studentAddress);
        }
    }
    
    // NEW: Internal function to distribute VeBetterDAO rewards
    function _distributeReward(address studentAddress) private {
        require(rewardAmount > 0, "Reward amount must be greater than 0");
        require(
            rewardAmount <= x2EarnRewardsPoolContract.availableFunds(appId),
            "Insufficient funds in rewards pool"
        );
        
        // Mark as rewarded to prevent double rewards
        rewarded[studentAddress] = true;
        
        // Create proof string with submission info
        string memory proof = string(abi.encodePacked(
            '{"type":"education","submission":"',
            submissions[studentAddress],
            '","institute":"',
            institute,
            '"}'
        ));
        
        // Call VeBetterDAO to distribute rewards
        x2EarnRewardsPoolContract.distributeReward(
            appId,
            rewardAmount,
            studentAddress,
            proof
        );
        
        emit RewardDistributed(studentAddress, rewardAmount);
    }

    // Registrar can mark a student as graduated (after grading)
    function issueCertificate(address studentAddress) public {
        require(msg.sender == registrar, "Only the registrar can issue certificates.");

        if (_checkStudent(studentAddress)){
            Student storage student = students[studentAddress];
            require(!student.graduated, "This student has already graduated.");
            
            // NEW: Ensure submission was graded and approved before issuing certificate
            require(graded[studentAddress], "Student submission must be graded first.");
            
            // Create a certificate and mark as graduated
            student.certificate = keccak256(abi.encodePacked(block.timestamp, student.wallet));
            student.graduated = true;

            // Emit event
            emit CertificateIssued(institute, student.certificate, student.wallet);
        }
    }

    // Check if a student has graduated
    function isGraduated(address studentAddress) public view returns (bool) {
        return students[studentAddress].graduated;
    }
    
    // NEW: Get a student's submission
    function getSubmission(address studentAddress) public view returns (string memory) {
        return submissions[studentAddress];
    }
    
    // NEW: Check if a submission has been graded
    function isGraded(address studentAddress) public view returns (bool) {
        return graded[studentAddress];
    }
    
    // NEW: Check if a student has been rewarded
    function isRewarded(address studentAddress) public view returns (bool) {
        return rewarded[studentAddress];
    }
    
    // NEW: Get available funds in the rewards pool
    function getAvailableFunds() public view returns (uint256) {
        return x2EarnRewardsPoolContract.availableFunds(appId);
    }
    
    // NEW: Registrar can set reward amount
    function setRewardAmount(uint256 _amount) public {
        require(msg.sender == registrar, "Only the registrar can set reward amount.");
        require(_amount > 0, "Amount must be greater than 0.");
        rewardAmount = _amount;
    }
    
    // NEW: Registrar can update app ID
    function updateAppId(bytes32 _appId) public {
        require(msg.sender == registrar, "Only the registrar can update app ID.");
        appId = _appId;
    }
    
    // NEW: Registrar can withdraw collected VET from student registrations
    function withdrawBalance() public {
        require(msg.sender == registrar, "Only the registrar can withdraw.");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw.");
        (bool success, ) = payable(registrar).call{value: balance}("");
        require(success, "Transfer failed.");
    }
}