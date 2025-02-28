# TON Contest System

A blockchain-based contest management system built on The Open Network (TON) that allows participants to stake TON coins in time-bound contests.

## System Overview

This system consists of two smart contracts:

1. **ContestWallet** - Manages individual contests
2. **ContestFactory** - Creates and tracks contest instances

## Use Case

The TON Contest System enables:

- Contest organizers to create time-bound contests
- Participants to stake TON coins during the active contest period
- Automatic management of the contest lifecycle (pending → active → ended)
- Participants to reclaim their stakes after contest conclusion

## ContestWallet Contract

The ContestWallet manages a single contest instance with the following features:

### Contest States
- **PENDING (0)** - Initial state after creation, awaiting start
- **ACTIVE (1)** - Contest is running, participants can stake TON
- **ENDED (2)** - Contest has concluded, participants can claim funds

### Key Functions

- **receive()** - Accepts TON stakes when contest is active
- **StartContest** - Owner-only function to activate a contest
- **EndContest** - Owner-only function to end a contest (only after end time)
- **ClaimFunds** - Allows participants to withdraw their staked TON after contest ends
- **UpdateOwner** - Transfers ownership to a new address

### Data Structures

```typescript
struct Participant {
    stake: Int as coins;
}

struct ContestInfo {
    contestId: Int as uint32;
    startTime: Int as uint32;
    endTime: Int as uint32;
    status: Int as uint8;
}
```

## ContestFactory Contract

The ContestFactory deploys and tracks individual contest instances:

### Key Functions

- **CreateContest** - Creates a new contest with specified start time and duration
- **Text "create contest"** - Alternative way to create contests using text messages
- **UpdateOwner** - Transfers factory ownership to a new address

### Internal Operations

- Tracks a unique ID for each contest
- Maintains a mapping from contest IDs to their addresses
- Deploys ContestWallet instances with proper initialization
- Emits events when contests are created

## Interacting with the System

The system can be interacted with as shown in the test script:

1. **Create a Contest**:
   ```javascript
   // Create contest using text message
   const msgBody = beginCell()
       .storeUint(0, 32)
       .storeStringTail("create contest")
       .storeRef(
           beginCell()
               .storeUint(Number(startTime), 32)
               .storeUint(Number(duration), 32)
               .endCell()
       )
       .endCell();
   
   await sender.send({
       to: factoryAddress,
       value: toNano('0.35'),
       body: msgBody
   });
   ```

2. **Start a Contest**:
   ```javascript
   await sender.send({
       to: contestAddress,
       value: toNano('0.1'),
       body: beginCell()
           .storeUint(2854811286, 32) // StartContest op code
           .storeUint(0, 64) // queryId
           .endCell(),
   });
   ```

3. **Participate in a Contest**:
   ```javascript
   await sender.send({
       to: contestAddress,
       value: toNano('0.5'), // Stake amount
       body: beginCell().endCell(),
   });
   ```

4. **End a Contest**:
   ```javascript
   await sender.send({
       to: contestAddress,
       value: toNano('0.1'),
       body: beginCell()
           .storeUint(2257752764, 32) // EndContest op code
           .storeUint(0, 64) // queryId
           .endCell(),
   });
   ```

5. **Claim Funds**:
   ```javascript
   await sender.send({
       to: contestAddress,
       value: toNano('0.1'),
       body: beginCell()
           .storeUint(3456285011, 32) // ClaimFunds op code
           .storeUint(0, 64) // queryId
           .endCell(),
   });
   ```

## Security Features

- Owner-only restrictions for administrative functions
- Status validation to ensure actions occur in correct sequence
- Time constraints to ensure contests end at designated times
- Proper participant verification for claiming funds
- Safeguards against insufficient funds for contract operations

## Technical Highlights

- Uses TON's smart contract architecture
- Implements standard TON deployment and ownership patterns
- Leverages mappings for efficient participant tracking
- Employs a factory pattern for creating multiple contest instances
- Includes comprehensive getter methods for reading contract state

## How to use

### Install Dependencies:
```
nvm use v22
npm install
```

### Compile Contract:
`npx tact -c tact.config.json`

### Build Contracts:
`npx blueprint build`

### Run Script:
`npx blueprint run`