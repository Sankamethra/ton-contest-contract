import "@stdlib/deploy";
import "@stdlib/ownable";
import "./contest_wallet";

// Error codes
const ERROR_INSUFFICIENT_FUNDS: String = "402: Insufficient funds";

// Message op codes
const OP_CREATE_CONTEST: Int = 0x123456; // Custom op code for binary message
const OP_CONTEST_CREATED: Int = 0x654321; // Event op code for contest creation

message CreateContest {
    startTime: Int as uint32;
    duration: Int as uint32;
}

message ContestCreated {
    queryId: Int as uint64;
    contestId: Int as uint32;
    contestAddress: Address;
}

contract ContestFactory with Deployable, Ownable {
    owner: Address;
    contestCounter: Int as uint32 = 0;
    contests: map<Int, Address>;

    init(owner: Address) {
        self.owner = owner;
        self.contests = emptyMap();
    }
    
    // Handle CreateContest message
    receive(msg: CreateContest) {
        // Check sender is owner
        require(sender() == self.owner, ERROR_NOT_OWNER);
        require(context().value >= ton("0.3"), ERROR_INSUFFICIENT_FUNDS);
        
        // Internal function to create a contest
        self.createNewContest(msg.startTime, msg.duration);
    }
    
    // Handle text message "create contest"
    receive("create contest") {
        // Check sender is owner
        require(sender() == self.owner, ERROR_NOT_OWNER);
        require(context().value >= ton("0.3"), ERROR_INSUFFICIENT_FUNDS);
        
        // Parse parameters from message
        let slice = context().raw.loadRef().beginParse();
        let startTime = slice.loadUint(32);
        let duration = slice.loadUint(32);
        
        // Call internal function to create contest
        self.createNewContest(startTime, duration);
    }
    
    // Internal function to create a contest
    fun createNewContest(startTime: Int, duration: Int) {
        // First increment the counter - IMPORTANT: Do this BEFORE using the ID
        let contestId = self.contestCounter;
        self.contestCounter = self.contestCounter + 1;
        
        let endTime = startTime + duration;
        
        // Create contest wallet initialization state
        let contestInit = self.contestInit(contestId, startTime, endTime);
        let contestAddress = contractAddress(contestInit);
        
        // Store contest in map
        self.contests.set(contestId, contestAddress);
        
        // Deploy the contest wallet contract
        // STEP 1: Initialize StateInit for the new contract
        // STEP 2: Calculate the address based on StateInit
        // STEP 3: Deploy the contract with StateInit (code and data)
        send(SendParameters{
            to: contestAddress,
            value: ton("0.2"),
            bounce: false, // Set to false to avoid bounces
            mode: SendIgnoreErrors,
            code: contestInit.code,
            data: contestInit.data,
            body: beginCell().endCell()
        });
        
        // STEP 4: Emit ContestCreated event (using a cell instead of direct message)
        emit(beginCell()
            .storeUint(OP_CONTEST_CREATED, 32)
            .storeUint(0, 64) // queryId
            .storeUint(contestId, 32)
            .storeAddress(contestAddress)
            .endCell()
        );
        
        // Send success response back to caller
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue,
            body: beginCell()
                .storeUint(OP_CONTEST_CREATED, 32) // Contest created op code
                .storeUint(contestId, 32)          // Contest ID
                .storeAddress(contestAddress)       // Contest address
            .endCell()
        });
    }
    
    // Update owner
    receive(msg: UpdateOwner) {
        require(sender() == self.owner, ERROR_NOT_OWNER);
        self.owner = msg.newOwner;
        
        // Send confirmation message
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue,
            body: beginCell().storeUint(0xd1, 8).storeUint(msg.queryId, 64).endCell()
        });
    }
    
    // Handle the text "update owner" command
    receive("update owner") {
        require(sender() == self.owner, ERROR_NOT_OWNER);
        
        let slice = context().raw.loadRef().beginParse();
        let newOwner = slice.loadAddress();
        
        self.owner = newOwner;
    }
    
    // Initialize state for new contest wallet
    fun contestInit(contestId: Int, startTime: Int, endTime: Int): StateInit {
        return initOf ContestWallet(self.owner, contestId, startTime, endTime);
    }
    
    // Get methods
    get fun getContestAddress(contestId: Int): Address? {
        return self.contests.get(contestId);
    }
    
    get fun getContestCount(): Int {
        return self.contestCounter;
    }
    
    get fun getOwner(): Address {
        return self.owner;
    }
}