#include <stdbool.h>
typedef void (*em_callback_func)(void);
void emscripten_set_main_loop(em_callback_func func, int fps,
                              bool simulate_infinite_loop);
void emscripten_cancel_main_loop(void);
void emscripten_force_exit(int status) __attribute__((__noreturn__));

char *godot_js_emscripten_get_version();
void godot_js_os_finish_async(void (*p_callback)());
