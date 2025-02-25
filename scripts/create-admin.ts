import { PrismaClient } from "@prisma/client";
import { stdin, stdout } from "process";

const prisma = new PrismaClient();

async function prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
        stdout.write(question + " ");
        stdin.once("data", (data) => resolve(data.toString().trim()));
    });
}

async function main() {
    const email1 = await prompt("Enter email: ");
    const email2 = await prompt("Confirm email: ");

    if (email1 !== email2) {
        console.error("Emails do not match. Exiting...");
        process.exit(1);
    }

    const confirmation = await prompt(
        `Are you sure you want to make '${email1}' an admin? (yes/no)[y/n]: `
    );
    if (
        confirmation.toLowerCase() !== "yes" ||
        confirmation.toLowerCase() !== "y"
    ) {
        console.log("Operation cancelled.");
        process.exit(0);
    }

    const account = await prisma.account.findUnique({
        where: { email: email1 },
    });
    if (!account) {
        console.error("Account not found. Exiting...");
        process.exit(1);
    }

    await prisma.account.update({
        where: { email: email1 },
        data: { role: "ADMIN" },
    });

    console.log(`Successfully updated '${email1}' to an ADMIN.`);
    process.exit(0);
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
