import { demoScenarios } from './constants.js';

export function scenarioMarkdownTable(): string {
  const rows = demoScenarios.map(
    (scenario) =>
      `| ${scenario.code} | ${scenario.actor} | ${scenario.screen} | ${scenario.record} | ${scenario.status} | ${scenario.nextAction} |`,
  );

  return [
    '| Mã scenario | Tài khoản demo | Màn hình | Hồ sơ | Trạng thái | Hành động demo tiếp theo |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

export function printScenarioSummary(): void {
  console.info(`Demo scenarios: ${demoScenarios.map((scenario) => scenario.code).join(', ')}`);
}
