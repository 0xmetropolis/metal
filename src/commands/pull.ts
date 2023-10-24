import AdmZip from 'adm-zip';
import { type Arguments, type Options } from 'yargs';
import { exit, logInfo } from '../utils';
import { getMetalCodegenFromArtifactBundle, logMetalDirStructure } from '../utils/codegen';
import { getDeploymentArtifacts } from '../utils/preview-service';
import { decompressArtifactZip, tryLoadPreviousAddresses } from '../utils/pull';
import { writeCodegenToDisk } from '../utils/pull';

export const command = 'pull';
export const description = `Pull artifacts from `;

export type Params = {};
export type HandlerInput = Arguments & Params;

export const builder: { [key: string]: Options } = {};

const extractArguments = (yargs: Arguments) => {
  const {
    _: [, deploymentId],
  } = yargs;

  return { deploymentId };
};

const validateInputs = (yargs: Arguments) => {
  const { deploymentId } = extractArguments(yargs);
  if (!deploymentId) throw exit('You must specify a deployment id to pull!');

  return { deploymentId };
};

/**
 * @dev entry point for the pull command
 */
export const handler = async (yargs: HandlerInput) => {
  // validate there is an id
  validateInputs(yargs);

  const { deploymentId } = extractArguments(yargs);

  // try and load any previous addresses from a previous config file
  const previouslyDeployedAddresses = await tryLoadPreviousAddresses();

  // fetch the artifacts zip as a buffer from the backend
  const rawZip = await getDeploymentArtifacts(deploymentId, previouslyDeployedAddresses);

  // unzip the file in memory
  const zipInstance = new AdmZip(rawZip);

  // decompress to an in-memory object
  const artifactBundle = decompressArtifactZip(zipInstance);

  // generate some nice type-safe codegen
  const metalCodegen = getMetalCodegenFromArtifactBundle(artifactBundle);

  // save the codegen as .ts files
  writeCodegenToDisk(metalCodegen);

  logInfo('Wrote deployment artifacts to the `metal/` directory 🎉\n');
  logMetalDirStructure();
};
