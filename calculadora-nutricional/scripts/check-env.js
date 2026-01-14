console.log("DEBUG ENV VARS:");
console.log("NEXTAUTH_SECRET exists?", process.env.NEXTAUTH_SECRET ? "YES" : "NO");
console.log("NEXTAUTH_SECRET length:", process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0);
console.log("Current Directory:", process.cwd());
