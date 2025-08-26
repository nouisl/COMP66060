# DOCU³ - Decentralized Document Signing System

**DOCU³** is a decentralized document signing system built on the Polygon network, developed as part of the MSc Advanced Computer Science project (COMP66060) at the University of Manchester.

## Features

- **Decentralized Document Management:** Upload and manage documents on IPFS with blockchain verification  
- **Cryptographic Signatures:** Secure document signing with cryptographic verification  
- **Multi-Signer Support:** Add multiple signers to documents with sequential signing  
- **Document Encryption:** End-to-end encryption for sensitive documents  
- **Signature Verification:** Verify document signatures cryptographically  
- **Document Amendments:** Create amended versions of documents  
- **Document Revocation:** Revoke documents by the original creator  
- **User Registration:** Safe user registration with public key generation  
- **Dashboard Analytics:** View document status and pending signatures  
- **Responsive UI:** Modern interface built with React and Tailwind CSS  

## Technologies Used

- **Frontend:** React.js, Tailwind CSS, Web3UI Kit
- **Blockchain Development:** Hardhat, Ethers.js, Web3
- **Blockchain:** Polygon Network (Amoy Testnet)
- **Storage:** IPFS (Pinata)
- **Encryption:** EthCrypto, CryptoJS
- **Authentication:** MetaMask Wallet Integration 
- **Gas Management:** Dynamic gas price estimation

---

## Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/your-username/COMP66060.git
cd COMP66060
```

### 2. Install Dependencies

```sh
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### 3. Setup Environment Variables

First, create a `.env` file in the root directory for smart contract deployment:

```sh
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_wallet_private_key
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_secret_key
```

### 4. Deploy Smart Contract

```sh
# Compile contracts
npx hardhat compile

# Deploy to Polygon Amoy testnet
npx hardhat run scripts/deploy.js --network amoy

# Test contract code
npx hardhat test
```

After successful deployment, the script will output your contract address. Copy this address.

### 5. Setup Frontend Environment Variables

Create a `.env` file in the frontend directory with the deployed contract address:

```sh
REACT_APP_CONTRACT_ADDRESS=your_deployed_contract_address
REACT_APP_CHAIN_ID=80002
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_API_SECRET=your_pinata_secret_key
```

### 6. Start the Frontend

```sh
cd frontend
npm start
```

Visit `http://localhost:3000` to access the application.

---

## Project Structure

```
COMP66060
 ├── contracts
 │   └── Docu3.sol
 ├── frontend
 │   ├── public
 │   ├── src
 │   │   ├── components
 │   │   │   ├── Dashboard.js
 │   │   │   ├── DocumentDetail.js
 │   │   │   ├── DocumentList.js
 │   │   │   ├── DocumentUpload.js
 │   │   │   ├── Header.js
 │   │   │   ├── Home.js
 │   │   │   ├── SignatureVerifier.js
 │   │   │   ├── UserProfile.js
 │   │   │   └── UserRegistration.js
 │   │   ├── utils
 │   │   │   ├── crypto.js
 │   │   │   ├── documentService.js
 │   │   │   ├── gasStation.js
 │   │   │   └── pinata.js
 │   │   ├── contracts
 │   │   │   └── Docu3.json
 │   │   └── App.js
 │   ├── package.json
 │   └── tailwind.config.js
 ├── scripts
 │   └── deploy.js
 ├── test
 │   ├── Docu3.test.js
 │   ├── Docu3.security.test.js
 │   ├── Docu3.performance.test.js
 │   ├── Docu3.integration.test.js
 │   └── Docu3.ipfs.integration.test.js
 ├── hardhat.config.js
 └── README.md
```

---

## Available Scripts

### Root Directory
```sh
npm install          # Install dependencies
npx hardhat compile  # Compile smart contracts
npx hardhat test     # Run test suite
npx hardhat run scripts/deploy.js --network amoy  # Deploy to testnet
```

### Frontend Directory
```sh
cd frontend
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
npm run eject       # Eject from Create React App
```

---

## Smart Contract Features

- **Document Creation:** Upload documents to IPFS and register on blockchain
- **Multi-Signer Management:** Add multiple signers with sequential signing order
- **Cryptographic Signatures:** Secure document signing with signature verification
- **Document Amendments:** Create new versions of documents
- **Document Revocation:** Revoke documents by original creator
- **User Registration:** Register users with public key generation
- **Access Control:** Ensure only authorized users can view documents

---

## Security Features

- **End-to-End Encryption:** Documents encrypted with recipient public keys
- **Cryptographic Signatures:** Verifiable digital signatures
- **Private Key Management:** Encrypted private key storage and backup
- **Access Control:** Document-level permissions
- **Blockchain Verification:** Immutable document records

---

## User Interface

- **Modern Design:** Clean, responsive interface with Tailwind CSS
- **Dashboard:** Overview of documents and pending signatures
- **Document Management:** Upload, view, and manage documents
- **Signature Verification:** Verify document signatures
- **User Profile:** Manage encrypted keys and user information
- **Real-time Updates:** Live updates for document status

---

## Testing

The project includes comprehensive test suites covering all aspects of the smart contract functionality.

### Running Tests

```sh
# Run all smart contract tests
npx hardhat test

# Run specific smart contract test categories
npx hardhat test test/Docu3.test.js                    # Basic functionality tests
npx hardhat test test/Docu3.security.test.js           # Security and access control tests
npx hardhat test test/Docu3.performance.test.js        # Performance and gas optimization tests
npx hardhat test test/Docu3.integration.test.js        # Integration and flow tests
npx hardhat test test/Docu3.ipfs.integration.test.js   # IPFS integration tests

# Run frontend tests (watch mode)
cd frontend
npm test

# Run frontend tests non-interactively
cd frontend
CI=true npm test -- --watchAll=false

# Run a single frontend test file
cd frontend
npm test -- src/__tests__/components/DocumentList.test.js
```

---

## Future Enhancements

- **Multi-chain Support:** Support for additional blockchain networks
- **Advanced Encryption:** Additional encryption algorithms
- **Batch Operations:** Bulk document operations
- **API Integration:** REST API for external integrations
- **Mobile App:** Native mobile application
- **Advanced Analytics:** Detailed document analytics and reporting

---

## Links

- **Polygon Network:** https://polygon.technology/
- **IPFS Documentation:** https://docs.ipfs.io/
- **Hardhat Documentation:** https://hardhat.org/docs
- **Ethers.js Documentation:** https://docs.ethers.org/
