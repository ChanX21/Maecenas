import { spawn } from "node:child_process";

const commands = [
  ["backend", "npm", ["run", "dev:backend"]],
  ["frontend", "npm", ["run", "dev:frontend"]]
];

const children = commands.map(([label, command, args]) => {
  const child = spawn(command, args, {
    stdio: "pipe",
    shell: false
  });

  child.stdout.on("data", (data) => process.stdout.write(`[${label}] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[${label}] ${data}`));
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      shutdown();
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGINT");
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
