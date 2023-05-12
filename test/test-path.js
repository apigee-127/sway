/* eslint-env browser, mocha */

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Apigee Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const _ = require('lodash');
const assert = require('assert');
const JsonRefs = require('json-refs');
const tHelpers = require('./helpers');

const Sway = tHelpers.getSway();

function runTests(mode) {
  const label = mode === 'with-refs' ? 'with' : 'without';
  let apiDefinition;

  before((done) => {
    function callback(apiDef) {
      apiDefinition = apiDef;

      done();
    }

    if (mode === 'with-refs') {
      tHelpers.getApiDefinitionRelativeRefs(callback);
    } else {
      tHelpers.getApiDefinition(callback);
    }
  });

  describe(`should handle OpenAPI document ${label} relative references`, () => {
    it('should have proper structure', () => {
      const path = '/pet/{petId}';
      const { pathObject } = apiDefinition.getOperation(path, 'get');

      assert.deepEqual(pathObject.apiDefinition, apiDefinition);
      assert.equal(pathObject.path, path);
      assert.equal(pathObject.ptr, JsonRefs.pathToPtr(['paths', path]));
      assert.deepEqual(pathObject.definition, apiDefinition.definitionRemotesResolved.paths[path]);
      assert.deepEqual(pathObject.definitionFullyResolved, apiDefinition.definitionFullyResolved.paths[path]);

      // Make sure they are of the proper type
      assert.ok(pathObject.regexp instanceof RegExp);

      // Make sure they have the proper keys
      assert.equal(1, pathObject.regexp.keys.length);
      assert.equal('petId', pathObject.regexp.keys[0].name);

      // Make sure they match the expected URLs
      assert.ok(_.isArray(pathObject.regexp.exec(`${apiDefinition.definitionFullyResolved.basePath}/pet/1`)));
      assert.ok(!_.isArray(pathObject.regexp.exec(`${apiDefinition.definitionFullyResolved.basePath}/pets/1`)));
      assert.ok(!_.isArray(pathObject.regexp.exec(`${apiDefinition.definitionFullyResolved.basePath}/Pet/1`)));
    });

    describe('#getOperation', () => {
      it('should return the expected operation', () => {
        // By method
        tHelpers.checkType(apiDefinition.getPath('/pet/{petId}').getOperation('get'), 'Operation');
        // By operationId
        tHelpers.checkType(apiDefinition.getPath('/pet').getOperation('addPet'), 'Operation');
      });

      it('should return no operation for the missing method', () => {
        assert.ok(_.isUndefined(apiDefinition.getPath('/pet/{petId}').getOperation('head')));
      });
    });

    describe('#getOperations', () => {
      it('should return the expected operations', () => {
        assert.equal(apiDefinition.getPath('/pet/{petId}').getOperations().length, 3);
      });

      it('should return no operations', (done) => {
        const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
        const path = '/petz';

        cOAIDoc.paths[path] = {};

        Sway.create({
          definition: cOAIDoc,
        }).then((apiDef) => {
          assert.equal(apiDef.getPath(path).getOperations().length, 0);
        }).then(done, done);
      });
    });

    describe('#getOperationsByTag', () => {
      it('should return the expected operations', () => {
        assert.equal(apiDefinition.getPath('/pet/{petId}').getOperationsByTag('pet').length, 3);
      });

      it('should return no operations', () => {
        assert.equal(apiDefinition.getPath('/pet/{petId}').getOperationsByTag('petz').length, 0);
      });
    });

    describe('#getParameters', () => {
      it('should return the expected parameters', () => {
        const parameters = apiDefinition.getPath('/pet/{petId}').getParameters();

        assert.equal(parameters.length, 1);
      });

      it('should return no parameters', () => {
        assert.equal(apiDefinition.getPath('/pet').getParameters().length, 0);
      });
    });
  });
}

describe('Path', () => {
  // OpenAPI document without references
  runTests('no-refs');
  // OpenAPI document with references
  runTests('with-refs');
});
