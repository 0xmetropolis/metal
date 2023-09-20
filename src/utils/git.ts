import { GitMetadata, HexString, RepoMetadata } from '../types';
import { execSync } from 'node:child_process';
import { cwd } from 'node:process';
import { exit, logDebug } from '.';
import { GitMetadata, HexString, RepoMetadata } from '../types/index';

export const isGitInstalled = () => {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch (e: any) {
    logDebug(e);
    return false;
  }
};

export const isGitRepo = () => {
  try {
    execSync('git status', { stdio: 'ignore' });
    return true;
  } catch (e: any) {
    logDebug(e);
    return false;
  }
};

export const getRepoName = () => {
  if (isGitRepo()) execSync('basename `git rev-parse --show-toplevel`').toString().trim();

  // if not a git repo, return folder name
  const printFolderNameCommand =
    process.platform === 'win32' ? 'for %I in (.) do echo %~nxI' : 'basename `pwd`';

  return execSync(printFolderNameCommand).toString().trim();
};

// @dev gets root of the git repo, regardless of where the command is run (helpful for monorepos)
//   will print something like `/Users/You/your-repo` where `your-repo/.git` exists and you're in any subfolder of `your-repo`
export const getRepositoryRoot = () => {
  const root = execSync('git rev-parse --show-toplevel').toString().trim();

  return root;
};

export const getGitRemote = () => {
  try {
    const remote = execSync('git config --get remote.origin.url')
      .toString()
      .trim()
      .replace('.git', '');

    const isSSH = remote.startsWith('git@');
    if (isSSH) return remote.replace(':', '/').replace('git@', 'https://');

    return remote;
  } catch (e: any) {
    logDebug('could not get git remote url');
    logDebug(e);

    return undefined;
  }
};

// a `contractsPath` is the path to the foundry project _from the repoository root_
//   for example: with a monorepo, your repo root may be `/Users/You/your-repo`
//   and your foundry project may be in `/Users/You/your-repo/packages/your-foundry-project`
export const getContractsPath = (): string | undefined => {
  const repoRoot = getRepositoryRoot();

  // can slice off the non-intersection of the two paths (i.e: packages/your-foundry-project)
  // use + 1 to slice off the leading `/`
  const subtree = cwd().slice(repoRoot.length + 1);

  // if subtree is '' or '/' then we are in the the root of the repo, and can return undefined
  return subtree === '' || subtree === '/' ? undefined : subtree;
};

// @dev returns the changes in the working directory
export const getGitStatus = () => {
  const status = execSync('git status -s').toString().trim();

  return status;
};

// @dev returns true if the working directory is clean
export const isCleanWorkingDir = () => getGitStatus().length === 0;

export const doesFileHaveChanges = (filePath: string) => {
  const status = execSync(`git status -s ${filePath}`).toString().trim();

  return status.length > 0;
};

const latestCommitHashCommand = `git log -n 1 --pretty=format:%H`;

// @dev returns the sha of the repo
export const getLatestCommitSHA_repo = (): string => {
  const sha = execSync(latestCommitHashCommand).toString().trim();

  return sha;
};

// @dev returns the sha of the file or undefined if uncomitted
export const getLatestCommitSHA_file = (path: string): HexString | undefined => {
  const sha = execSync(`${latestCommitHashCommand} -- ${path}`).toString().trim() as HexString;

  return sha.length > 0 ? sha : undefined;
};

export const getGitMetadata = (filePath: string): GitMetadata => {
  const commitSha = getLatestCommitSHA_file(filePath);
  const hasChanges = doesFileHaveChanges(filePath);
  const statusLabel = !commitSha ? 'uncomitted' : `${commitSha}${hasChanges ? '-dirty' : ''}`;

  return {
    filePath,
    hasChanges,
    commitSha,
    statusLabel,
  };
};

// @dev returns a tuple of file path and commit sha
export const getFilesMetadata = (paths: string[]) => paths.map(getGitMetadata);

export const getRepoMetadata = (solidityFiles: string[]): RepoMetadata => {
  const repositoryName = getRepoName();
  if (!isGitInstalled() || !isGitRepo())
    exit('metro commands must be run in a git repo', 'please run `git init` and try again');

  const remoteUrl = getGitRemote();
  const contractsPath = getContractsPath();
  const repoHasChanges = !isCleanWorkingDir();
  const solidityFileStatuses = getFilesMetadata(solidityFiles);
  const repoCommitSHA = getLatestCommitSHA_repo();
  const solidityFilesHaveChanges = solidityFileStatuses.some(
    ({ commitSha, hasChanges }) => commitSha && hasChanges,
  );

  return {
    repositoryName,
    remoteUrl,
    contractsPath,
    repoCommitSHA,
    repoHasChanges,
    solidityFilesHaveChanges,
  };
};

export const checkoutToCommit = (commitSha: string, { silent } = { silent: false }) => {
  try {
    execSync(`git checkout ${commitSha}`, { stdio: silent ? 'ignore' : 'inherit' });
  } catch (e: any) {
    exit(`Unable to checkout to commit ${commitSha}!\n ${e.message}`);
  }
};
