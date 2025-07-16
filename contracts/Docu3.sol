// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract DocumentSign {
    enum Role { Unregistered, Owner, Signer }

    struct Document {
        string ipfsHash;
        address creator;
        address[] signers;
        mapping(address => Role) roles; 
        mapping(address => bool) hasSigned;
        mapping(address => uint256) signedAt;
        mapping(address => string) signatures;
        uint256 createdAt;
        uint256 signatureCount;
        bool isRevoked;
        bool exists;
        uint256 expiry;
        uint256 currentSignerIndex;
    }

    mapping(uint256 => Document) private documents;
    uint256 public documentCount;

    struct UserProfile {
        string firstName;
        string familyName;
        string email;
        uint256 dob; // store as Unix timestamp
        bool isRegistered;
        string publicKey;
    }

    mapping(address => UserProfile) public profiles;
    address[] public registeredUsers;
    mapping(string => address) public emailToAddress;

    event DocumentCreated(
        uint256 indexed docId,
        string ipfsHash,
        address indexed creator,
        address[] signers,
        uint256 createdAt
    );
    event DocumentSigned(
        uint256 indexed docId,
        address indexed signer,
        uint256 signedAt,
        string signature
    );
    event DocumentRevoked(
        uint256 indexed docId,
        address indexed revoker,
        uint256 revokedAt,
        string reason
    );
    event DocumentAmended(
        uint256 indexed docId,
        string newIpfsHash,
        address indexed editor,
        uint256 amendedAt
    );
    event DocumentExpired(uint256 indexed docId, uint256 expiredAt);
    event UserRegistered(address indexed user, string firstName, string familyName, string email, uint256 dob, string publicKey);

    modifier onlySigner(uint256 docId) {
        require(documents[docId].exists, "Document does not exist");
        require(documents[docId].roles[msg.sender] == Role.Signer, "Not authorized signer");
        _;
    }

    modifier onlyOwner(uint256 docId) {
        require(documents[docId].exists, "Document does not exist");
        require(documents[docId].roles[msg.sender] == Role.Owner, "Not document owner");
        _;
    }

    modifier notRevoked(uint256 docId) {
        require(!documents[docId].isRevoked, "Document is revoked");
        _;
    }

    function createDocument(string memory _ipfsHash, address[] memory _signers, uint256 _expiry) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(_signers.length > 0, "At least one signer required");
        require(_expiry == 0 || _expiry > block.timestamp, "Expiry must be in the future");
        documentCount++;
        Document storage doc = documents[documentCount];
        doc.ipfsHash = _ipfsHash;
        doc.creator = msg.sender;
        doc.createdAt = block.timestamp;
        doc.exists = true;
        doc.expiry = _expiry;
        doc.roles[msg.sender] = Role.Owner;
        for (uint i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "Invalid signer address");
            require(_signers[i] != msg.sender, "Owner cannot be signer");
            doc.signers.push(_signers[i]);
            doc.roles[_signers[i]] = Role.Signer;
        }
        emit DocumentCreated(documentCount, _ipfsHash, msg.sender, _signers, block.timestamp);
        return documentCount;
    }

    function isExpired(uint256 _docId) public view returns (bool) {
        Document storage doc = documents[_docId];
        return doc.expiry != 0 && block.timestamp > doc.expiry;
    }

    function signDocument(uint256 _docId, string memory _signature) external onlySigner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        require(!isExpired(_docId), "Document expired");
        require(!doc.hasSigned[msg.sender], "Already signed");
        require(doc.signers[doc.currentSignerIndex] == msg.sender, "Not your turn to sign");
        require(bytes(_signature).length > 0, "Signature required");
        
        doc.hasSigned[msg.sender] = true;
        doc.signedAt[msg.sender] = block.timestamp;
        doc.signatures[msg.sender] = _signature;
        doc.signatureCount++;
        doc.currentSignerIndex++;
        emit DocumentSigned(_docId, msg.sender, block.timestamp, _signature);
    }

    function signDocumentLegacy(uint256 _docId) external onlySigner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        require(!isExpired(_docId), "Document expired");
        require(!doc.hasSigned[msg.sender], "Already signed");
        require(doc.signers[doc.currentSignerIndex] == msg.sender, "Not your turn to sign");
        
        doc.hasSigned[msg.sender] = true;
        doc.signedAt[msg.sender] = block.timestamp;
        doc.signatureCount++;
        doc.currentSignerIndex++;
        emit DocumentSigned(_docId, msg.sender, block.timestamp, "");
    }

    function revokeDocument(uint256 _docId, string memory _reason) external onlyOwner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        doc.isRevoked = true;
        emit DocumentRevoked(_docId, msg.sender, block.timestamp, _reason);
    }

    function hasSigned(uint256 _docId, address _signer) external view returns (bool) {
        return documents[_docId].hasSigned[_signer];
    }

    function getSignTimestamp(uint256 _docId, address _signer) external view returns (uint256) {
        return documents[_docId].signedAt[_signer];
    }

    function getSignature(uint256 _docId, address _signer) external view returns (string memory) {
        return documents[_docId].signatures[_signer];
    }

    function getDocument(uint256 _docId) external view returns (
        string memory ipfsHash,
        address creator,
        address[] memory signers,
        uint256 createdAt,
        uint256 signatureCount,
        bool fullySigned,
        bool isRevoked
    ) {
        Document storage doc = documents[_docId];
        require(doc.exists, "Document does not exist");
        bool allSigned = true;
        for (uint i = 0; i < doc.signers.length; i++) {
            if (!doc.hasSigned[doc.signers[i]]) {
                allSigned = false;
                break;
            }
        }
        return (
            doc.ipfsHash,
            doc.creator,
            doc.signers,
            doc.createdAt,
            doc.signatureCount,
            allSigned,
            doc.isRevoked
        );
    }

    function getRole(uint256 _docId, address _user) external view returns (Role) {
        require(documents[_docId].exists, "Document does not exist");
        return documents[_docId].roles[_user];
    }

    function amendDocument(uint256 _docId, string memory _newIpfsHash, uint256 _newExpiry) external onlyOwner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        require(!isExpired(_docId), "Document expired");
        // Check not fully signed
        bool allSigned = true;
        for (uint i = 0; i < doc.signers.length; i++) {
            if (!doc.hasSigned[doc.signers[i]]) {
                allSigned = false;
                break;
            }
        }
        require(!allSigned, "Cannot amend fully signed document");
        require(bytes(_newIpfsHash).length > 0, "IPFS hash required");
        if (_newExpiry != 0) {
            require(_newExpiry > block.timestamp, "Expiry must be in the future");
            doc.expiry = _newExpiry;
        }
        doc.ipfsHash = _newIpfsHash;
        emit DocumentAmended(_docId, _newIpfsHash, msg.sender, block.timestamp);
    }

    function getCurrentSigner(uint256 _docId) external view returns (address) {
        Document storage doc = documents[_docId];
        require(doc.exists, "Document does not exist");
        if (doc.currentSignerIndex < doc.signers.length) {
            return doc.signers[doc.currentSignerIndex];
        } else {
            return address(0); // All signed
        }
    }

    function verifySignature(
        uint256 _docId, 
        address _signer, 
        bytes32 _documentHash, 
        bytes memory _signature
    ) external view returns (bool) {
        require(documents[_docId].exists, "Document does not exist");
        require(documents[_docId].hasSigned[_signer], "Signer has not signed this document");
        require(_signature.length == 65, "Invalid signature length");
        
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _documentHash));
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature 'v' value");
        
        address recoveredSigner = ecrecover(messageHash, v, r, s);
        
        return recoveredSigner == _signer;
    }

    function registerUser(
        string memory firstName,
        string memory familyName,
        string memory email,
        uint256 dob,
        string memory publicKey
    ) public {
        require(!profiles[msg.sender].isRegistered, "Already registered");
        require(emailToAddress[email] == address(0), "Email already registered");
        profiles[msg.sender] = UserProfile(firstName, familyName, email, dob, true, publicKey);
        registeredUsers.push(msg.sender);
        emailToAddress[email] = msg.sender;
        emit UserRegistered(msg.sender, firstName, familyName, email, dob, publicKey);
    }

    function getUserProfile(address user) public view returns (
        string memory firstName,
        string memory familyName,
        string memory email,
        uint256 dob,
        bool isRegistered,
        string memory publicKey
    ) {
        require(profiles[user].isRegistered, "User not registered");
        UserProfile storage p = profiles[user];
        return (p.firstName, p.familyName, p.email, p.dob, p.isRegistered, p.publicKey);
    }

    function getAllRegisteredUsers() public view returns (address[] memory) {
        return registeredUsers;
    }
} 