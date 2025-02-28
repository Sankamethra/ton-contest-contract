import { Address, toNano } from '@ton/core';
import { ContestFactory } from '../wrappers/ContestFactory';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const owner = provider.sender().address as Address
    const contestFactory = provider.open(await ContestFactory.fromInit(owner));

    await contestFactory.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(contestFactory.address);

    console.log('address', contestFactory.address);
    contestFactory.getGetContestCount
}
