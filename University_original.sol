// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract University {

    // The address of the registrar (contract creator)
    address private registrar;

    // The name of the university
    string public institute;

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

    // Event triggered when a certificate is issued
    event CertificateIssued(string institute, bytes32 certificateHash, address student);

    // Set the university name and registrar when contract is deployed
    constructor(string memory _institute) {
        registrar = msg.sender;
        institute = _institute;
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

    // Registrar can mark a student as graduated
    function issueCertificate(address studentAddress) public {
        require(msg.sender == registrar, "Only the registrar can issue certificates.");

        if (_checkStudent(studentAddress)){
            Student storage student = students[studentAddress];
            require(!student.graduated, "This student has already graduated.");
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
}