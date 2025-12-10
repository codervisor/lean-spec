import { Command } from 'commander';
import type { Option } from 'commander';
import { t } from '../lib/i18n/config.js';

const OPTION_KEY_MAP: Record<string, string> = {
  '--json': 'json',
  '--status': 'status',
  '--priority': 'priority',
  '--tag': 'tag',
  '--dry-run': 'dryRun',
  '--port': 'port',
  '--no-open': 'noOpen',
};

function translateKey(key: string): string | undefined {
  const translation = t(key);
  return translation === key ? undefined : translation;
}

function localizeCommonOptions(command: Command): void {
  const localizeOption = (option: Option): void => {
    if (!option.long) return;
    const optionKey = OPTION_KEY_MAP[option.long];
    if (!optionKey) return;
    const translated = translateKey(`options.${optionKey}`);
    if (translated) {
      option.description = translated;
    }
  };

  command.options.forEach(localizeOption);
  command.commands.forEach(localizeCommonOptions);
}

export function localizeCommand(command: Command, commandKey: string): Command {
  const description = translateKey(`commands.${commandKey}.description`);
  if (description) {
    command.description(description);
  }

  const usage = translateKey(`commands.${commandKey}.usage`);
  if (usage) {
    command.usage(usage);
  }

  localizeCommonOptions(command);
  return command;
}

export function getCommandMeta(commandKey: string): { usage: string; description: string } {
  const usage = translateKey(`commands.${commandKey}.usage`) ?? commandKey;
  const description = translateKey(`commands.${commandKey}.description`) ?? '';
  return { usage, description };
}
