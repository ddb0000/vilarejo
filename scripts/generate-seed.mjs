import crypto from "node:crypto";

const seed = crypto.randomBytes(8).toString("hex");
console.log(seed);
