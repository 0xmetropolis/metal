"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoMetadata = exports.getFilesMetadata = exports.getGitMetadata = exports.getLatestCommitSHA_file = exports.getLatestCommitSHA_repo = exports.doesFileHaveChanges = exports.isCleanWorkingDir = exports.getGitStatus = exports.getGitRemote = exports.getRepoName = exports.isGitRepo = exports.isGitInstalled = void 0;
const node_child_process_1 = require("node:child_process");
const isGitInstalled = () => {
    try {
        (0, node_child_process_1.execSync)('git --version', { stdio: 'ignore' });
        return true;
    }
    catch (e) {
        return false;
    }
};
exports.isGitInstalled = isGitInstalled;
const isGitRepo = () => {
    try {
        (0, node_child_process_1.execSync)('git status', { stdio: 'ignore' });
        return true;
    }
    catch (e) {
        return false;
    }
};
exports.isGitRepo = isGitRepo;
const getRepoName = () => {
    if ((0, exports.isGitRepo)())
        (0, node_child_process_1.execSync)('basename `git rev-parse --show-toplevel`').toString().trim();
    // if not a git repo, return folder name
    const printFolderNameCommand = process.platform === 'win32' ? 'for %I in (.) do echo %~nxI' : 'basename `pwd`';
    return (0, node_child_process_1.execSync)(printFolderNameCommand).toString().trim();
};
exports.getRepoName = getRepoName;
// @dev gets the url of the repo
const getGitRemote = () => {
    const remote = (0, node_child_process_1.execSync)('git config --get remote.origin.url').toString().trim();
    return remote;
};
exports.getGitRemote = getGitRemote;
// @dev returns the changes in the working directory
const getGitStatus = () => {
    const status = (0, node_child_process_1.execSync)('git status -s').toString().trim();
    return status;
};
exports.getGitStatus = getGitStatus;
// @dev returns true if the working directory is clean
const isCleanWorkingDir = () => (0, exports.getGitStatus)().length === 0;
exports.isCleanWorkingDir = isCleanWorkingDir;
const doesFileHaveChanges = (filePath) => {
    const status = (0, node_child_process_1.execSync)(`git status -s ${filePath}`).toString().trim();
    return status.length > 0;
};
exports.doesFileHaveChanges = doesFileHaveChanges;
const latestCommitHashCommand = `git log -n 1 --pretty=format:%H`;
// @dev returns the sha of the repo
const getLatestCommitSHA_repo = () => {
    const sha = (0, node_child_process_1.execSync)(latestCommitHashCommand).toString().trim();
    return sha;
};
exports.getLatestCommitSHA_repo = getLatestCommitSHA_repo;
// @dev returns the sha of the file or undefined if uncomitted
const getLatestCommitSHA_file = (path) => {
    const sha = (0, node_child_process_1.execSync)(`${latestCommitHashCommand} -- ${path}`).toString().trim();
    return sha.length > 0 ? sha : undefined;
};
exports.getLatestCommitSHA_file = getLatestCommitSHA_file;
const getGitMetadata = (filePath) => {
    const commitSha = (0, exports.getLatestCommitSHA_file)(filePath);
    const hasChanges = (0, exports.doesFileHaveChanges)(filePath);
    const statusLabel = !commitSha ? 'uncomitted' : `${commitSha}${hasChanges ? '-dirty' : ''}`;
    return {
        filePath,
        hasChanges,
        commitSha,
        statusLabel,
    };
};
exports.getGitMetadata = getGitMetadata;
// @dev returns a tuple of file path and commit sha
const getFilesMetadata = (paths) => paths.map(exports.getGitMetadata);
exports.getFilesMetadata = getFilesMetadata;
const getRepoMetadata = (solidityFiles) => {
    const repositoryName = (0, exports.getRepoName)();
    if (!(0, exports.isGitInstalled)() || !(0, exports.isGitRepo)())
        return {
            __type: 'simple',
            repositoryName,
        };
    const remoteUrl = (0, exports.getGitRemote)();
    const repoHasChanges = !(0, exports.isCleanWorkingDir)();
    const solidityFileStatuses = (0, exports.getFilesMetadata)(solidityFiles);
    const repoCommitSHA = (0, exports.getLatestCommitSHA_repo)();
    const solidityFilesHaveChanges = solidityFileStatuses.some(({ commitSha, hasChanges }) => commitSha && hasChanges);
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
exports.getRepoMetadata = getRepoMetadata;
//# sourceMappingURL=git.js.map