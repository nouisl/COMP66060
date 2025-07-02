// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentSign {
    struct Document {
        string ipfsHash;
        address[] signers;
        mapping(address => bool) hasSigned;
    }

    mapping(uint256 => Document) public documents;
    uint256 public documentCount;

    event DocumentCreated(uint256 docId, string ipfsHash, address creator);
    event DocumentSigned(uint256 docId, address signer);

    function createDocument(string memory _ipfsHash, address[] memory _signers) public {
        documentCount++;
        Document storage doc = documents[documentCount];
        doc.ipfsHash = _ipfsHash;
        doc.signers = _signers;
        emit DocumentCreated(documentCount, _ipfsHash, msg.sender);
    }

    function signDocument(uint256 _docId) public {
        Document storage doc = documents[_docId];
        require(!doc.hasSigned[msg.sender], "Already signed");
        bool isSigner = false;
        for (uint i = 0; i < doc.signers.length; i++) {
            if (doc.signers[i] == msg.sender) {
                isSigner = true;
                break;
            }
        }
        require(isSigner, "Not authorized signer");
        doc.hasSigned[msg.sender] = true;
        emit DocumentSigned(_docId, msg.sender);
    }
}
