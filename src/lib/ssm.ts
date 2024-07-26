import { SSMClient, GetParameterCommand, GetParameterCommandInput } from '@aws-sdk/client-ssm';

export const enum SSMParameter {
  FritzBotToken = 'telegram-fritz-bot-token',
  SpreadsheetId = 'telegram-fritz-bot-spreadsheet-id'
}

// initialize SSM client
const ssmClient = new SSMClient({ region: 'eu-central-1' });

// cache SSM parameters to avoid unnecessary calls to SSM
const ssmCache = new Map<string, string>();

export const getSecret = async (parameter: SSMParameter): Promise<string> => {

  console.log(`Getting parameter ${parameter}`);

  // check if parameter is cached
  if (ssmCache.has(parameter)) {
    console.log(`Parameter ${parameter} found in cache`);
    return ssmCache.get(parameter) as string;
  }

  console.log('Parameter not found in cache');

  // get parameter from SSM
  console.log(`Getting parameter ${parameter} from SSM`);
  const input: GetParameterCommandInput = {
    Name: parameter,
    WithDecryption: true, // Set to true if the parameter value is stored encrypted
  };

  const command = new GetParameterCommand(input);
  const response = await ssmClient.send(command);
  const secret = response.Parameter?.Value as string;

  if (!secret) {
    console.error(`Parameter ${parameter} not found`);
    throw new Error(`Parameter ${parameter} not found`);
  }

  console.log(`Parameter ${parameter} found`, secret);

  // cache parameter
  ssmCache.set(parameter, secret as string);

  return secret;
};