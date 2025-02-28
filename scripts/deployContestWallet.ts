import { Address, toNano } from '@ton/core';
import { ContestWallet } from '../wrappers/ContestWallet';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const owner = provider.sender().address as Address;
    const contestId = BigInt(Math.floor(Math.random() * 10000));
    const contestType = 1n; // Example: Daily contest
    const startTime = BigInt(Math.floor(Date.now() / 1000)); // Current time (Unix timestamp)
    const endTime = startTime + 86400n; // 24 hours later
    const contestWallet = provider.open(await ContestWallet.fromInit(owner, contestId, startTime, endTime));

    await contestWallet.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        },
    );

    await provider.waitForDeploy(contestWallet.address);

    console.log('address', contestWallet.address);
}
