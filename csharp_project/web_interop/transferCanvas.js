
const PThreadInterceptor = {
    $setupPThreadInterceptor__postset: 'setupPThreadInterceptor();',
    $setupPThreadInterceptor: function () {
        // Return if offscreen canvas is not supported, or we are in a thread.
        if (typeof OffscreenCanvas === 'undefined' || ENVIRONMENT_IS_PTHREAD) {
            return;
        }
        let is_first = true;
        // Store original function.
        const original___pthread_create_js = ___pthread_create_js;
        // Intercept calls to "___pthread_create_js" for the first created thread, 
        // mimicking how -sPROXY_TO_PTHREAD=1 work.
        ___pthread_create_js = (pthread_ptr, attr, startRoutine, arg) => {
            if (is_first && attr && Module['canvas'] !== 'undefined') {
                // Only intercept the first call.
                is_first = false;
                // Set _a_transferredcanvases to a special value -1.
                {{{ makeSetValue('attr', C_STRUCTS.pthread_attr_t._a_transferredcanvases, MAX_PTR, '*') }}};
                // Assign original function back. We still need "is_first" check as this
                // function will already be registered in the wasm imports.
                ___pthread_create_js = original___pthread_create_js;
            }
            return original___pthread_create_js(pthread_ptr, attr, startRoutine, arg);
        };
    },
};

addToLibrary(PThreadInterceptor);
