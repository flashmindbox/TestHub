import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

/**
 * Discord embed types
 */
interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: DiscordEmbedField[];
  footer?: {
    text: string;
  };
  timestamp?: string;
  url?: string;
}

interface DiscordMessage {
  content?: string;
  embeds: DiscordEmbed[];
}

interface FailedTest {
  title: string;
  file: string;
  error: string;
}

/**
 * Discord Reporter for Playwright
 *
 * Sends test results to a Discord webhook when tests complete.
 * Configure via DISCORD_WEBHOOK_URL environment variable.
 *
 * Usage in playwright.config.ts:
 * ```typescript
 * reporter: [
 *   ['./src/reporters/discord-reporter.ts'],
 *   ['html'],
 * ],
 * ```
 */
export default class DiscordReporter implements Reporter {
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
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      // Silent skip if webhook not configured
      return;
    }

    const duration = this.formatDuration(Date.now() - this.startTime);
    const total = this.passed + this.failed + this.skipped;
    const allPassed = this.failed === 0;

    const message = this.buildDiscordMessage({
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
      await this.sendToDiscord(webhookUrl, message);
      console.log('[DiscordReporter] Test results sent to Discord');
    } catch (error) {
      console.error('[DiscordReporter] Failed to send to Discord:', error);
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
    return allPassed ? '✅' : '❌';
  }

  private createProgressBar(percent: number): string {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private buildDiscordMessage(data: {
    status: string;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    total: number;
    duration: string;
    allPassed: boolean;
    failedTests: FailedTest[];
  }): DiscordMessage {
    const { passed, failed, skipped, flaky, total, duration, allPassed, failedTests } = data;

    // Colors: green for success, red for failures
    const color = allPassed ? 0x36a64f : 0xdc3545;
    const emoji = this.getStatusEmoji(allPassed);
    const statusText = allPassed ? 'All Tests Passed' : `${failed} Test${failed > 1 ? 's' : ''} Failed`;

    const fields: DiscordEmbedField[] = [
      { name: '✅ Passed', value: `${passed}`, inline: true },
      { name: '❌ Failed', value: `${failed}`, inline: true },
      { name: '⏭️ Skipped', value: `${skipped}`, inline: true },
    ];

    if (flaky > 0) {
      fields.push({ name: '🔄 Flaky', value: `${flaky}`, inline: true });
    }

    // Progress bar
    const passedPercent = total > 0 ? Math.round((passed / total) * 100) : 0;
    const progressBar = this.createProgressBar(passedPercent);
    fields.push({
      name: '📊 Progress',
      value: `\`${progressBar}\` ${passedPercent}%`,
      inline: false,
    });

    // Failed tests details
    if (failedTests.length > 0) {
      const testsToShow = failedTests.slice(0, 5);
      const failedTestsValue = testsToShow
        .map(test => `**${test.title}**\n_${test.file}_\n\`\`\`${test.error}\`\`\``)
        .join('\n');

      let failedDescription = failedTestsValue;
      if (failedTests.length > 5) {
        failedDescription += `\n_...and ${failedTests.length - 5} more failed tests_`;
      }

      fields.push({
        name: '🔴 Failed Tests',
        value: failedDescription.substring(0, 1024), // Discord field value limit
        inline: false,
      });
    }

    // CI Link
    const ciLink = this.getCILink();
    if (ciLink) {
      fields.push({
        name: '🔗 CI Run',
        value: `[View on GitHub](${ciLink})`,
        inline: false,
      });
    }

    const embed: DiscordEmbed = {
      title: `${emoji} ${this.projectName}: ${statusText}`,
      color,
      fields,
      footer: {
        text: `Duration: ${duration} | Total: ${total} tests`,
      },
      timestamp: new Date().toISOString(),
    };

    // Add URL to embed if CI link available
    if (ciLink) {
      embed.url = ciLink;
    }

    return {
      embeds: [embed],
    };
  }

  private async sendToDiscord(webhookUrl: string, message: DiscordMessage): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${text}`);
    }
  }
}
