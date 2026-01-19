import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

/**
 * Slack Block Kit message types
 */
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string | { type: string; text: string; emoji?: boolean };
    url?: string;
    action_id?: string;
  }>;
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackMessage {
  attachments: Array<{
    color: string;
    blocks: SlackBlock[];
  }>;
}

interface FailedTest {
  title: string;
  file: string;
  error: string;
}

/**
 * Slack Reporter for Playwright
 *
 * Sends test results to a Slack webhook when tests complete.
 * Configure via SLACK_WEBHOOK_URL environment variable.
 *
 * Usage in playwright.config.ts:
 * ```typescript
 * reporter: [
 *   ['./src/reporters/slack-reporter.ts'],
 *   ['html'],
 * ],
 * ```
 */
export default class SlackReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private flaky = 0;
  private failedTests: FailedTest[] = [];
  private startTime: number = Date.now();
  private projectName = 'TestHub';

  onBegin(config: FullConfig, suite: Suite): void {
    this.startTime = Date.now();
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.flaky = 0;
    this.failedTests = [];

    // Try to get project name from config
    if (config.projects.length > 0) {
      this.projectName = config.projects[0].name || 'TestHub';
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    switch (result.status) {
      case 'passed':
        this.passed++;
        break;
      case 'failed':
      case 'timedOut':
        this.failed++;
        this.failedTests.push({
          title: test.title,
          file: test.location.file.split(/[/\\]/).slice(-2).join('/'),
          error: this.truncateError(result.error?.message || 'Unknown error'),
        });
        break;
      case 'skipped':
        this.skipped++;
        break;
    }

    // Track flaky tests (passed on retry)
    if (result.status === 'passed' && result.retry > 0) {
      this.flaky++;
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      // Silent skip if webhook not configured
      return;
    }

    const duration = this.formatDuration(Date.now() - this.startTime);
    const total = this.passed + this.failed + this.skipped;
    const allPassed = this.failed === 0;

    const message = this.buildSlackMessage({
      status: result.status,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      flaky: this.flaky,
      total,
      duration,
      allPassed,
      failedTests: this.failedTests,
    });

    try {
      await this.sendToSlack(webhookUrl, message);
      console.log('[SlackReporter] Test results sent to Slack');
    } catch (error) {
      console.error('[SlackReporter] Failed to send to Slack:', error);
    }
  }

  private truncateError(error: string, maxLength = 200): string {
    // Clean up error message
    const cleaned = error
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    return cleaned.substring(0, maxLength - 3) + '...';
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  private getCILink(): string | null {
    const serverUrl = process.env.GITHUB_SERVER_URL;
    const repository = process.env.GITHUB_REPOSITORY;
    const runId = process.env.GITHUB_RUN_ID;

    if (serverUrl && repository && runId) {
      return `${serverUrl}/${repository}/actions/runs/${runId}`;
    }

    return null;
  }

  private getStatusEmoji(allPassed: boolean): string {
    return allPassed ? ':white_check_mark:' : ':x:';
  }

  private buildSlackMessage(data: {
    status: string;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    total: number;
    duration: string;
    allPassed: boolean;
    failedTests: FailedTest[];
  }): SlackMessage {
    const { passed, failed, skipped, flaky, total, duration, allPassed, failedTests } = data;

    const blocks: SlackBlock[] = [];
    const color = allPassed ? '#36a64f' : '#dc3545';
    const emoji = this.getStatusEmoji(allPassed);
    const statusText = allPassed ? 'All Tests Passed' : `${failed} Test${failed > 1 ? 's' : ''} Failed`;

    // Header
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${this.projectName}: ${statusText}`,
        emoji: true,
      },
    });

    // Summary stats
    const statsFields = [
      { type: 'mrkdwn', text: `*Passed:*\n${passed}` },
      { type: 'mrkdwn', text: `*Failed:*\n${failed}` },
      { type: 'mrkdwn', text: `*Skipped:*\n${skipped}` },
      { type: 'mrkdwn', text: `*Duration:*\n${duration}` },
    ];

    if (flaky > 0) {
      statsFields.push({ type: 'mrkdwn', text: `*Flaky:*\n${flaky}` });
    }

    blocks.push({
      type: 'section',
      fields: statsFields,
    });

    // Progress bar visualization
    const passedPercent = total > 0 ? Math.round((passed / total) * 100) : 0;
    const progressBar = this.createProgressBar(passedPercent);
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Progress:* ${progressBar} ${passedPercent}%`,
      },
    });

    // Failed tests (if any)
    if (failedTests.length > 0) {
      blocks.push({
        type: 'divider' as const,
      } as SlackBlock);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Failed Tests:*',
        },
      });

      // Show up to 5 failed tests
      const testsToShow = failedTests.slice(0, 5);
      for (const test of testsToShow) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${test.title}*\n_${test.file}_\n\`\`\`${test.error}\`\`\``,
          },
        });
      }

      if (failedTests.length > 5) {
        blocks.push({
          type: 'context' as const,
          elements: [
            {
              type: 'mrkdwn',
              text: `_...and ${failedTests.length - 5} more failed tests_`,
            },
          ],
        } as SlackBlock);
      }
    }

    // CI Link (if available)
    const ciLink = this.getCILink();
    if (ciLink) {
      blocks.push({
        type: 'divider' as const,
      } as SlackBlock);

      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View CI Run',
              emoji: true,
            },
            url: ciLink,
            action_id: 'view_ci_run',
          },
        ],
      });
    }

    // Timestamp
    blocks.push({
      type: 'context' as const,
      elements: [
        {
          type: 'mrkdwn',
          text: `Run completed at ${new Date().toISOString()}`,
        },
      ],
    } as SlackBlock);

    return {
      attachments: [
        {
          color,
          blocks,
        },
      ],
    };
  }

  private createProgressBar(percent: number): string {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return '`' + '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + '`';
  }

  private async sendToSlack(webhookUrl: string, message: SlackMessage): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Slack API error: ${response.status} - ${text}`);
    }
  }
}
