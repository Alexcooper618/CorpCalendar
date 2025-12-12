function plainToInstance(cls, plain) {
  if (plain == null) return plain;
  if (Array.isArray(plain)) {
    return plain.map((item) => plainToInstance(cls, item));
  }
  const instance = new cls();
  Object.assign(instance, plain);
  return instance;
}

module.exports = { plainToInstance };
