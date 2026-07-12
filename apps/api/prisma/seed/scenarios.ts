import { demoScenarios } from './constants.js';

export function scenarioMarkdownTable(): string {
  const rows = demoScenarios.map(
    (scenario) =>
      `| ${scenario.code} | ${scenario.actor} | ${scenario.screen} | ${scenario.record} | ${scenario.status} | ${scenario.nextAction} |`,
  );

  return [
    '| Ma scenario | Tai khoan demo | Man hinh | Ho so | Trang thai | Hanh dong demo tiep theo |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

export function printScenarioSummary(): void {
  console.info(`Demo scenarios: ${demoScenarios.map((scenario) => scenario.code).join(', ')}`);
}
