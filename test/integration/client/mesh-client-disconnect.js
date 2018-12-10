describe(
  require("../../__fixtures/utils/test_helper")
    .create()
    .testName(__filename, 3),
  function() {
    var Mesh = require("../../..");
    this.timeout(120000);

    it("can call disconnect() without connecting", function(done) {
      new Mesh.MeshClient({ port: 1 }).disconnect(done);
    });
  }
);
