// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// DocumentSign contract for managing document signing and user registration
contract DocumentSign {
    // define user roles in the system
    enum Role { Unregistered, Owner, Signer }

    // structure to store document information
    struct Document {
        string ipfsHash; // IPFS hash of the document
        address creator; // address of document creator
        address[] signers; // array of signer addresses
        mapping(address => Role) roles; // mapping of user roles
        mapping(address => bool) hasSigned; // track if user has signed
        mapping(address => uint256) signedAt; // timestamp when user signed
        mapping(address => string) signatures; // store user signatures
        uint256 createdAt; // document creation timestamp
        uint256 signatureCount; // count of signatures received
        bool isRevoked; // document revocation status
        bool exists; // document existence flag
        uint256 expiry; // document expiry timestamp
        uint256 currentSignerIndex; // current signer in sequence
    }

    // mapping to store documents by ID
    mapping(uint256 => Document) private documents;
    uint256 public documentCount; // total number of documents

    // structure to store user profile information
    struct UserProfile {
        string firstName;
        string familyName;
        string email;
        uint256 dob; 
        bool isRegistered;
        string publicKey;
    }

    // mapping to store user profiles by address
    mapping(address => UserProfile) public profiles;
    address[] public registeredUsers; // array of registered user addresses
    mapping(string => address) public emailToAddress; // email to address mapping

    // events for document 
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

    // check if user is a signer
    modifier onlySigner(uint256 docId) {
        require(documents[docId].exists, "Document does not exist");
        require(documents[docId].roles[msg.sender] == Role.Signer, "Not authorized signer");
        _;
    }

    // check if user is document owner
    modifier onlyOwner(uint256 docId) {
        require(documents[docId].exists, "Document does not exist");
        require(documents[docId].roles[msg.sender] == Role.Owner, "Not document owner");
        _;
    }

    // check if document is not revoked
    modifier notRevoked(uint256 docId) {
        require(!documents[docId].isRevoked, "Document is revoked");
        _;
    }

    // create new document with signers and expiry
    function createDocument(string memory _ipfsHash, address[] memory _signers, uint256 _expiry) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(_expiry == 0 || _expiry > block.timestamp, "Expiry must be in the future");
        documentCount++;
        Document storage doc = documents[documentCount];
        doc.ipfsHash = _ipfsHash;
        doc.creator = msg.sender;
        doc.createdAt = block.timestamp;
        doc.exists = true;
        doc.expiry = _expiry;
        doc.roles[msg.sender] = Role.Owner;
        
        // allow single user signing (creator can be the only signer)
        if (_signers.length == 0) {
            // single user document - creator is the only signer
            doc.signers.push(msg.sender);
            doc.roles[msg.sender] = Role.Signer;
        } else {
            // multi-user document
            for (uint i = 0; i < _signers.length; i++) {
                require(_signers[i] != address(0), "Invalid signer address");
                doc.signers.push(_signers[i]);
                doc.roles[_signers[i]] = Role.Signer;
            }
        }
        emit DocumentCreated(documentCount, _ipfsHash, msg.sender, doc.signers, block.timestamp);
        return documentCount;
    }

    // check if document has expired
    function isExpired(uint256 _docId) public view returns (bool) {
        Document storage doc = documents[_docId];
        return doc.expiry != 0 && block.timestamp > doc.expiry;
    }

    // sign document with cryptographic signature
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

    // legacy signing function without cryptographic signature
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

    // revoke document by owner
    function revokeDocument(uint256 _docId, string memory _reason) external onlyOwner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        doc.isRevoked = true;
        emit DocumentRevoked(_docId, msg.sender, block.timestamp, _reason);
    }

    // check if user has signed a document
    function hasSigned(uint256 _docId, address _signer) external view returns (bool) {
        return documents[_docId].hasSigned[_signer];
    }

    // get timestamp when user signed
    function getSignTimestamp(uint256 _docId, address _signer) external view returns (uint256) {
        return documents[_docId].signedAt[_signer];
    }

    // get user's signature for a document
    function getSignature(uint256 _docId, address _signer) external view returns (string memory) {
        return documents[_docId].signatures[_signer];
    }

    // get full document info
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

<<<<<<< Updated upstream
=======
    // get document expiry timestamp
    function getDocumentExpiry(uint256 _docId) external view returns (uint256) {
        require(documents[_docId].exists, "Document does not exist");
        return documents[_docId].expiry;
    }

    // get document expiry status with additional info
    function getDocumentExpiryInfo(uint256 _docId) external view returns (
        uint256 expiry,
        bool expired,
        uint256 timeUntilExpiry,
        bool hasExpiry
    ) {
        Document storage doc = documents[_docId];
        require(doc.exists, "Document does not exist");
        
        uint256 currentTime = block.timestamp;
        uint256 docExpiry = doc.expiry;
        bool docExpired = docExpiry != 0 && currentTime > docExpiry;
        uint256 timeLeft = 0;
        
        if (docExpiry != 0 && !docExpired) {
            timeLeft = docExpiry - currentTime;
        }
        
        return (docExpiry, docExpired, timeLeft, docExpiry != 0);
    }

>>>>>>> Stashed changes
    // get user's role for a document
    function getRole(uint256 _docId, address _user) external view returns (Role) {
        require(documents[_docId].exists, "Document does not exist");
        return documents[_docId].roles[_user];
    }

    // amend document by owner, if not fully signed yet
    function amendDocument(uint256 _docId, string memory _newIpfsHash, uint256 _newExpiry) external onlyOwner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        require(!isExpired(_docId), "Document expired");
        // check if not fully signed
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

    // get current signer in sequence
    function getCurrentSigner(uint256 _docId) external view returns (address) {
        Document storage doc = documents[_docId];
        require(doc.exists, "Document does not exist");
        if (doc.currentSignerIndex < doc.signers.length) {
            return doc.signers[doc.currentSignerIndex];
        } else {
            return address(0); // all signed
        }
    }

    // verify cryptographic signature
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

    // register new user
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

    // get user profile info
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

    // get all registered users
    function getAllRegisteredUsers() public view returns (address[] memory) {
        return registeredUsers;
    }

    // check if user is a signer for document
    function isSigner(address _user, uint256 _docId) external view returns (bool) {
        Document storage doc = documents[_docId];
        if (!doc.exists) return false;
        if (doc.creator == _user) return true;
        
        for (uint i = 0; i < doc.signers.length; i++) {
            if (doc.signers[i] == _user) {
                return true;
            }
        }
        return false;
    }

    // check if document is single-user (creator is the only signer)
    function isSingleUserDocument(uint256 _docId) external view returns (bool) {
        Document storage doc = documents[_docId];
        require(doc.exists, "Document does not exist");
        return doc.signers.length == 1 && doc.signers[0] == doc.creator;
    }
} 