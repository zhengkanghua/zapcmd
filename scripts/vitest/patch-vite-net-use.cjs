const childProcess = require("node:child_process");
const events = require("node:events");

const originalExec = childProcess.exec;

function createNoopChildProcess() {
  const emitter = new events.EventEmitter();
  emitter.stdin = null;
  emitter.stdout = null;
  emitter.stderr = null;
  emitter.kill = () => false;
  return emitter;
}

function normalizeCommand(command) {
  return typeof command === "string" ? command.trim().toLowerCase() : "";
}

childProcess.exec = function patchedExec(command, options, callback) {
  const normalized = normalizeCommand(command);
  if (normalized !== "net use") {
    return originalExec.call(childProcess, command, options, callback);
  }

  const actualOptions = typeof options === "function" ? undefined : options;
  const actualCallback = typeof options === "function" ? options : callback;

  try {
    const child = originalExec.call(childProcess, command, actualOptions, actualCallback);
    child.on("error", () => {});
    return child;
  } catch (error) {
    if (typeof actualCallback === "function") {
      actualCallback(error, "", "");
    }
    return createNoopChildProcess();
  }
};

