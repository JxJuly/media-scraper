import chalk from 'chalk';

const logger = {
  info: (...args: any[]) => console.log(chalk.blue('INFO: '), ...args),
  error: (...args: any[]) => console.log(chalk.red('ERROR: '), ...args),
};

export { logger };
