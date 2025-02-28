import { Address, toNano, beginCell, Contract, ContractProvider } from '@ton/core';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { ContestFactory } from '../wrappers/ContestFactory';
import * as dns from 'dns';

// Configure DNS settings to use Google's DNS servers to help with resolution issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

export async function run(provider: NetworkProvider) {
    try {
        const sender = provider.sender();
        
        // Factory Contract
        const factoryAddress = Address.parse('EQAU5chXz9IKIIqCbYCfHpOGfaF-Ec1Mq2_VMWQoJU2SvSJK');
        
        // Create a new instance of the factory contract
        const factoryContract = provider.open(ContestFactory.fromAddress(factoryAddress));

        // Retry function for API calls with exponential backoff
        async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
            let lastError: any;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    return await operation();
                } catch (error: any) {
                    console.log(`Attempt ${attempt + 1}/${maxRetries} failed: ${error.message}`);
                    lastError = error;
                    // Exponential backoff with small jitter
                    const delay = Math.floor(Math.random() * 500 + 1000 * Math.pow(1.5, attempt));
                    console.log(`Retrying in ${delay}ms...`);
                    await sleep(delay);
                }
            }
            throw lastError; // Throw the last error if all retries fail
        }

        // Get initial contest count with retry
        const initialContestCount = await retryOperation(() => factoryContract.getGetContestCount());
        console.log(`Initial contest count: ${initialContestCount}`);
        
        // Contest Creation parameters - using increased durations
        const startTime = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 minutes in the future
        const duration = 1800n; // 30 minutes duration
        
        console.log(`Creating contest with startTime: ${startTime} (${new Date(Number(startTime) * 1000).toISOString()})`);
        console.log(`Duration: ${duration} seconds`);
        
        // Keep the same message format that works for you
        const msgBody = beginCell()
            .storeUint(0, 32) // Prefix for text messages
            .storeStringTail("CreateContest") // Text command
            .storeRef(
                beginCell() // Store parameters in reference cell
                    .storeStringTail("CreateContest")
                    .storeUint(startTime, 32) // startTime as uint32
                    .storeUint(duration, 32)  // duration as uint32
                    .endCell()
            )
            .endCell();
        
        console.log('Sending transaction...');
        
        // Send the transaction with more TON to ensure enough gas
        await sender.send({
            to: factoryAddress,
            value: toNano('1.2'), // Slightly increased value for gas
            body: msgBody
        });

        console.log('Transaction sent successfully');
        
        // Wait longer for the transaction to be processed
        console.log('Waiting for transaction to be processed...');
        await sleep(60000); // 45 seconds initial wait
        
        // Check for contest creation with more retries
        let newContestCount;
        let contestAddress;
        let attempts = 0;
        const maxAttempts = 12; // Increased max attempts for more patience

        while (attempts < maxAttempts) {
            try {
                console.log(`Checking for contest creation (attempt ${attempts + 1}/${maxAttempts})...`);
                
                // Use retry operation for network resilience
                newContestCount = await retryOperation(() => factoryContract.getGetContestCount());
                console.log(`Current contest count: ${newContestCount}`);

                if (newContestCount > initialContestCount) {
                    // Get the latest contest ID
                    const latestContestId = newContestCount - 1n;
                    console.log(`New contest created with ID: ${latestContestId}`);
                    
                    // Get address for this contest with retry
                    contestAddress = await retryOperation(() => 
                        factoryContract.getGetContestAddress(latestContestId)
                    );

                    if (contestAddress) {
                        console.log(`Success! Contest address: ${contestAddress.toString()}`);
                        // Output the required information
                        console.log(JSON.stringify({
                            contestCount: newContestCount.toString(),
                            contestAddress: contestAddress.toString()
                        }));
                        return; // Exit with success
                    } else {
                        console.log('Contest address lookup returned null, retrying...');
                    }
                } else {
                    console.log('No new contest detected yet');
                }
            } catch (checkError: any) {
                console.log(`Error checking contest: ${checkError.message}`);
                
                // If we encounter DNS errors, log additional information
                if (checkError.message.includes('getaddrinfo') || checkError.message.includes('ENOTFOUND')) {
                    console.log('Network error detected. Will retry with different timing...');
                }
            }

            attempts++;
            if (attempts < maxAttempts) {
                // Progressive backoff starting with shorter intervals
                const waitTime = Math.min(30000 * Math.pow(1.3, attempts - 1), 300000); // Cap at 3 minutes
                console.log(`Waiting ${Math.floor(waitTime/1000)} seconds before next check...`);
                await sleep(waitTime);
            }
        }

        // One final check with maximum effort before giving up
        try {
            console.log('Performing final verification check...');
            const finalCount = await retryOperation(() => factoryContract.getGetContestCount(), 5);
            
            if (finalCount > initialContestCount) {
                const latestContestId = finalCount - 1n;
                contestAddress = await retryOperation(() => 
                    factoryContract.getGetContestAddress(latestContestId), 5
                );
                
                if (contestAddress) {
                    console.log(`Contest was created successfully! Address: ${contestAddress.toString()}`);
                    console.log(JSON.stringify({
                        contestCount: finalCount.toString(),
                        contestAddress: contestAddress.toString()
                    }));
                    return;
                }
            }
        } catch (finalError: any) {
            console.log(`Final verification failed: ${finalError.message}`);
        }

        // If we reached here, contest creation failed or address not found
        console.log('Contest creation verification timed out');
        console.log(JSON.stringify({
            error: "Contest creation verification timed out",
            contestCount: newContestCount ? newContestCount.toString() : "unknown"
        }));
        
    } catch (error: any) {
        console.log(`Error: ${error.message || "Unknown error occurred"}`);
        console.log(JSON.stringify({
            error: error.message || "Unknown error occurred"
        }));
    }
}