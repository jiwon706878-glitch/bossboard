"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const auth_1 = require("./commands/auth");
const wiki_1 = require("./commands/wiki");
const board_1 = require("./commands/board");
const todo_1 = require("./commands/todo");
const search_1 = require("./commands/search");
const credits_1 = require("./commands/credits");
const program = new commander_1.Command();
program
    .name("bb")
    .description("BossBoard CLI — the operations wiki for small business")
    .version("0.1.0");
program.addCommand(auth_1.authCommand);
program.addCommand(wiki_1.wikiCommand);
program.addCommand(board_1.boardCommand);
program.addCommand(todo_1.todoCommand);
program.addCommand(search_1.searchCommand);
program.addCommand(credits_1.creditsCommand);
program.parse();
