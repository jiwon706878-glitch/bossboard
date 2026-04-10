import { Command } from "commander";
import { authCommand } from "./commands/auth";
import { wikiCommand } from "./commands/wiki";
import { boardCommand } from "./commands/board";
import { todoCommand } from "./commands/todo";
import { searchCommand } from "./commands/search";
import { creditsCommand } from "./commands/credits";

const program = new Command();
program
  .name("bb")
  .description("BossBoard CLI — the operations wiki for small business")
  .version("0.1.0");

program.addCommand(authCommand);
program.addCommand(wikiCommand);
program.addCommand(boardCommand);
program.addCommand(todoCommand);
program.addCommand(searchCommand);
program.addCommand(creditsCommand);

program.parse();
