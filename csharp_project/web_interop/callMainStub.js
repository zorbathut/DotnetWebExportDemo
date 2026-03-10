
// When we are passing "callMain" to <EmccExportedRuntimeMethod /> it tries to read this,
// but it doens't generate "callMain" itself. I guess emscripten hard wired to detect
// main and only define "callMain" if it detects it. Or it is some custom C# customisation.
var callMain = function (_args) { throw new Error('"callMain" is not implemented.'); };