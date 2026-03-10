// import { dotnet } from "./_framework/dotnet.js";
// const scriptDir = import.meta.url;

// Create custom Godot func. As long as it accepts what original accepted
// and returns emscripten module, it can serve as substitute.
const Godot = async (moduleConfig) => {
    // Needed for working [JSImport]/[JSExport] and multithreading
    // It actually kind of worked with only single thread, but 
    // [JSImport]/[JSExport] still didn't work.
    delete moduleConfig["instantiateWasm"];

    // For now I copy "dotnet.native.wasm" to the place of "godot.wasm".
    const loadPath = moduleConfig["locateFile"]("dotnet.native.wasm");
    // Get preloaded wasm.
    let preloadedWasm = moduleConfig['getPreloadedWasm']();

    // dynamic module import.
    const dotnetjs = await import(`./_framework/dotnet.js`);
    const dotnet = dotnetjs.dotnet;

    dotnet
        // Pass emscripten config.
        .withModuleConfig(moduleConfig)
        // Uncomment to enable diagnostics.
        // .withDiagnosticTracing(true) // enable JavaScript tracing
        // .withConfig({
        // 	environmentVariables: {
        // 		"MONO_LOG_LEVEL": "debug", //enable Mono VM detailed logging by
        // 		"MONO_LOG_MASK": "all", // categories, could be also gc,aot,type,...
        // 	}
        // })

        .withConfig({
            // We passed -sPTHREAD_POOL_SIZE=0 as C# depend on it, but it also provides its
            // own setting to configure the initial thread pool size that we can use.
            pthreadPoolInitialSize: moduleConfig["emscriptenPoolSize"] || 8,
            // Enables sync calls from and to [JSImport]/[JSExport]
            // when multithreading is enabled.
            jsThreadBlockingMode: "ThrowWhenBlockingWait",
        })
        .withResourceLoader((_type, name, _defaultUri, _integrity, _behavior) => {
            if (name === "dotnet.native.wasm") {
                if (preloadedWasm) {
                    // Resource loader allows us to pass promise with a response
                    // so we pass preloaded wasm here as a promise.
                    const promise = Promise.resolve(preloadedWasm);
                    preloadedWasm = null;
                    return promise;
                }
                // Now that we don't have wasm, if it needs it for something
                // pass the path to it.
                return loadPath;
            }
            // Use default path.
            return null;
        });

    await dotnet.download();
    const { setModuleImports, getAssemblyExports, getConfig, runMain, Module } = await dotnet.create();

    console.log('user code after dotnet.create');

    // [JSImport] tests
    setModuleImports("main.js", {
        Sample: {
            Test: {
                add: (a, b) => a + b,
                delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            }
        }
    });

    const dotnetConfig = getConfig();

    const exports = await getAssemblyExports(dotnetConfig.mainAssemblyName);
    console.log(exports);

    // Can't call it with multithreading, as it calls JSImport. Works in single threaded
    // const meaning = exports.Sample.Player.TestMeaning();
    const meaning = 42;

    console.debug(`meaning: ${meaning}`);
    console.log(`IsPrime: ${exports.Sample.Player.IsPrime(meaning)}`);

    const deepMeaning = new Promise(resolve => setTimeout(() => resolve(meaning), 100));
    exports.Sample.Player.SillyLoop();
    exports.Sample.Player.PrintMeaning(deepMeaning);

    // As "callMain" is missing, we can use it ourselves,
    // as this is what Godot calls to start wasm.
    Module.callMain = (args) => {
        // args.push("--verbose");
        return runMain(dotnetConfig.mainAssemblyName, args);
    }
    return Module;
};
