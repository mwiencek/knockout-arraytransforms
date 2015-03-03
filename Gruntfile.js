module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    jasmine: {
      "knockout-arraytransforms": {
        src: "knockout-arraytransforms.js",
        options: {
          specs: "specs/specs.js",
          vendor: "specs/lib/knockout-3.1.0.debug.js"
        }
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-jasmine");

  grunt.registerTask("default", ["jasmine"]);
};
