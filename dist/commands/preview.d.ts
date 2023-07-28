import { Command } from '@oclif/core';
export default class Preview extends Command {
    static description: string;
    static examples: string[];
    static strict: boolean;
    run(): Promise<void>;
}
