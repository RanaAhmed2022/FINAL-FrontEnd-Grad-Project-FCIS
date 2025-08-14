# FINAL-FrontEnd-Grad-Project-FCIS

## 📌 Overview
This project is the Frontend of a Blockchain-Based E-Voting System developed as part of our Graduation Project.
Our goal is to create a secure and intelligent digital voting platform that leverages blockchain to ensure transparency and tamper-proof results, and integrates AI-based face recognition & ID verification to make the voting process safer, smarter, and more trustworthy.

This repository contains the React-based user interface for the system, allowing voters to register, verify their identity, and cast their votes securely.


## 🔗 Related Repositories
- [Blockchain Smart Contract](https://github.com/suhail-abdelaal/Blockchain-based-eVoting)
- [AI Verification](https://github.com/Abdo-Hamdi/Blockchain-Based-E-Voting-System)


## ✨ Features
- User registration & login
- Face verification before voting
- Proposal search & browsing
- Secure blockchain voting
- View voting history and results


## 🛠️ Tech Stack

- React.js – UI framework

- JavaScript / TypeScript

- Thirdweb SDK – blockchain contract interaction

- Context API & Hooks – state management

- CSS – styling

- Integration with AI-based Face Verification backend (external service)

- Blockchain Smart Contracts (deployed separately)




## Project Structure

```
src/
│
├── components/           # Reusable UI components (Home, Login, Registration, etc.)
├── config/               # Blockchain & Paymaster configuration
├── contexts/             # Global state providers
├── hooks/                # Custom React hooks for contract & verification
├── services/             # Face verification service integration
├── App.js                 # Main application entry
├── index.js               # React DOM entry point
└── thirdwebConfig.js      # Thirdweb SDK configuration


```


## 🚀 Getting Started
### 1️⃣ Prerequisites

- Make sure you have installed:

- Node.js (v16+ recommended)

- npm (comes with Node)

### 2️⃣ Installation

Clone the repository and install dependencies:

- git clone https://github.com/RanaAhmed2022/FINAL-FrontEnd-Grad-Project-FCIS.git
- cd react-frontend
- npm install typescript@4.9.5 --save-dev
- npm install


### 3️⃣ Running the Project
- npm start



### The system will run at:
http://localhost:3000

## License
This project is part of the blockchain-based e-voting system. See the main project license for terms and conditions.
