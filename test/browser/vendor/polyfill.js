/* Various polyfills required by PhantomJS */

// PhantomJS requires "ArrayBuffer.isView" polyfil for Standalone Sway tests
//
//  @see: https://github.com/ariya/phantomjs/issues/15342
if (!ArrayBuffer['isView']) {
  ArrayBuffer.isView = function(a) {
    return a !== null && typeof(a) === "object" && a['buffer'] instanceof ArrayBuffer;
  };
}
