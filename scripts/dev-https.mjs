import { existsSync, mkdirSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const certDir = path.join(projectRoot, "certificates");
const certFile = path.join(certDir, "localhost.pem");
const keyFile = path.join(certDir, "localhost-key.pem");

function ensureCertificate() {
  if (existsSync(certFile) && existsSync(keyFile)) {
    return;
  }

  mkdirSync(certDir, { recursive: true });

  const args = [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-sha256",
    "-days",
    "365",
    "-keyout",
    keyFile,
    "-out",
    certFile,
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1",
  ];

  const result = spawnSync("openssl", args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

ensureCertificate();

const nextBin = path.join(projectRoot, "node_modules", ".bin", "next");
const child = spawn(
  nextBin,
  [
    "dev",
    "--experimental-https",
    "--experimental-https-key",
    keyFile,
    "--experimental-https-cert",
    certFile,
    ...process.argv.slice(2),
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
