const metadata = new WeakMap();

function addRule(target, propertyKey, rule) {
  const ctor = target.constructor;
  const existing = metadata.get(ctor) || {};
  const propertyRules = existing[propertyKey] || [];
  propertyRules.push(rule);
  existing[propertyKey] = propertyRules;
  metadata.set(ctor, existing);
}

function IsString() {
  return (target, propertyKey) => addRule(target, propertyKey, { type: 'string' });
}

function IsOptional() {
  return (target, propertyKey) => addRule(target, propertyKey, { type: 'optional' });
}

function IsDateString() {
  return (target, propertyKey) => addRule(target, propertyKey, { type: 'date' });
}

function MinLength(length) {
  return (target, propertyKey) => addRule(target, propertyKey, { type: 'minLength', length });
}

function shouldSkip(rules, value) {
  const hasOptional = rules.some((rule) => rule.type === 'optional');
  return hasOptional && (value === undefined || value === null || value === '');
}

function validateValue(rule, value) {
  switch (rule.type) {
    case 'string':
      return typeof value === 'string'
        ? null
        : 'значение должно быть строкой';
    case 'date': {
      return typeof value === 'string' && !Number.isNaN(Date.parse(value))
        ? null
        : 'должно быть валидной датой';
    }
    case 'minLength':
      return typeof value === 'string' && value.length >= rule.length
        ? null
        : `длина должна быть не меньше ${rule.length}`;
    default:
      return null;
  }
}

function validateSync(object) {
  const ctor = object.constructor;
  const rules = metadata.get(ctor) || {};
  const errors = [];

  Object.entries(rules).forEach(([propertyKey, propertyRules]) => {
    const value = object[propertyKey];
    if (shouldSkip(propertyRules, value)) {
      return;
    }

    const constraints = {};
    propertyRules
      .filter((rule) => rule.type !== 'optional')
      .forEach((rule) => {
        const validationError = validateValue(rule, value);
        if (validationError) {
          constraints[rule.type] = validationError;
        }
      });

    if (Object.keys(constraints).length > 0) {
      errors.push({ property: propertyKey, constraints });
    }
  });

  return errors;
}

function validate(object) {
  return Promise.resolve(validateSync(object));
}

module.exports = {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  validate,
  validateSync,
};
