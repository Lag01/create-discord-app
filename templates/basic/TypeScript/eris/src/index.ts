////////////////////////////////////////////
/////         Create Discord App       /////
////////////////////////////////////////////

import * as dotenv from "dotenv";
dotenv.config();

import Eris from "eris";
import fs from "fs";

const config: {
    TOKEN: string,
    PREFIX: string
} = require("../config.js");

class Client extends Eris.Client {
    commands: Map<string, Command>;
    aliases: Map<string, string>;

    constructor(token: string, options?: Eris.ClientOptions) {
        super(token, options);

        this.commands = new Map();
        this.aliases = new Map();
    }

    resolveCommand(name: string) {
        const byName = this.commands.get(name);
        if (byName) return byName;
        const byAlias = this.aliases.get(name);
        if (byAlias) return this.commands.get(byAlias);
        return undefined;
    }
}

export type CommandRun = (client: Client, message: Eris.Message, args: string[]) => any;

export interface CommandHelp {
    name: string;
    description: string;
    aliases: string[];
    category?: string;
}

export interface Command {
    run: CommandRun;
    help: CommandHelp;
    location?: string;
}

const client = new Client(config.TOKEN);

// load commands
// Read command dir and get ctg
fs.readdir("./commands", (error, ctg) => {
    if (error) throw error;

    // loop through ctg
    ctg.forEach(category => {

        // read each ctg and get command file
        fs.readdir(`./commands/${category}`, (err, commands) => {
            if (err) throw err;

            // Load commands in memory
            commands.forEach(command => {
                const cmd: Command = require(`./commands/${category}/${command}`).default;
                if (!cmd.help) throw new Error(`Invalid command file structure ${command}!`);

                // update data
                cmd.help.category = category;
                cmd.location = `./commands/${category}/${command}`;

                console.log(`Loading command ${command}...`);

                // load command in memory
                client.commands.set(cmd.help.name, cmd);
                if (cmd.help.aliases && Array.isArray(cmd.help.aliases)) cmd.help.aliases.forEach(alias => client.aliases.set(alias, cmd.help.name));
            });
        });
    });
});

// basic events
client.on("ready", () => {
    console.log("Bot is online!");
});
client.on("warn", console.warn);
client.on("error", console.error);

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content.indexOf(config.PREFIX) !== 0) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(" ");
    const cmd = args.shift()?.toLowerCase();

    if (!cmd) return;
    let command = client.resolveCommand(cmd);

    if (!command) return;

    try {
        await command.run(client, message, args);
    } catch(e) {
        console.error(e);
        message.channel.createMessage(`Something went wrong while executing command "**${command}**"!`);
    }
});

client.connect();