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
        uint256 createdAt;
        uint256 signatures;
        bool isRevoked;
        bool exists;
        uint256 expiry; 
    }

    mapping(uint256 => Document) private documents;
    uint256 public documentCount;

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
        uint256 signedAt
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

    function createDocument(string memory _ipfsHash, address[] memory _signers) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(_signers.length > 0, "At least one signer required");
        documentCount++;
        Document storage doc = documents[documentCount];
        doc.ipfsHash = _ipfsHash;
        doc.creator = msg.sender;
        doc.createdAt = block.timestamp;
        doc.exists = true;
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

    function signDocument(uint256 _docId) external onlySigner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        require(!doc.hasSigned[msg.sender], "Already signed");
        doc.hasSigned[msg.sender] = true;
        doc.signedAt[msg.sender] = block.timestamp;
        doc.signatures++;
        emit DocumentSigned(_docId, msg.sender, block.timestamp);
    }

    function revokeDocument(uint256 _docId) external onlyOwner(_docId) notRevoked(_docId) {
        Document storage doc = documents[_docId];
        doc.isRevoked = true;
        emit DocumentRevoked(_docId, msg.sender, block.timestamp, "");
    }

    function hasSigned(uint256 _docId, address _signer) external view returns (bool) {
        return documents[_docId].hasSigned[_signer];
    }

    function getSignTimestamp(uint256 _docId, address _signer) external view returns (uint256) {
        return documents[_docId].signedAt[_signer];
    }

    function getDocument(uint256 _docId) external view returns (
        string memory ipfsHash,
        address creator,
        address[] memory signers,
        uint256 createdAt,
        uint256 signatures,
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
            doc.signatures,
            allSigned,
            doc.isRevoked
        );
    }

    function getRole(uint256 _docId, address _user) external view returns (Role) {
        require(documents[_docId].exists, "Document does not exist");
        return documents[_docId].roles[_user];
    }
} 