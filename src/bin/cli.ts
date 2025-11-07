#!/usr/bin/env node

/**
 * Writer's Aid CLI Entry Point
 */

import { createCLI } from "../cli/commands.js";

const program = createCLI();

program.parse(process.argv);
