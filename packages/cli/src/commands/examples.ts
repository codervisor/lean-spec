import chalk from 'chalk';
import { Command } from 'commander';
import { getExamplesList } from '../utils/examples.js';

/**
 * Examples command - list available example projects
 */
export function examplesCommand(): Command {
  return new Command('examples')
    .description('List available example projects for tutorials')
    .action(async () => {
      await listExamples();
    });
}

async function listExamples(): Promise<void> {
  const examples = getExamplesList();
  
  console.log('');
  console.log(chalk.bold('LeanSpec Example Projects'));
  console.log('');
  console.log('Scaffold complete example projects to follow tutorials:');
  console.log('');
  
  for (const example of examples) {
    const difficultyColor = 
      example.difficulty === 'beginner' ? chalk.green :
      example.difficulty === 'intermediate' ? chalk.yellow :
      chalk.red;
    
    const difficultyStars = 
      example.difficulty === 'beginner' ? '★☆☆' :
      example.difficulty === 'intermediate' ? '★★☆' :
      '★★★';
    
    console.log(chalk.cyan.bold(`  ${example.title}`));
    console.log(`    ${chalk.gray(example.name)}`);
    console.log(`    ${example.description}`);
    console.log(`    ${difficultyColor(difficultyStars + ' ' + example.difficulty)} • ${example.tech.join(', ')} • ~${example.lines} lines`);
    console.log(`    ${chalk.gray('Tutorial:')} ${example.tutorial}`);
    console.log(`    ${chalk.gray(example.tutorialUrl)}`);
    console.log('');
  }
  
  console.log(chalk.bold('Usage:'));
  console.log('');
  console.log('  # Scaffold an example');
  console.log(chalk.cyan('  lean-spec init --example <name>'));
  console.log('');
  console.log('  # Interactive selection');
  console.log(chalk.cyan('  lean-spec init --example'));
  console.log('');
  console.log('  # Custom directory name');
  console.log(chalk.cyan('  lean-spec init --example email-notifications --name my-demo'));
  console.log('');
}
