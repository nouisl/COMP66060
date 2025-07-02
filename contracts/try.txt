pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Docu3 is AccessControl {

    // user
    struct User {
        string name;
        string email;
        uint256 dateOfBirth;
        bytes32 role;
        bool isRegistered;
        uint256 registrationDate;
    }

    // document 
    struct Document {
        string ipfsCID;
        bytes32 documentHash;
        address owner;
        uint256 createdAt;
        uint256 requiredSig;
        uint256 sigCount;
        bool isRevoked;
        mapping(address => bool) hasSigned;
        mapping(uint256 => address) signees;
    }

} 