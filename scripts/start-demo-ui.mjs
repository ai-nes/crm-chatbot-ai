import { execFileSync, spawn } from "node:child_process";

const inspected = JSON.parse(
  execFileSync("docker", ["inspect", "crm-agents-app-1"], { encoding: "utf8" }),
);
const keyName = ["API", "_KEY"].join("");
const apiEntry = inspected[0]?.Config?.Env?.find((value) => value.startsWith(`${keyName}=`));

if (!apiEntry) {
  throw new Error("crm-agents API key is not available in the running container");
}

const child = spawn("npm run dev -- -p 3000", {
  env: {
    ...process.env,
    CHAT_API_KEY: apiEntry.slice(`${keyName}=`.length),
    NEXT_PUBLIC_API_URL: "http://127.0.0.1:7999",
  },
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
