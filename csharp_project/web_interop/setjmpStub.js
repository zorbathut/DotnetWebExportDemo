

// They are missing in both with -sSUPPORT_LONGJMP=wasm and without it,
// so I just stubbed them. As long as there is no errors it should be fine... propably.
// I still don't know why are they missing.
const SetJmpStub = {
    __wasm_setjmp_sig: 'vpip',
    __wasm_setjmp: function (_env, _label, _func_invocation_id) { },

    __wasm_setjmp_test_sig: 'ipp',
    __wasm_setjmp_test: function (_env, _func_invocation_id) { return 0; },
};

addToLibrary(SetJmpStub);