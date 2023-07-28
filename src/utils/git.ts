import { GitMetadata, HexString, RepoMetadata } from 'index';
import { execSync } from 'node:child_process';

export const isGitInstalled = () => {
  try {
    execSync('git -v', { stdio: 'ignore' });
    return true;
  } catch (e: any) {
    return false;
  }
};

export const isGitRepo = () => {
  try {
    execSync('git status', { stdio: 'ignore' });
    return true;
  } catch (e: any) {
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

// @dev gets the url of the repo
export const getGitRemote = () => {
  const remote = execSync('git config --get remote.origin.url').toString().trim();

  return remote;
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
export const getLatestCommitSHA_repo = (): HexString => {
  const sha = execSync(latestCommitHashCommand).toString().trim();

  return sha as HexString;
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
    return {
      __type: 'simple',
      repositoryName,
    };

  const remoteUrl = getGitRemote();
  const repoHasChanges = !isCleanWorkingDir();
  const solidityFileStatuses = getFilesMetadata(solidityFiles);
  const repoCommitSHA = getLatestCommitSHA_repo();
  const solidityFilesHaveChanges = solidityFileStatuses.some(
    ({ commitSha, hasChanges }) => commitSha && hasChanges,
  );

  return {
    __type: 'detailed',
    repositoryName,
    remoteUrl,
    repoCommitSHA,
    repoHasChanges,
    solidityFileStatuses,
    solidityFilesHaveChanges,
  };
};
