import { Address, toNano, beginCell, Cell, Contract, ContractProvider } from '@ton/core';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { ContestFactory } from '../wrappers/ContestFactory';

// Main Execution
export async function run(provider: NetworkProvider) {
    try {
        const sender = provider.sender();
        const owner = sender.address as Address;
        console.log(`Owner address: ${owner.toString()}`);

        // Factory Contract
        const factoryAddress = Address.parse('EQAU5chXz9IKIIqCbYCfHpOGfaF-Ec1Mq2_VMWQoJU2SvSJK');
        console.log(`Contest Factory address: ${factoryAddress.toString()}`);

        // Create a new instance of the factory contract
        const factoryContract = provider.open(ContestFactory.fromAddress(factoryAddress));

        // Get initial contest count
        const initialContestCount = await factoryContract.getGetContestCount();
        console.log('Initial contest count:', initialContestCount);

        // Contest Creation
        const startTime = BigInt(Math.floor(Date.now() / 1000) + 120); // 2 minutes in the future
        const duration = 60n; // 5 minutes
        console.log(`Creating contest with start time: ${new Date(Number(startTime) * 1000).toLocaleString()}`);
        console.log(`Duration: ${duration} seconds`);

        // Create the body for "create contest" text message
        // Looking at the contract, for text message it expects parameters in a reference
        const msgBody = beginCell()
            .storeUint(0, 32) // Prefix for text messages (0 in first 32 bits)
            .storeStringTail("create contest") // Text command
            .storeRef(
                beginCell() // Store parameters in reference cell
                    .storeUint(Number(startTime), 32) // startTime as uint32
                    .storeUint(Number(duration), 32)  // duration as uint32
                    .endCell()
            )
            .endCell();

        console.log('Sending create contest text message...');
        
        // Send the transaction
        await sender.send({
            to: factoryAddress,
            value: toNano('0.35'), // Send a bit more to ensure enough gas
            body: msgBody
        });

        console.log('Contest creation message sent successfully');
        console.log('Waiting for contest creation to finalize...');

        // Wait for transaction to be processed
        await sleep(60000); // 60 seconds

        const contestAddress = Address.parse("0QAAtvnToc06nocyxbD7li70OiXoA8gQ_i3XOwigizwC0gVq");

        // Start Contest
        console.log('Starting contest...');
        await sender.send({
            to: contestAddress,
            value: toNano('0.1'),
            body: beginCell()
                .storeUint(2854811286, 32) // StartContest op code
                .storeUint(0, 64) // queryId
                .endCell(),
        });

        console.log('Start contest message sent successfully');
        await sleep(20000);

        // Participate in Contest
        console.log('Participating in the contest with 0.5 TON...');
        await sender.send({
            to: contestAddress,
            value: toNano('0.5'),
            body: beginCell().endCell(),
        });

        console.log('Participation transaction sent successfully');
        await sleep(20000);

        // Wait for Contest End
        const waitTimeMs = Number(duration) * 1000 + 30000;
        console.log(`Waiting ${waitTimeMs / 1000} seconds for contest to end...`);

        const endTime = Date.now() + waitTimeMs;
        while (Date.now() < endTime) {
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            console.log(`Time remaining: ${remaining} seconds`);
            await sleep(Math.min(30000, remaining * 1000 || 1000));

            if (remaining <= 0) break;
        }

        // End Contest
        console.log('Ending contest...');
        await sender.send({
            to: contestAddress,
            value: toNano('0.1'),
            body: beginCell()
                .storeUint(2257752764, 32) // EndContest op code
                .storeUint(0, 64) // queryId
                .endCell(),
        });

        console.log('End contest message sent successfully');
        await sleep(20000);

        // Claim Funds
        console.log('Claiming funds...');
        await sender.send({
            to: contestAddress,
            value: toNano('0.1'),
            body: beginCell()
                .storeUint(3456285011, 32) // ClaimFunds op code
                .storeUint(0, 64) // queryId
                .endCell(),
        });

        console.log('Claim funds message sent successfully');
        console.log('Test completed successfully!');
    } catch (error) {
        console.error('Test failed with error:', error);
        throw error;
    }
}