import "@stdlib/deploy";
import "@stdlib/ownable";

// Contest status constants
const STATUS_PENDING: Int = 0;
const STATUS_ACTIVE: Int = 1;
const STATUS_ENDED: Int = 2;

// Error messages
const ERROR_NOT_OWNER: String = "403: Not the owner";
const ERROR_INVALID_STATUS: String = "400: Invalid contest status";
const ERROR_CONTEST_NOT_ENDED: String = "401: Contest end time has not been reached";
const ERROR_NOT_PARTICIPANT: String = "404: Not a participant in this contest";

// Messages
message StartContest {
    queryId: Int as uint64;
}

message EndContest {
    queryId: Int as uint64;
}

message ClaimFunds {
    queryId: Int as uint64;
}

message UpdateOwner {
    queryId: Int as uint64;
    newOwner: Address;
}

// Participant structure
struct Participant {
    stake: Int as coins;
}

struct ContestInfo {
    contestId: Int as uint32;
    startTime: Int as uint32;
    endTime: Int as uint32;
    status: Int as uint8;
}

// ContestWallet contract
contract ContestWallet with Deployable, Ownable {
    owner: Address;
    contestId: Int as uint32;
    startTime: Int as uint32;
    endTime: Int as uint32;
    status: Int as uint8;  // Removed the constant initialization
    participants: map<Address, Participant>;

    init(owner: Address, contestId: Int, startTime: Int, endTime: Int) {
        self.owner = owner;
        self.contestId = contestId;
        self.startTime = startTime;
        self.endTime = endTime;
        self.status = 0;  // Initialize directly with the value for STATUS_PENDING
        self.participants = emptyMap();
    }

    // Participate in contest by sending TON
    receive() {
        // Only accept funds when contest is active
        require(self.status == STATUS_ACTIVE, ERROR_INVALID_STATUS);
        
        let sender: Address = sender();
        let currentStake: Int = 0;
        
        if (self.participants.get(sender) != null) {
            currentStake = self.participants.get(sender)!!.stake;
        }
        
        self.participants.set(sender, Participant{stake: currentStake + context().value});
    }
    
    // Start contest - owner only
    receive(msg: StartContest) {
        require(sender() == self.owner, ERROR_NOT_OWNER);
        require(self.status == STATUS_PENDING, ERROR_INVALID_STATUS);
        
        self.status = STATUS_ACTIVE;
        
        // Respond with success message
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue,
            body: beginCell().storeUint(0xd1, 8).storeUint(msg.queryId, 64).endCell()
        });
    }
    
    // End contest - owner only
    receive(msg: EndContest) {
        require(sender() == self.owner, ERROR_NOT_OWNER);
        require(self.status == STATUS_ACTIVE, ERROR_INVALID_STATUS);
        require(now() >= self.endTime, ERROR_CONTEST_NOT_ENDED);
        
        self.status = STATUS_ENDED;
        
        // Respond with success message
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue,
            body: beginCell().storeUint(0xd1, 8).storeUint(msg.queryId, 64).endCell()
        });
    }
    
    // Claim funds by participants after contest end
    receive(msg: ClaimFunds) {
        require(self.status == STATUS_ENDED, ERROR_INVALID_STATUS);
        
        let sender: Address = sender();
        require(self.participants.get(sender) != null, ERROR_NOT_PARTICIPANT);
        
        let stakeAmount: Int = self.participants.get(sender)!!.stake;
        // Remove participant after claiming funds by setting to null
        self.participants.set(sender, null);
        
        // Send funds back to participant
        send(SendParameters{
            to: sender,
            value: stakeAmount,
            mode: SendIgnoreErrors,
            body: beginCell().storeUint(0xd1, 8).storeUint(msg.queryId, 64).endCell()
        });
    }
    
    // Update owner - only current owner can change
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
    
    // Get methods
    get fun getParticipants(): map<Address, Participant> {
        return self.participants;
    }
    
    get fun getContestInfo(): ContestInfo {
        return ContestInfo{
            contestId: self.contestId,
            startTime: self.startTime,
            endTime: self.endTime,
            status: self.status
        };
    }
    
    get fun getParticipantStake(addr: Address): Int {
        if (self.participants.get(addr) != null) {
            return self.participants.get(addr)!!.stake;
        }
        return 0;
    }
    
    get fun getOwner(): Address {
        return self.owner;
    }
}