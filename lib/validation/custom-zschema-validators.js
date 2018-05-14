
'use strict';

function enumValidator (report, schema, json) {
  var match = false;
  var idx = schema.enum.length;
  var caseInsensitiveMatch = false;

  while (idx--) {
    if (json === schema.enum[idx]) {
      match = true;
      return;
    } else if (
      typeof json === 'string' &&
      typeof schema.enum[idx] === 'string' &&
      json.toUpperCase() === schema.enum[idx].toUpperCase()
    ) {
      caseInsensitiveMatch = true;
    }
  }

  if (caseInsensitiveMatch === true) {
    report.addCustomError(
      'ENUM_CASE_MISMATCH',
      'Enum doesn not match case for: {0}',
      [json],
      null,
      schema.description
    );
  } else if (match === false) {
    report.addError('ENUM_MISMATCH', [json], null, schema.description);
  }
}

function requiredPropertyValidator (report, schema, json) {
  // http://json-schema.org/latest/json-schema-validation.html#rfc.section.5.4.3.2

  if (
    !(typeof json === 'object' && json === Object(json) && !Array.isArray(json))
  ) {
    return;
  }
  var idx = schema.required.length;
  var requiredPropertyName;
  var xMsMutability;
 
  while (idx--) {
    requiredPropertyName = schema.required[idx];
    xMsMutability = (schema.properties && schema.properties[`${requiredPropertyName}`]) && schema.properties[`${requiredPropertyName}`]['x-ms-mutability'];

	// If a response has x-ms-mutability property and its missing the read we can skip this step
    if (this.validateOptions && this.validateOptions.isResponse && xMsMutability && xMsMutability.indexOf('read') === -1) {
      continue;
    }
    if (json[requiredPropertyName] === undefined) {
      report.addError(
        'OBJECT_MISSING_REQUIRED_PROPERTY',
        [requiredPropertyName],
        null,
        schema.description
      );
    }
  }
}

module.exports.enumValidator = enumValidator;
module.exports.requiredPropertyValidator = requiredPropertyValidator;
