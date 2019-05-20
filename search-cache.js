const defaults = {
  expiryTime: 24,
  maxSize: 50
};

let cache;
let created;
let expiry;
let max;

const create = ({ expiryTime = defaults.expiryTime, maxSize = defaults.maxSize } = {}) => {
  expiry = expiryTime;
  max = maxSize;
  cache = new Map();
  created = Date.now();
};

const checkExpiry = () => {
  if(Date.now() - created >= (expiry * 3600000) || (cache.size > max)) {
    cache.clear();
    created = Date.now();
  }
};
  
const has = key => cache.has(key);

const get = key => {
  const value = cache.get(key);
  checkExpiry();
  return value;
};

const set = (key, value) => {
  checkExpiry();
  cache.set(key, value);
};

module.exports = { defaults, create, has, get, set };