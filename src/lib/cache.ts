import { CacheClient, Configurations, CredentialProvider, CacheGet, CacheSet } from '@gomomento/sdk';

// TODO: save this to ssm
const apiKey = '';

// Initialize the cache client
const client = new CacheClient({
  configuration: Configurations.Laptop.v1(),
  credentialProvider: CredentialProvider.fromString(apiKey),
  defaultTtlSeconds: 60,
});

const cache = 'fritz-bot-cache';
client.createCache(cache);

export const set = async (key: string, value: string) => {
  const setResponse = await client.set(cache, key, value);
  if (setResponse instanceof CacheSet.Success) {
    console.log('Successfully saved to cache');
  } else {
    console.error('Error saving to cache:', setResponse);
  }
};

export const get = async (key: string) => {
  const getResponse = await client.get(cache, key);
  if (getResponse instanceof CacheGet.Hit) {
    return getResponse.valueString();
  } else if (getResponse instanceof CacheGet.Miss) {
    console.log('Cache miss - key not found');
  } else {
    console.error('Error retrieving from cache:', getResponse);
  }
};
