#!/usr/bin/env bun
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';

// Define our event types for better type safety
type GitHubEvent = {
  type: string;
  created_at: string;
  repo: {
    name: string;
  };
  payload: {
    action?: string;
    ref_type?: string;
    ref?: string;
    commits?: Array<{
      message: string;
    }>;
    pull_request?: {
      title: string;
      html_url: string;
    };
  };
}

class GitHubActivityCLI {
  // Base URL for GitHub API
  private readonly baseUrl = 'https://api.github.com';

  constructor() {
    this.initializeCLI();
  }

  // Format each event into a human-readable string with emojis
  private formatEvent(event: GitHubEvent): string {
    const date = new Date(event.created_at).toLocaleDateString();
    const repo = event.repo.name;

    switch (event.type) {
      case 'PushEvent': {
        const commits = event.payload.commits ?? [];
        const commitCount = commits.length;
        const commitMessage = commits[0]?.message ?? 'No commit message';
        return `${date} - 📦 Pushed ${commitCount} commit(s) to ${repo}\n   First commit: ${commitMessage}`;
      }

      case 'CreateEvent': {
        const refType = event.payload.ref_type;
        const ref = event.payload.ref;
        return `${date} - 🎉 Created ${refType} ${ref} in ${repo}`;
      }

      case 'PullRequestEvent': {
        const action = event.payload.action;
        const title = event.payload.pull_request?.title;
        const url = event.payload.pull_request?.html_url;
        return `${date} - 🔄 ${action} pull request in ${repo}\n   Title: ${title}\n   URL: ${url}`;
      }

      case 'WatchEvent':
        return `${date} - ⭐ Starred ${repo}`;

      default:
        return `${date} - ${event.type} in ${repo}`;
    }
  }

  // Fetch and display GitHub activity for a user
  private async fetchGitHubActivity(username: string) {
    const spinner = ora(`Fetching activity for ${username}...`).start();

    try {
      // Use Bun's built-in fetch API
      const response = await fetch(
        `${this.baseUrl}/users/${username}/events/public`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Activity-CLI'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`User ${username} not found`);
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const events = await response.json() as GitHubEvent[];
      
      spinner.succeed(`Recent activity for ${chalk.green(username)}:`);
      
      if (events.length === 0) {
        console.log(chalk.yellow('\nNo recent public activity found.'));
        return;
      }

      // Display the 10 most recent events
      console.log('\n' + events
        .slice(0, 10)
        .map((event) => this.formatEvent(event))
        .join('\n\n')
      );

    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  // Initialize the CLI with commander
  private initializeCLI() {
    const program = new Command();

    program
      .name('github-activity')
      .description('CLI to display recent GitHub activity for a user')
      .argument('<username>', 'GitHub username')
      .action((username: string) => this.fetchGitHubActivity(username))
      .version('1.0.0');

    program.parse();
  }
}

// Initialize the CLI
new GitHubActivityCLI();
