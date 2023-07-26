import { execSync } from 'node:child_process';

// @dev returns the .git repo name or the folder name if not a git repo
export const getRepoName = () => {
  let name: string;
  try {
    name = execSync('basename `git rev-parse --show-toplevel`').toString().trim();
  } catch (e: any) {
    // is not a git repo, instead return repo name
    name = execSync('basename `pwd`').toString().trim();
  }

  return name;
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

// @dev returns a 'dirty or 'clean' status for the branch
export const getFileStatus = (filePath: string): 'clean' | 'dirty' => {
  const status = execSync(`git status -s ${filePath}`).toString().trim();

  return status.length === 0 ? 'clean' : 'dirty';
};

// @dev returns the sha of the file
export const getMostRecentCommitSHA = (path: string) => {
  const sha = execSync(`git log -n 1 --pretty=format:%H -- ${path}`).toString().trim();

  return sha;
};

// @dev returns the full commit sha and post-fixed with the  '-dirty' label if dirty
export const getGitMetadata = (filePath: string) => {
  const sha = getMostRecentCommitSHA(filePath);
  const status = getFileStatus(filePath);
  const postfix = status === 'clean' ? '' : `-${status}`;

  if (!sha) return 'uncomitted';
  return `${sha}${postfix}`;
};

// @dev returns a tuple of file path and commit sha
export const getFilesGitStatus = (paths: string[]) => {
  const statuses = paths.map(path => [path, getGitMetadata(path)]);

  return statuses;
};

// console.log(getFilesGitStatus(process.argv.slice(2)));
