import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/contest_factory.tact',
    options: {
        debug: true,
    },
};
